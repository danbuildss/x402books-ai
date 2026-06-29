// POST /api/v1/luca/agent-read
//
// Single-call agent truth resolver for Luca on Hermes.
//
// Takes any agent identifier (name, slug, or 0x wallet address) and returns:
//   - indexed: whether the agent exists in the Zetta registry
//   - read_source: "registry" | "not_indexed"
//   - data_quality: human-readable label for Luca to surface in responses
//   - Full luca-report data if indexed (books + treasury + attribution)
//
// Read-order contract:
//   1. Resolve identifier → registry match (by slug, name fragment, or wallet)
//   2. If not indexed → return { indexed: false } — Luca may fall back to observational
//   3. If indexed → run full books + treasury read and return registry truth
//
// This is the canonical truth gate for all 143+ indexed agents.
// Luca must call this before emitting any per-agent financial or attribution claim.

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks } from "@/lib/agent-books";
import { getWalletStableBalance } from "@/lib/treasury-balance";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import { toSlug } from "@/app/registry/[slug]/slug";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/i;

function treasuryHealth(balance: number, hasWallets: boolean): string {
  if (!hasWallets) return "unknown";
  if (balance >= 10_000) return "healthy";
  if (balance >= 1_000) return "low";
  return "critical";
}

// Human-readable data quality label Luca includes in every response about an agent.
function dataQualityLabel(
  verificationStatus: string,
  attributionTier: string,
  booksAttributed: boolean,
): string {
  if (!booksAttributed) {
    if (attributionTier === "discovered") {
      return "Zetta registry (wallets present, not manifest-declared — financial data unavailable)";
    }
    if (attributionTier === "unattributed") {
      return "Zetta registry (no declared wallets — financial data unavailable)";
    }
    return "Zetta registry (financials under review — figures suppressed pending verification)";
  }
  if (verificationStatus === "Verified" || verificationStatus === "Luca Managed") {
    return "Zetta registry (Verified — manifest-declared, books attributed)";
  }
  if (verificationStatus === "Wallets Declared") {
    return "Zetta registry (Wallets Declared — manifest-declared, books attributed, ownership unconfirmed)";
  }
  return "Zetta registry (books attributed)";
}

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/v1/luca/agent-read";

  let body: { agent?: string; period?: string };
  try {
    body = await req.json() as { agent?: string; period?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.agent ?? "").trim();
  if (!query) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "agent is required (name, slug, or 0x wallet address)" }, { status: 400 });
  }

  const period = (body.period ?? "30d") as "7d" | "14d" | "30d" | "90d";

  try {
    // ── Step 1: Resolve identifier → registry match ──────────────────────────
    const { agents } = await getRegistryAgents();
    const isAddress = ADDRESS_RE.test(query);
    const queryLower = query.toLowerCase();

    type Agent = (typeof agents)[0];
    let match: Agent | undefined;
    let matchType: "slug" | "name" | "wallet_address" = "slug";

    if (isAddress) {
      match = agents.find((a) =>
        (a.wallets ?? []).some((w) => w.address.toLowerCase() === queryLower),
      );
      if (match) matchType = "wallet_address";
    }

    if (!match) {
      match = agents.find((a) => toSlug(a.name) === queryLower);
      if (match) matchType = "slug";
    }

    if (!match) {
      match = agents.find((a) => a.name.toLowerCase().includes(queryLower));
      if (match) matchType = "name";
    }

    // ── Step 2: Not indexed ──────────────────────────────────────────────────
    if (!match) {
      auth.finish(200, Date.now() - start, endpoint);
      return NextResponse.json({
        indexed: false,
        read_source: "not_indexed",
        query,
        data_quality: "Not indexed in Zetta registry. Any response about this agent is observational, non-registry, and non-verified.",
        agent: null,
        generated_at: new Date().toISOString(),
      });
    }

    // ── Step 3: Indexed — run books + treasury ───────────────────────────────
    const slug = toSlug(match.name);
    const allWallets = match.wallets ?? [];
    const eligibleWallets = allWallets.filter((w) => isBooksEligibleWallet(w, match!.tokenAddress).eligible);

    const attributionTier =
      eligibleWallets.length > 0 ? "manifest_attributed" :
      allWallets.length > 0 ? "discovered" :
      "unattributed";

    const [booksResult, ...balanceResults] = await Promise.allSettled([
      buildAgentBooks(match as Parameters<typeof buildAgentBooks>[0], period),
      ...eligibleWallets.map((w) => getWalletStableBalance(w.address)),
    ]);

    const books = booksResult.status === "fulfilled" ? booksResult.value : null;
    const booksAttributed = books?.attributed === true;

    const treasuryWallets = eligibleWallets.map((w, i) => {
      const balance = balanceResults[i]?.status === "fulfilled"
        ? (balanceResults[i] as PromiseFulfilledResult<number>).value
        : 0;
      return {
        address: w.address.toLowerCase(),
        label: w.label,
        role: w.role ?? null,
        address_type: w.address_type ?? "unknown",
        stable_balance_usd: balance,
      };
    });

    const totalBalance = Math.round(
      treasuryWallets.reduce((s, w) => s + w.stable_balance_usd, 0) * 100,
    ) / 100;

    const label = dataQualityLabel(match.verificationStatus, attributionTier, booksAttributed);

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      indexed: true,
      read_source: "registry",
      query,
      match_type: matchType,
      data_quality: label,
      agent: {
        name: match.name,
        slug,
        ecosystem: match.ecosystem,
        verification_status: match.verificationStatus,
        website: match.website ?? null,
        x_handle: match.xHandle ?? null,
        profile_url: `https://www.zettaai.co/registry/${slug}`,
        attribution_tier: attributionTier,
        books_eligible_wallets: eligibleWallets.length,
        total_wallets: allWallets.length,
      },
      books,
      treasury: {
        wallets: treasuryWallets,
        total_stable_balance_usd: totalBalance,
        health: treasuryHealth(totalBalance, eligibleWallets.length > 0),
      },
      // Luca narrative summary if books are attributed
      summary: booksAttributed && books && "luca_summary" in books ? books.luca_summary : null,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    auth.finish(500, Date.now() - start, endpoint);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
