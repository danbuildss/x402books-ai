import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";
import { verifyMessage } from "viem";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// POST /api/registry/claim
// Agent teams submit a wallet address to claim their profile.
// Supports two modes:
//   - Signed: wallet_address + signature + message (cryptographically verified, auto-approves if matched)
//   - Unsigned: wallet_address only (queues for admin review, lower trust)
//
// Body: { agent_slug, wallet_address, signature?, message? }
export async function POST(req: NextRequest) {
  let body: { agent_slug?: string; wallet_address?: string; signature?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_slug, wallet_address, signature, message } = body;

  if (!agent_slug || typeof agent_slug !== "string") {
    return NextResponse.json({ ok: false, error: "agent_slug is required" }, { status: 400 });
  }
  if (!wallet_address || typeof wallet_address !== "string") {
    return NextResponse.json({ ok: false, error: "wallet_address is required" }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet_address.trim())) {
    return NextResponse.json({ ok: false, error: "Invalid wallet address format" }, { status: 400 });
  }

  const slug = agent_slug.trim().toLowerCase();
  const addr = wallet_address.trim().toLowerCase();

  // Verify signature if provided
  let signatureVerified = false;
  if (signature && message) {
    try {
      // Validate message freshness — reject messages older than 10 minutes
      const tsMatch = message.match(/Timestamp:\s*(.+)$/m);
      if (tsMatch) {
        const ts = new Date(tsMatch[1].trim()).getTime();
        if (Date.now() - ts > 10 * 60 * 1000) {
          return NextResponse.json({ ok: false, error: "Signature expired. Please sign again." }, { status: 400 });
        }
      }

      const recovered = await verifyMessage({
        address: addr as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      signatureVerified = recovered === true;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
    }
  }

  // Find agent in registry
  let agentName: string | null = null;
  let walletMatched = false;

  try {
    const { agents } = await getRegistryAgents();
    const agent = agents.find((a) => toSlug(a.name) === slug);
    if (!agent) {
      return NextResponse.json({ ok: false, error: `Agent "${slug}" not found in registry` }, { status: 404 });
    }
    agentName = agent.name;
    walletMatched = (agent.wallets ?? []).some((w) => w.address.toLowerCase() === addr) ||
      (agent.tokenAddress?.toLowerCase() === addr);
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load registry" }, { status: 500 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      ok: true,
      matched: walletMatched,
      signature_verified: signatureVerified,
      message: walletMatched
        ? "Wallet matched. Registry unavailable — contact the team to finalize your claim."
        : "Wallet not found in declared wallets. Ensure your manifest is submitted first.",
    });
  }

  const sb = getSupabaseAdminClient();

  // Prevent duplicate pending claims for the same agent + wallet
  const { data: existing } = await sb
    .from("registry_claims")
    .select("id, status")
    .eq("agent_name", agentName)
    .eq("wallet_address", addr)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      matched: walletMatched,
      signature_verified: signatureVerified,
      message: "Claim already submitted — pending admin review.",
    });
  }

  // Signed + matched claims: insert with higher trust level for faster admin approval
  const claimStatus = (signatureVerified && walletMatched) ? "pending_signed" : "pending";

  const { error } = await sb.from("registry_claims").insert({
    agent_name:          agentName,
    wallet_address:      addr,
    wallet_matched:      walletMatched,
    signature_verified:  signatureVerified,
    status:              claimStatus,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const isSigned = signatureVerified && walletMatched;
  return NextResponse.json({
    ok: true,
    matched: walletMatched,
    signature_verified: signatureVerified,
    message: isSigned
      ? "Wallet ownership verified — claim submitted for final review."
      : walletMatched
        ? "Wallet matched — claim submitted for admin review. You'll be notified when approved."
        : "Claim submitted. Wallet not found in current manifest — add it to your .agent/wallets.json to strengthen your claim.",
  });
}
