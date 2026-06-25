import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { fetchWalletTransactions } from "@/lib/truth-engine/chain-fetcher";
import { classifyTransaction, computeEvidenceUpgrade } from "@/lib/truth-engine/revenue-classifier";
import {
  getWalletClaims,
  getAllRegistryWalletAddresses,
  insertRevenueClassificationEvent,
  insertEvidencePacket,
  upgradeWalletEvidenceStatus,
} from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import type { EvidencePacket } from "@/lib/truth-engine/evidence";

const SUPPORTED_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"] as const;
type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

function isSupportedChain(s: string): s is SupportedChain {
  return (SUPPORTED_CHAINS as readonly string[]).includes(s);
}

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_slug, address, chain, from_block, limit } = body as {
    agent_slug?:  string;
    address?:     string;
    chain?:       string;
    from_block?:  number;
    limit?:       number;
  };

  if (!agent_slug || typeof agent_slug !== "string") {
    return NextResponse.json({ ok: false, error: "agent_slug is required" }, { status: 400 });
  }
  if (!address || typeof address !== "string") {
    return NextResponse.json({ ok: false, error: "address is required" }, { status: 400 });
  }
  if (!chain || typeof chain !== "string" || !isSupportedChain(chain)) {
    return NextResponse.json(
      { ok: false, error: `chain is required; supported: ${SUPPORTED_CHAINS.join(", ")}` },
      { status: 400 },
    );
  }

  const addr = address.toLowerCase();

  // ── 1. Fetch transactions from chain ─────────────────────────────────────────
  const fetchResult = await fetchWalletTransactions({
    address:   addr,
    chain,
    fromBlock: from_block,
    limit:     limit ?? 500,
  });

  if (fetchResult.provider === "none") {
    return NextResponse.json({
      ok:            false,
      agent_slug,
      address:       addr,
      chain,
      provider_used: "none",
      error:         fetchResult.error ?? "No provider available",
    }, { status: 503 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      ok:            false,
      error:         "DB not configured — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
      provider_used: fetchResult.provider,
      txs_fetched:   fetchResult.transactions.length,
    }, { status: 503 });
  }

  // ── 2. Load wallet sets for classification ────────────────────────────────────
  let ownWallets:      Set<string>;
  let registryWallets: Set<string>;

  try {
    const [agentClaims, allAddresses] = await Promise.all([
      getWalletClaims(agent_slug),
      getAllRegistryWalletAddresses(),
    ]);
    ownWallets      = new Set(agentClaims.map((w) => (w.address as string).toLowerCase()));
    registryWallets = new Set(allAddresses.map((a) => a.toLowerCase()));
  } catch (e) {
    return NextResponse.json({ ok: false, error: `DB read failed: ${String(e)}` }, { status: 500 });
  }

  // ── 3. Classify + persist ─────────────────────────────────────────────────────
  const errors:           string[] = [];
  let   eventsClassified           = 0;
  const classifiedEvents           = fetchResult.transactions.map((tx) =>
    classifyTransaction(tx, ownWallets, registryWallets),
  );

  for (const event of classifiedEvents) {
    try {
      await insertRevenueClassificationEvent(agent_slug, event);
      eventsClassified++;
    } catch (e) {
      errors.push(`insert ${event.txHash}: ${String(e)}`);
    }
  }

  // ── 4. Evidence upgrade ───────────────────────────────────────────────────────
  let evidenceUpgrade: string | null = null;

  // Find the current evidence status for this specific wallet
  let currentEvidenceStatus = "attributed";
  try {
    const agentClaims = await getWalletClaims(agent_slug);
    const walletClaim = agentClaims.find(
      (w) => (w.address as string).toLowerCase() === addr && w.chain === chain,
    );
    if (walletClaim) {
      currentEvidenceStatus = (walletClaim.evidence_status as string) ?? "attributed";
    }
  } catch {
    // non-fatal — proceed with default
  }

  const upgrade = computeEvidenceUpgrade(currentEvidenceStatus, classifiedEvents, registryWallets);

  if (upgrade) {
    try {
      await upgradeWalletEvidenceStatus(agent_slug, addr, chain, upgrade);
      evidenceUpgrade = upgrade;

      // Insert an evidence packet recording the on-chain observation
      const evidencePacket: EvidencePacket = {
        subject_type:     "wallet",
        subject_slug:     `${agent_slug}:${addr}`,
        claim:            `evidence_status:${upgrade}`,
        status:           upgrade,
        confidence:       upgrade === "verified" ? "high" : "medium",
        evidence_summary: `On-chain activity observed on ${chain}: ${eventsClassified} classified events; status upgraded to ${upgrade}`,
        evidence_payload: {
          address:           addr,
          chain,
          txs_fetched:       fetchResult.transactions.length,
          events_classified: eventsClassified,
          provider:          fetchResult.provider,
          classified_counts: classifiedEvents.reduce<Record<string, number>>((acc, e) => {
            acc[e.classification] = (acc[e.classification] ?? 0) + 1;
            return acc;
          }, {}),
        },
        source_type: "on_chain",
        source_ref:  `${chain}:${addr}`,
      };
      await insertEvidencePacket(evidencePacket);
    } catch (e) {
      errors.push(`evidence upgrade: ${String(e)}`);
    }
  }

  return NextResponse.json({
    ok:              errors.length === 0,
    agent_slug,
    address:         addr,
    chain,
    provider_used:   fetchResult.provider,
    txs_fetched:     fetchResult.transactions.length,
    events_classified: eventsClassified,
    evidence_upgrade: evidenceUpgrade,
    fetch_error:     fetchResult.error ?? null,
    errors:          errors.length > 0 ? errors : [],
    classified_counts: classifiedEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.classification] = (acc[e.classification] ?? 0) + 1;
      return acc;
    }, {}),
  });
}
