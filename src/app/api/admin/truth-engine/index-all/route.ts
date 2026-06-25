import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { fetchWalletTransactions } from "@/lib/truth-engine/chain-fetcher";
import { classifyTransaction, computeEvidenceUpgrade } from "@/lib/truth-engine/revenue-classifier";
import {
  getBooksEligibleWallets,
  getAllRegistryWalletAddresses,
  insertRevenueClassificationEvent,
  insertEvidencePacket,
  upgradeWalletEvidenceStatus,
  getWalletClaims,
} from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import type { EvidencePacket } from "@/lib/truth-engine/evidence";
import type { ClassifiedEvent } from "@/lib/truth-engine/revenue-classifier";

const MAX_WALLETS = 100;

interface WalletResult {
  agent_slug:        string;
  address:           string;
  chain:             string;
  provider_used:     string;
  txs_fetched:       number;
  events_classified: number;
  evidence_upgrade:  string | null;
  classified_counts: Record<string, number>;
  fetch_error:       string | null;
  insert_errors:     number;
  skipped:           boolean;
  skip_reason?:      string;
}

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* empty body ok */ }

  const fromBlock  = typeof body.from_block  === "number" ? body.from_block  : undefined;
  const limit      = typeof body.limit       === "number" ? body.limit       : 200;
  const maxWallets = typeof body.max_wallets === "number" ? Math.min(body.max_wallets, MAX_WALLETS) : MAX_WALLETS;

  // ── Load eligible wallets + registry ──────────────────────────────────────────
  let eligibleWallets: { agent_slug: string; address: string; chain: string }[];
  let registryWallets: Set<string>;

  try {
    const [eligible, allAddresses] = await Promise.all([
      getBooksEligibleWallets(),
      getAllRegistryWalletAddresses(),
    ]);
    eligibleWallets = eligible as { agent_slug: string; address: string; chain: string }[];
    registryWallets = new Set(allAddresses.map((a) => a.toLowerCase()));
  } catch (e) {
    return NextResponse.json({ ok: false, error: `DB read failed: ${String(e)}` }, { status: 500 });
  }

  if (eligibleWallets.length === 0) {
    return NextResponse.json({
      ok:             true,
      wallets_found:  0,
      wallets_indexed: 0,
      wallets_skipped: 0,
      per_wallet:     [],
      note:           "No books-eligible wallets found. Ingest manifests first.",
    });
  }

  const batch    = eligibleWallets.slice(0, maxWallets);
  const results: WalletResult[] = [];
  let   indexed  = 0;
  let   skipped  = 0;

  // Build a per-agent own-wallet map once, cache across the batch
  const agentOwnWallets = new Map<string, Set<string>>();

  async function getOwnWallets(agentSlug: string): Promise<Set<string>> {
    if (agentOwnWallets.has(agentSlug)) return agentOwnWallets.get(agentSlug)!;
    try {
      const claims = await getWalletClaims(agentSlug);
      const s = new Set(claims.map((w) => (w.address as string).toLowerCase()));
      agentOwnWallets.set(agentSlug, s);
      return s;
    } catch {
      return new Set();
    }
  }

  // ── Process each wallet sequentially to respect rate limits ──────────────────
  for (const wallet of batch) {
    const addr  = wallet.address.toLowerCase();
    const chain = wallet.chain as "base" | "ethereum" | "arbitrum" | "optimism" | "polygon";

    const VALID_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"];
    if (!VALID_CHAINS.includes(chain)) {
      results.push({
        agent_slug: wallet.agent_slug, address: addr, chain,
        provider_used: "none", txs_fetched: 0, events_classified: 0,
        evidence_upgrade: null, classified_counts: {}, fetch_error: null,
        insert_errors: 0, skipped: true, skip_reason: `Unsupported chain: ${chain}`,
      });
      skipped++;
      continue;
    }

    // Fetch transactions
    const fetchResult = await fetchWalletTransactions({ address: addr, chain, fromBlock, limit });

    if (fetchResult.provider === "none") {
      results.push({
        agent_slug: wallet.agent_slug, address: addr, chain,
        provider_used: "none", txs_fetched: 0, events_classified: 0,
        evidence_upgrade: null, classified_counts: {},
        fetch_error: fetchResult.error ?? "No provider",
        insert_errors: 0, skipped: true, skip_reason: "Provider unavailable",
      });
      skipped++;
      continue;
    }

    // Classify
    const ownWallets = await getOwnWallets(wallet.agent_slug);
    const classified: ClassifiedEvent[] = fetchResult.transactions.map((tx) =>
      classifyTransaction(tx, ownWallets, registryWallets),
    );

    const counts: Record<string, number> = {};
    let   insertErrors = 0;

    for (const event of classified) {
      counts[event.classification] = (counts[event.classification] ?? 0) + 1;
      try {
        await insertRevenueClassificationEvent(wallet.agent_slug, event);
      } catch {
        insertErrors++;
      }
    }

    // Evidence upgrade
    let evidenceUpgrade: string | null = null;
    try {
      const claims = await getWalletClaims(wallet.agent_slug);
      const claim  = claims.find(
        (w) => (w.address as string).toLowerCase() === addr && w.chain === chain,
      );
      const currentStatus = (claim?.evidence_status as string) ?? "attributed";
      const upgrade = computeEvidenceUpgrade(currentStatus, classified, registryWallets);

      if (upgrade) {
        await upgradeWalletEvidenceStatus(wallet.agent_slug, addr, chain, upgrade);
        evidenceUpgrade = upgrade;

        const packet: EvidencePacket = {
          subject_type:     "wallet",
          subject_slug:     `${wallet.agent_slug}:${addr}`,
          claim:            `evidence_status:${upgrade}`,
          status:           upgrade,
          confidence:       upgrade === "verified" ? "high" : "medium",
          evidence_summary: `Batch index on ${chain}: ${classified.length} events → status upgraded to ${upgrade}`,
          evidence_payload: {
            address:           addr,
            chain,
            txs_fetched:       fetchResult.transactions.length,
            events_classified: classified.length,
            provider:          fetchResult.provider,
            classified_counts: counts,
          },
          source_type: "on_chain",
          source_ref:  `${chain}:${addr}`,
        };
        await insertEvidencePacket(packet);
      }
    } catch { /* non-fatal */ }

    results.push({
      agent_slug:        wallet.agent_slug,
      address:           addr,
      chain,
      provider_used:     fetchResult.provider,
      txs_fetched:       fetchResult.transactions.length,
      events_classified: classified.length,
      evidence_upgrade:  evidenceUpgrade,
      classified_counts: counts,
      fetch_error:       fetchResult.error ?? null,
      insert_errors:     insertErrors,
      skipped:           false,
    });
    indexed++;
  }

  const truncated = eligibleWallets.length > maxWallets;

  return NextResponse.json({
    ok:              true,
    wallets_found:   eligibleWallets.length,
    wallets_indexed: indexed,
    wallets_skipped: skipped,
    truncated,
    truncated_at:    truncated ? maxWallets : null,
    per_wallet:      results,
    totals: {
      txs_fetched:       results.reduce((s, r) => s + r.txs_fetched, 0),
      events_classified: results.reduce((s, r) => s + r.events_classified, 0),
      evidence_upgrades: results.filter((r) => r.evidence_upgrade).length,
    },
  });
}
