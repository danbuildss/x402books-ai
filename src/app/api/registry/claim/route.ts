import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// POST /api/registry/claim
// Public endpoint — agent teams submit a wallet address to claim their profile.
// Checks if the wallet matches any declared wallet for that agent.
// Queues to registry_claims for admin review.
//
// Body: { agent_slug: string, wallet_address: string }
export async function POST(req: NextRequest) {
  let body: { agent_slug?: string; wallet_address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_slug, wallet_address } = body;

  if (!agent_slug || typeof agent_slug !== "string") {
    return NextResponse.json({ ok: false, error: "agent_slug is required" }, { status: 400 });
  }
  if (!wallet_address || typeof wallet_address !== "string") {
    return NextResponse.json({ ok: false, error: "wallet_address is required" }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet_address.trim())) {
    return NextResponse.json({ ok: false, error: "Invalid wallet address format" }, { status: 400 });
  }

  const slug  = agent_slug.trim().toLowerCase();
  const addr  = wallet_address.trim().toLowerCase();

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

    // Check if submitted wallet matches any declared wallet
    walletMatched = (agent.wallets ?? []).some((w) => w.address.toLowerCase() === addr) ||
      (agent.tokenAddress?.toLowerCase() === addr);
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load registry" }, { status: 500 });
  }

  if (!hasSupabaseAdminEnv()) {
    // Graceful degradation — still useful to tell them if wallet matched
    return NextResponse.json({
      ok: true,
      matched: walletMatched,
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
    .eq("wallet_address", addr.toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      matched: walletMatched,
      message: "Claim already submitted — pending admin review.",
    });
  }

  const { error } = await sb.from("registry_claims").insert({
    agent_name:     agentName,
    wallet_address: addr,
    wallet_matched: walletMatched,
    status:         "pending",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    matched: walletMatched,
    message: walletMatched
      ? "Wallet matched — claim submitted for admin review. You'll be notified when approved."
      : "Claim submitted. Wallet not found in current manifest — add it to your .agent/wallets.json to strengthen your claim.",
  });
}
