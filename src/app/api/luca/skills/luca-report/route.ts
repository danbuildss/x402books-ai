import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { buildAgentBooks, getAgentBySlug } from "@/lib/agent-books";
import { getWalletStableBalance } from "@/lib/treasury-balance";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import { toSlug } from "@/app/registry/[slug]/slug";
import { ledgerErrorResponse } from "@/lib/api-utils";
import type { TimeRange } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set<string>(["7d", "14d", "30d", "90d"]);

function treasuryHealth(balance: number, hasWallets: boolean): string {
  if (!hasWallets) return "unknown";
  if (balance >= 10_000) return "healthy";
  if (balance >= 1_000) return "low";
  return "critical";
}

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca/skills/luca-report";

  let body: { slug?: string; period?: string };
  try {
    body = await req.json() as { slug?: string; period?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase();
  if (!slug) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const period = (body.period ?? "30d") as TimeRange;
  if (!VALID_PERIODS.has(period)) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "period must be 7d, 14d, 30d, or 90d" }, { status: 400 });
  }

  try {
    const agent = await getAgentBySlug(slug);
    if (!agent) {
      auth.finish(404, Date.now() - start, endpoint);
      return NextResponse.json({ error: `Agent '${slug}' not found` }, { status: 404 });
    }

    const allWallets = agent.wallets ?? [];
    const eligibleWallets = allWallets.filter((w) => isBooksEligibleWallet(w, agent.tokenAddress).eligible);
    const attributionTier =
      eligibleWallets.length > 0 ? "manifest_attributed" :
      allWallets.length > 0 ? "discovered" :
      "unattributed";

    // Books and treasury balances run in parallel
    const [booksResult, ...balanceResults] = await Promise.allSettled([
      buildAgentBooks(agent, period),
      ...eligibleWallets.map((w) => getWalletStableBalance(w.address)),
    ]);

    const books = booksResult.status === "fulfilled" ? booksResult.value : null;

    const treasuryWallets = eligibleWallets.map((w, i) => {
      const balance = balanceResults[i]?.status === "fulfilled" ? (balanceResults[i] as PromiseFulfilledResult<number>).value : 0;
      return {
        address: w.address.toLowerCase(),
        label: w.label,
        role: w.role ?? null,
        address_type: w.address_type ?? "unknown",
        stable_balance_usd: balance,
        chain: w.chain ?? "base",
      };
    });

    const totalBalance = Math.round(
      treasuryWallets.reduce((s, w) => s + w.stable_balance_usd, 0) * 100,
    ) / 100;

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      skill: "luca-report",
      agent: {
        name: agent.name,
        slug: toSlug(agent.name),
        ecosystem: agent.ecosystem,
        verification_status: agent.verificationStatus,
        evidence_sources: agent.evidenceSources ?? [],
        erc8004_agent_id: agent.erc8004AgentId ?? null,
        erc8004_did: agent.erc8004Did ?? null,
        website: agent.website ?? null,
        x_handle: agent.xHandle ?? null,
      },
      attribution: {
        tier: attributionTier,
        books_eligible_wallets: eligibleWallets.length,
        total_wallets: allWallets.length,
        source: eligibleWallets.length > 0 ? "manifest" : null,
      },
      books,
      treasury: {
        wallets: treasuryWallets,
        total_stable_balance_usd: totalBalance,
        health: treasuryHealth(totalBalance, eligibleWallets.length > 0),
      },
      summary: books?.attributed ? books.luca_summary : null,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    auth.finish(500, Date.now() - start, endpoint);
    return ledgerErrorResponse(error);
  }
}
