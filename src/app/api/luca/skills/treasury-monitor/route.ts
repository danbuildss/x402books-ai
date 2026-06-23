import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getAgentBySlug } from "@/lib/agent-books";
import { classifyAddressBatch } from "@/lib/address-classifier";
import { getWalletStableBalance } from "@/lib/treasury-balance";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function healthSignal(balance: number): "healthy" | "low" | "critical" {
  if (balance >= 10_000) return "healthy";
  if (balance >= 1_000) return "low";
  return "critical";
}

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca/skills/treasury-monitor";

  let body: { slug?: string; address?: string };
  try {
    body = await req.json() as { slug?: string; address?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, address } = body;
  if (!slug && !address) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "slug or address is required" }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    auth.finish(500, Date.now() - start, endpoint);
    return NextResponse.json({ error: "ALCHEMY_API_KEY not configured" }, { status: 500 });
  }

  try {
    if (address && !slug) {
      const addr = address.trim().toLowerCase();
      if (!ADDRESS_RE.test(addr)) {
        auth.finish(400, Date.now() - start, endpoint);
        return NextResponse.json({ error: "address must be a valid 0x Ethereum address" }, { status: 400 });
      }
      const [classified] = await classifyAddressBatch([addr], apiKey);
      const balance = await getWalletStableBalance(addr);
      auth.finish(200, Date.now() - start, endpoint);
      return NextResponse.json({
        skill: "treasury-monitor",
        source: "address",
        agent: null,
        wallets: [{
          address: addr,
          address_type: classified.address_type,
          stable_balance_usd: balance,
          health: healthSignal(balance),
          chain: "base",
        }],
        total_stable_balance_usd: balance,
        health: healthSignal(balance),
        generated_at: new Date().toISOString(),
      });
    }

    const agent = await getAgentBySlug((slug ?? "").trim().toLowerCase());
    if (!agent) {
      auth.finish(404, Date.now() - start, endpoint);
      return NextResponse.json({ error: `Agent '${slug}' not found` }, { status: 404 });
    }

    const allWallets = agent.wallets ?? [];
    const eligibleWallets = allWallets.filter((w) => isBooksEligibleWallet(w, agent.tokenAddress).eligible);
    const targetWallets = eligibleWallets.length > 0 ? eligibleWallets : allWallets;

    if (targetWallets.length === 0) {
      auth.finish(200, Date.now() - start, endpoint);
      return NextResponse.json({
        skill: "treasury-monitor",
        source: "slug",
        agent: { name: agent.name, slug: (slug ?? "").trim().toLowerCase(), ecosystem: agent.ecosystem },
        wallets: [],
        total_stable_balance_usd: 0,
        health: "unknown",
        note: "No wallets found for this agent. Submit a wallet manifest to enable treasury monitoring.",
        generated_at: new Date().toISOString(),
      });
    }

    const balances = await Promise.allSettled(
      targetWallets.map((w) => getWalletStableBalance(w.address)),
    );

    let total = 0;
    const walletRows = targetWallets.map((w, i) => {
      const balance = balances[i].status === "fulfilled" ? balances[i].value : 0;
      total += balance;
      const elig = isBooksEligibleWallet(w, agent.tokenAddress);
      return {
        address: w.address.toLowerCase(),
        label: w.label,
        role: w.role ?? null,
        address_type: w.address_type ?? "unknown",
        evidence_source: w.evidenceSource ?? null,
        books_eligible: elig.eligible,
        books_ineligibility_reason: elig.eligible ? null : elig.reason,
        stable_balance_usd: balance,
        health: healthSignal(balance),
        chain: w.chain ?? "base",
      };
    });

    const totalRounded = Math.round(total * 100) / 100;

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      skill: "treasury-monitor",
      source: "slug",
      agent: {
        name: agent.name,
        slug: (slug ?? "").trim().toLowerCase(),
        ecosystem: agent.ecosystem,
      },
      wallets: walletRows,
      total_stable_balance_usd: totalRounded,
      health: total === 0 ? "critical" : healthSignal(total),
      note: eligibleWallets.length === 0
        ? "No books-eligible wallets found — showing all wallets. Declare manifest wallets to enable financial attribution."
        : null,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    auth.finish(502, Date.now() - start, endpoint);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Treasury monitor failed" },
      { status: 502 },
    );
  }
}
