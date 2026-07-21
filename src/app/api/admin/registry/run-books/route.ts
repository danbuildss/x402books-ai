// POST /api/admin/registry/run-books
//
// One-click books pipeline for a single agent:
//   1. Fix eligibility (auto-set address_type from role)
//   2. Sync books-eligible wallets into registry_wallet_claims
//   3. Index wallets on-chain (fetch txs + classify)
//   4. Build + save books snapshot
//
// Body: { slug: string }
// Auth: ZETTA_INTERNAL_SECRET

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks } from "@/lib/agent-books";
import { saveAgentBooksSnapshot } from "@/lib/agent-books-history";
import { fetchWalletTransactions } from "@/lib/truth-engine/chain-fetcher";
import { classifyTransaction, computeEvidenceUpgrade } from "@/lib/truth-engine/revenue-classifier";
import {
  upsertWalletClaims,
  getBooksEligibleWallets,
  insertRevenueClassificationEvent,
  upgradeWalletEvidenceStatus,
  insertEvidencePacket,
  getWalletClaims,
} from "@/lib/truth-engine-db";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { WalletRoleGraph } from "@/lib/truth-engine/wallet-graph";

const ROLE_TO_TYPE: Record<string, string> = {
  treasury:       "treasury_contract",
  operator:       "eoa",
  fee:            "eoa",
  revenue:        "eoa",
  surplus_wallet: "eoa",
  deployer:       "eoa",
};

const INELIGIBLE_ROLES = new Set(["token_contract", "token", "smart_contract"]);
const VALID_CHAINS = new Set(["base", "ethereum", "arbitrum", "optimism", "polygon"]);

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { slug?: string };
  const slug = body.slug?.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();

  // ── Step 1: Resolve slug → agent_name ────────────────────────────────────────
  const { agents } = await getRegistryAgents();
  const agent = agents.find((a) => toSlug(a.name) === slug);
  if (!agent) {
    return NextResponse.json({ ok: false, error: `No agent found with slug '${slug}'` }, { status: 404 });
  }

  // ── Step 2: Fix address_type for manifest wallets with null/unknown type ─────
  const { data: walletRows } = await sb
    .from("registry_agent_wallets")
    .select("id, address, role, address_type, evidence_source, chain, confidence, books_eligible")
    .eq("agent_name", agent.name)
    .eq("evidence_source", "manifest");

  let eligibilityFixed = 0;
  for (const w of walletRows ?? []) {
    const role = (w.role ?? "").toLowerCase();
    if (INELIGIBLE_ROLES.has(role)) continue;
    if (!w.address_type || w.address_type === "unknown") {
      // Unmapped roles stay unclassified — never default to eoa.
      const newType = ROLE_TO_TYPE[role];
      if (!newType) continue;
      await sb.from("registry_agent_wallets").update({ address_type: newType }).eq("id", w.id);
      eligibilityFixed++;
    }
  }

  // ── Step 3: Sync eligible wallets to registry_wallet_claims ──────────────────
  const { data: eligibleWallets } = await sb
    .from("registry_agent_wallets")
    .select("address, role, chain, confidence, evidence_source, address_type")
    .eq("agent_name", agent.name)
    .eq("evidence_source", "manifest")
    .eq("books_eligible", true);

  if ((eligibleWallets ?? []).length > 0) {
    const graph: WalletRoleGraph = {
      agent_slug: slug,
      wallets: (eligibleWallets ?? []).map((w) => ({
        address:         w.address,
        role:            w.role ?? "operator",
        chain:           w.chain ?? "base",
        confidence:      "high" as const,
        books_eligible:  true,
        claim_status:    "declared" as const,
        evidence_status: "attributed" as const,
        source_type:     "manifest" as const,
        source_ref:      "run-books",
      })),
    };
    await upsertWalletClaims(graph).catch(() => null);
  }

  // ── Step 4: Index wallets on-chain ───────────────────────────────────────────
  const walletsToIndex = await getBooksEligibleWallets(slug).catch(() => []);
  let txsIndexed = 0;
  let evidenceUpgrades = 0;
  const allAddresses = new Set((eligibleWallets ?? []).map((w) => w.address.toLowerCase()));

  for (const wallet of walletsToIndex) {
    const chain = wallet.chain as string;
    if (!VALID_CHAINS.has(chain)) continue;

    const fetchResult = await fetchWalletTransactions({
      address: wallet.address.toLowerCase(),
      chain:   chain as "base" | "ethereum" | "arbitrum" | "optimism" | "polygon",
      limit:   200,
    });

    if (fetchResult.provider === "none") continue;

    const ownWallets = new Set(
      (walletsToIndex).map((w) => w.address.toLowerCase()),
    );

    const classified = fetchResult.transactions.map((tx) =>
      classifyTransaction(tx, ownWallets, allAddresses),
    );

    for (const event of classified) {
      await insertRevenueClassificationEvent(slug, event).catch(() => null);
    }
    txsIndexed += classified.length;

    const claims = await getWalletClaims(slug).catch(() => []);
    const claim = claims.find(
      (w) => (w.address as string).toLowerCase() === wallet.address.toLowerCase(),
    );
    const currentStatus = (claim?.evidence_status as string) ?? "attributed";
    const upgrade = computeEvidenceUpgrade(currentStatus, classified, allAddresses);

    if (upgrade) {
      await upgradeWalletEvidenceStatus(slug, wallet.address.toLowerCase(), chain, upgrade).catch(() => null);
      evidenceUpgrades++;
    }
  }

  // ── Step 5: Build + save books snapshot ──────────────────────────────────────
  let snapshotSaved = false;
  try {
    const books = await buildAgentBooks(agent, "30d");
    if (books.attributed) {
      await saveAgentBooksSnapshot(books);
      snapshotSaved = true;
    }
  } catch {
    // non-fatal — books may just not be attributed yet
  }

  return NextResponse.json({
    ok:                true,
    slug,
    agent_name:        agent.name,
    eligibility_fixed: eligibilityFixed,
    wallets_synced:    (eligibleWallets ?? []).length,
    wallets_indexed:   walletsToIndex.length,
    txs_indexed:       txsIndexed,
    evidence_upgrades: evidenceUpgrades,
    snapshot_saved:    snapshotSaved,
  });
}
