// Agent Books — the join between wallet attribution and the ledger engine.
//
// Takes an agent's declared wallets (registry_agent_wallets), runs each through
// the existing ledger engine, merges the results into one agent-level financial
// statement, and eliminates internal transfers between the agent's own wallets.
//
// Integrity rules:
// 1. No attribution → no books. Agents without declared wallets get an honest
//    refusal, never an estimate.
// 2. Transfers between an agent's own declared wallets are treasury movement,
//    never revenue or expenses.
// 3. Numbers are never synthesized. Unavailable data is null or empty.

import { getRegistryAgents } from "@/lib/registry-db";
import { buildLedgerScan } from "@/lib/ledger-service";
import { getWalletStableBalance } from "@/lib/treasury-balance";
import { toSlug } from "@/app/registry/[slug]/slug";
import {
  isValidWalletAddress,
  formatCategory,
  type LedgerTransaction,
  type TimeRange,
} from "@/lib/ledger";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import { BOOKS_CACHE_TTL_MS } from "@/lib/status-tags";
import { getConfidenceLabel } from "@/lib/revenue-confidence";
import {
  isBridgeContract,
  isDexRouter,
  getQuarantineReason,
  type QuarantineReason,
  CAPITAL_INJECTION_THRESHOLD_USD,
  KNOWN_COUNTERPARTY_MIN_INTERACTIONS,
} from "@/lib/classification-filters";
import type { Agent } from "@/app/registry/types";
import { computeMomentum } from "./agent-momentum";
import type { AgentBooksSnapshot } from "./agent-books-history";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { isBooksTrackedToken } from "@/lib/tokens";

const MAX_WALLETS = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuarantinedInflow = {
  txHash: string;
  amount_usd: number;
  reason: QuarantineReason;
  counterparty: string;
  timestamp: string;
};

export type BooksConfidence = "high" | "medium" | "low";

export type AgentBooks = {
  agent: { slug: string; name: string; ecosystem: string };
  attributed: true;
  period: TimeRange;
  wallets: { declared: number; analyzed: number; roles: string[] };
  financials: {
    revenue_usd: number;           // operating revenue only (quarantined excluded)
    gross_inflow_usd: number;      // all inflows before classification
    expenses_usd: number;
    net_income_usd: number;
    treasury_balance_usd: number | null;
    runway_months: number | null;
    margin_pct: number | null;
    tx_count: number;
  };
  classification: {
    operating_revenue_usd: number;
    settlement_revenue_usd: number;    // stablecoin inflows from known counterparties (≥3 interactions) — highest-confidence tier
    agent_token_revenue_usd: number;   // agent-token inflows — medium-confidence tier
    quarantined_inflows_usd: number;
    bridge_excluded_expense_usd: number;
    dex_excluded_usd: number;
    quarantined_events: QuarantinedInflow[];
  };
  confidence: {
    revenue: BooksConfidence;
    expenses: BooksConfidence;
    treasury: BooksConfidence;
    overall: BooksConfidence;
    flags: string[];
  };
  breakdown: {
    revenue_by_source: Array<{ address: string; total_usd: number; tx_count: number }>;
    expenses_by_category: Array<{ category: string; label: string; total_usd: number; tx_count: number }>;
    top_counterparties: Array<{ address: string; total_usd: number; tx_count: number }>;
  };
  attribution: {
    source: "manifest" | "registry";
    confidence: "high" | "medium" | "low";
    internal_transfers_removed: number;
  };
  luca_summary: string;
  generated_at: string;
};

export type AgentBooksUnattributed = {
  agent: { slug: string; name: string; ecosystem: string };
  attributed: false;
  reason: string;
  message?: string;
  wallets?: { declared: number; analyzed: number };
};

// Module-level cache shared by API routes and server components.
// Both callers benefit from the same 10-minute TTL per slug+period key.
const BOOKS_CACHE = new Map<string, { expires: number; data: AgentBooks | AgentBooksUnattributed }>();
const BOOKS_CACHE_TTL = 10 * 60 * 1000;

// DB cache TTL: 4 hours. Cron refreshes every 4h so this keeps data fresh
// without triggering live Alchemy scans on every profile page load.
// Shared with the books_status derivation so the two can't drift.
const DB_CACHE_TTL_MS = BOOKS_CACHE_TTL_MS;

async function getDbCachedBooks(
  slug: string,
  period: string,
): Promise<AgentBooks | AgentBooksUnattributed | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("agent_books_cache")
    .select("books_json, computed_at")
    .eq("agent_slug", slug)
    .eq("period", period)
    .single();
  if (!data) return null;
  const age = Date.now() - new Date(data.computed_at as string).getTime();
  if (age > DB_CACHE_TTL_MS) return null;
  return data.books_json as AgentBooks | AgentBooksUnattributed;
}

async function setDbCachedBooks(
  slug: string,
  period: string,
  books: AgentBooks | AgentBooksUnattributed,
): Promise<void> {
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_books_cache").upsert(
    {
      agent_slug: slug,
      period,
      books_json: books as unknown as Record<string, unknown>,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "agent_slug,period" },
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const { agents } = await getRegistryAgents();
  return agents.find((a) => toSlug(a.name) === slug) ?? null;
}

export async function buildAgentBooks(
  agent: Agent,
  period: TimeRange,
): Promise<AgentBooks | AgentBooksUnattributed> {
  const slug = toSlug(agent.name);
  const cacheKey = `${slug}:${period}`;
  const cached = BOOKS_CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  // Check confidence label — if under_review, suppress all financials immediately.
  // This ensures GDP, leaderboard, and API all see attributed:false.
  const confidenceLabel = await getConfidenceLabel(slug);
  if (confidenceLabel?.confidence_level === "under_review") {
    const underReview: AgentBooksUnattributed = {
      agent: { slug, name: agent.name, ecosystem: agent.ecosystem },
      attributed: false,
      reason: "financials_under_review",
      message: confidenceLabel.public_note ?? "Financial figures are being verified. Updated numbers will be published once wallet attribution and transaction classification are confirmed.",
    };
    // Short TTL for under-review — re-check every 5 minutes so lifting the flag takes effect quickly.
    BOOKS_CACHE.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, data: underReview });
    return underReview;
  }

  // Validate DB cache before serving: stale if attributed wallets changed.
  // Old check only caught "no manifest wallets". New check also catches wallet-count changes.
  const currentEligibleCount = (agent.wallets ?? []).filter(
    (w) => isBooksEligibleWallet(w, agent.tokenAddress).eligible,
  ).length;
  const dbCached = await getDbCachedBooks(slug, period);
  if (dbCached) {
    const cachedAnalyzed = dbCached.attributed ? (dbCached as AgentBooks).wallets.analyzed : 0;
    const cacheStale =
      (!dbCached.attributed && currentEligibleCount > 0) ||
      (dbCached.attributed && currentEligibleCount === 0) ||
      (dbCached.attributed && cachedAnalyzed !== currentEligibleCount);
    if (!cacheStale) {
      BOOKS_CACHE.set(cacheKey, { expires: Date.now() + BOOKS_CACHE_TTL, data: dbCached });
      return dbCached;
    }
    // Cache is stale — fall through to fresh computation
  }

  const data = await computeAgentBooks(agent, period, slug);
  BOOKS_CACHE.set(cacheKey, { expires: Date.now() + BOOKS_CACHE_TTL, data });
  setDbCachedBooks(slug, period, data).catch(() => {});
  return data;
}

// Invalidate in-memory AND DB cache for a slug+period.
// Must be awaited before calling buildAgentBooks() to guarantee a fresh scan.
export async function invalidateBooksCache(slug: string, period = "30d"): Promise<void> {
  BOOKS_CACHE.delete(`${slug}:${period}`);
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_books_cache").delete().eq("agent_slug", slug).eq("period", period);
}

// Invalidate ALL periods for a given agent — used after wallet eligibility changes
// or when manually purging a stale/incorrect cache entry (e.g., post-PR fix).
export async function invalidateAllBooksCache(slug: string): Promise<void> {
  // Clear in-memory for all known periods
  for (const period of ["7d", "14d", "30d", "90d"]) {
    BOOKS_CACHE.delete(`${slug}:${period}`);
  }
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_books_cache").delete().eq("agent_slug", slug);
}

// ── Internal computation ──────────────────────────────────────────────────────

async function computeAgentBooks(
  agent: Agent,
  period: TimeRange,
  slug: string,
): Promise<AgentBooks | AgentBooksUnattributed> {
  const agentMeta = { slug, name: agent.name, ecosystem: agent.ecosystem };

  const declared = (agent.wallets ?? []).filter((w) => {
    if (!isValidWalletAddress(w.address)) return false;
    return isBooksEligibleWallet(w, agent.tokenAddress).eligible;
  });
  if (declared.length === 0) {
    return {
      agent: agentMeta,
      attributed: false,
      reason: "No manifest-declared wallets found. Only wallets declared via .agent/wallets.json produce attributed books.",
    };
  }

  // Only Base wallets are scannable today; rows without a chain predate the
  // metadata migration and are Base by definition.
  const scannable = declared
    .filter((w) => !w.chain || w.chain.toLowerCase() === "base")
    .slice(0, MAX_WALLETS);

  // If wallets were declared but none are scannable (e.g., all non-Base chains),
  // surface a specific error rather than silently returning no data.
  if (declared.length > 0 && scannable.length === 0) {
    return {
      agent: agentMeta,
      attributed: false,
      reason: "wallets_declared_not_scannable",
      message: "Wallets declared but none are scannable. Verify declared addresses are agent operational wallets, not token contracts.",
      wallets: { declared: declared.length, analyzed: 0 },
    };
  }

  const ownAddresses = new Set(declared.map((w) => w.address.toLowerCase()));

  const scans = await Promise.all(
    scannable.map((w) =>
      buildLedgerScan({ wallet: w.address, range: period, persist: false }),
    ),
  );

  // Any wallet whose tx fetch hit its pagination cap inside the window means
  // these books may be incomplete — surfaced as a confidence flag below.
  const txWindowTruncated = scans.some((s) => s.truncated);

  // Merge transactions across wallets; deduplicate legs that appear in two
  // scans when a transfer occurs between two of the agent's own wallets.
  const seen = new Set<string>();
  const merged: LedgerTransaction[] = [];
  for (const scan of scans) {
    for (const tx of scan.transactions) {
      const key = `${tx.txHash}:${tx.tokenAddress}:${tx.from.toLowerCase()}:${tx.to.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(tx);
    }
  }

  // Token whitelist: only ETH (native), WETH, USDC, USDT, and the agent's own
  // project token count toward books/GDP. All other ERC-20s are excluded to
  // prevent inflation from memecoin and LP token flows.
  const tokenFiltered = merged.filter((tx) =>
    isBooksTrackedToken(tx.tokenAddress, agent.tokenAddress),
  );

  // Internal transfers: both legs belong to this agent's declared wallets —
  // treasury movement, never revenue or expenses.
  const internal: LedgerTransaction[] = [];
  const external: LedgerTransaction[] = [];
  for (const tx of tokenFiltered) {
    const isInternal =
      ownAddresses.has(tx.from.toLowerCase()) && ownAddresses.has(tx.to.toLowerCase());
    (isInternal ? internal : external).push(tx);
  }

  // ── Swap detection ────────────────────────────────────────────────────────
  // Three signals: dual-direction txHash, known DEX router, and addresses
  // seen as counterparties in confirmed swaps this window — catches standalone
  // DEX settlement inflows that have no paired expense leg in the same txHash.
  const directionsByHash = new Map<string, Set<string>>();
  for (const tx of external) {
    const set = directionsByHash.get(tx.txHash) ?? new Set<string>();
    set.add(tx.direction);
    directionsByHash.set(tx.txHash, set);
  }
  const isSwapByHash = (tx: LedgerTransaction) =>
    (directionsByHash.get(tx.txHash)?.size ?? 0) > 1;
  const isSwapByRouter = (tx: LedgerTransaction) =>
    isDexRouter(tx.from) || isDexRouter(tx.to) || isDexRouter(tx.counterparty ?? "");

  const dexDetectedAddresses = new Set<string>();
  for (const tx of external) {
    if (isSwapByHash(tx) || isSwapByRouter(tx)) {
      if (tx.from) dexDetectedAddresses.add(tx.from.toLowerCase());
      if (tx.to) dexDetectedAddresses.add(tx.to.toLowerCase());
      if (tx.counterparty) dexDetectedAddresses.add(tx.counterparty.toLowerCase());
    }
  }
  for (const addr of ownAddresses) dexDetectedAddresses.delete(addr);

  const isSwapByDetectedAddress = (tx: LedgerTransaction) =>
    dexDetectedAddresses.has((tx.from ?? "").toLowerCase()) ||
    dexDetectedAddresses.has((tx.to ?? "").toLowerCase()) ||
    dexDetectedAddresses.has((tx.counterparty ?? "").toLowerCase());
  const isSwap = (tx: LedgerTransaction) =>
    isSwapByHash(tx) || isSwapByRouter(tx) || isSwapByDetectedAddress(tx);

  // ── Bridge detection ──────────────────────────────────────────────────────
  // P0 fix: bridge transfers excluded from both revenue and expenses.
  const isBridge = (tx: LedgerTransaction) =>
    isBridgeContract(tx.from) || isBridgeContract(tx.to) || isBridgeContract(tx.counterparty ?? "");

  const usdOf = (tx: LedgerTransaction) => tx.usdValue ?? tx.amountUsdc;

  // Pre-filter: remove swaps and bridge transfers from all financial calculations
  const operational = external.filter((tx) => !isSwap(tx) && !isBridge(tx));
  const dexExcluded = external.filter((tx) => isSwap(tx));
  const bridgeExcluded = external.filter((tx) => !isSwap(tx) && isBridge(tx));

  const dexExcludedUsd = dexExcluded.reduce((s, tx) => s + usdOf(tx), 0);
  const bridgeExcludedExpenseUsd = bridgeExcluded
    .filter((tx) => tx.direction === "expense")
    .reduce((s, tx) => s + usdOf(tx), 0);

  const round = (n: number) => Math.round(n * 100) / 100;

  // ── Counterparty interaction counts (for capital injection detection) ─────
  const counterpartyInteractions = new Map<string, number>();
  for (const tx of operational) {
    const addr = (tx.counterparty || tx.from).toLowerCase();
    counterpartyInteractions.set(addr, (counterpartyInteractions.get(addr) ?? 0) + 1);
  }

  // ── Revenue classification (P0: capital injection + grant + token dist) ───
  const allIncomeTxs = operational.filter((tx) => tx.direction === "income");
  const grossInflowUsd = allIncomeTxs.reduce((s, tx) => s + usdOf(tx), 0);

  const operatingRevenueTxs: LedgerTransaction[] = [];
  const quarantinedEvents: QuarantinedInflow[] = [];

  const STABLECOINS = new Set([
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
    "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", // USDT
    "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI
    "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42", // EURC
  ]);

  for (const tx of allIncomeTxs) {
    const counterparty = (tx.counterparty || tx.from).toLowerCase();
    const priorInteractions = counterpartyInteractions.get(counterparty) ?? 0;
    const isStablecoin = STABLECOINS.has((tx.tokenAddress ?? "").toLowerCase());
    const usd = usdOf(tx);

    const reason = getQuarantineReason(counterparty, usd, priorInteractions, isStablecoin);
    if (reason) {
      quarantinedEvents.push({
        txHash: tx.txHash,
        amount_usd: round(usd),
        reason,
        counterparty,
        timestamp: tx.timestamp,
      });
    } else {
      operatingRevenueTxs.push(tx);
    }
  }

  // ── Revenue tiering ───────────────────────────────────────────────────────
  // settlement_revenue: stablecoin inflows from known counterparties (≥3 txs)
  // agent_token_revenue: agent-token inflows passing quarantine (medium-confidence)
  const settlementRevenueTxs = operatingRevenueTxs.filter((tx) => {
    const counterparty = (tx.counterparty || tx.from).toLowerCase();
    const priorInteractions = counterpartyInteractions.get(counterparty) ?? 0;
    return STABLECOINS.has((tx.tokenAddress ?? "").toLowerCase())
      && priorInteractions >= KNOWN_COUNTERPARTY_MIN_INTERACTIONS;
  });
  const agentTokenRevenueTxs = agent.tokenAddress
    ? operatingRevenueTxs.filter((tx) =>
        (tx.tokenAddress ?? "").toLowerCase() === agent.tokenAddress!.toLowerCase()
        && !STABLECOINS.has((tx.tokenAddress ?? "").toLowerCase()),
      )
    : [];

  const settlementRevenueUsd = settlementRevenueTxs.reduce((s, tx) => s + usdOf(tx), 0);
  const agentTokenRevenueUsd = agentTokenRevenueTxs.reduce((s, tx) => s + usdOf(tx), 0);

  // ── Truth-engine: fee_received signal ────────────────────────────────────
  // If the truth-engine has recorded confirmed fee_received events for this
  // agent, that is external corroboration of revenue — boost confidence.
  let hasTruthEngineFeeReceipts = false;
  if (hasSupabaseAdminEnv()) {
    try {
      const sb = getSupabaseAdminClient();
      const { data: feeEvents } = await sb
        .from("revenue_classification_events")
        .select("id")
        .eq("agent_slug", slug)
        .eq("classification", "fee_received")
        .limit(1);
      hasTruthEngineFeeReceipts = (feeEvents?.length ?? 0) > 0;
    } catch {
      // non-fatal — truth-engine data is advisory
    }
  }

  const expenseTxs = operational.filter((tx) => tx.direction === "expense");

  const revenue  = operatingRevenueTxs.reduce((s, tx) => s + usdOf(tx), 0);
  const expenses = expenseTxs.reduce((s, tx) => s + usdOf(tx), 0);
  const quarantinedUsd = quarantinedEvents.reduce((s, e) => s + e.amount_usd, 0);
  const netIncome = revenue - expenses;

  // ── Breakdown maps ────────────────────────────────────────────────────────
  const bySource = new Map<string, { address: string; total_usd: number; tx_count: number }>();
  for (const tx of operatingRevenueTxs) {
    const addr = tx.counterparty || tx.from;
    const e = bySource.get(addr) ?? { address: addr, total_usd: 0, tx_count: 0 };
    e.total_usd += usdOf(tx);
    e.tx_count += 1;
    bySource.set(addr, e);
  }

  const byCategory = new Map<string, { category: string; label: string; total_usd: number; tx_count: number }>();
  for (const tx of expenseTxs) {
    const cat = tx.category ?? "unknown";
    const e = byCategory.get(cat) ?? { category: cat, label: formatCategory(cat), total_usd: 0, tx_count: 0 };
    e.total_usd += usdOf(tx);
    e.tx_count += 1;
    byCategory.set(cat, e);
  }

  const byCounterparty = new Map<string, { address: string; total_usd: number; tx_count: number }>();
  for (const tx of operational) {
    const addr = tx.counterparty;
    if (!addr) continue;
    const e = byCounterparty.get(addr) ?? { address: addr, total_usd: 0, tx_count: 0 };
    e.total_usd += usdOf(tx);
    e.tx_count += 1;
    byCounterparty.set(addr, e);
  }

  // ── Treasury ──────────────────────────────────────────────────────────────
  const treasuryWallets = declared.filter((w) => w.role === "treasury" && isValidWalletAddress(w.address));
  const treasuryBalances = await Promise.all(
    treasuryWallets.map((w) => getWalletStableBalance(w.address).catch(() => 0)),
  );
  const treasuryBalance = treasuryBalances.length > 0
    ? round(treasuryBalances.reduce((s, b) => s + b, 0))
    : null;
  const runwayMonths = treasuryBalance !== null && expenses > 0
    ? round(treasuryBalance / expenses)
    : null;

  // ── Attribution confidence (wallet-level) ─────────────────────────────────
  const walletConfidences = scannable.map((w) => (w.confidence ?? "").toLowerCase());
  const attributionConfidence: "high" | "medium" | "low" =
    walletConfidences.length > 0 && walletConfidences.every((c) => c === "verified")
      ? "high"
      : walletConfidences.some((c) => c === "declared" || c === "verified")
        ? "medium"
        : "low";

  // ── Per-metric confidence scoring (P0) ───────────────────────────────────
  const confidenceFlags: string[] = [];

  const hasMultipleWallets = scannable.length >= 2;
  const hasTreasuryRole = treasuryWallets.length > 0;
  const hasExpenseWallet = scannable.some((w) =>
    ["fee", "operator", "deployer"].includes((w.role ?? "").toLowerCase()),
  );
  const hasQuarantinedEvents = quarantinedEvents.length > 0;
  const walletCoverage = scannable.length / Math.max(declared.length, 1);

  const revenueIsPrimarilyAgentToken = revenue > 0 && agentTokenRevenueUsd / revenue > 0.5;
  const hasSettlementRevenue = settlementRevenueUsd > 0;

  if (!hasMultipleWallets) confidenceFlags.push("single_wallet_only");
  if (!hasTreasuryRole) confidenceFlags.push("no_treasury_wallet");
  if (!hasExpenseWallet) confidenceFlags.push("no_expense_wallet");
  if (hasQuarantinedEvents) confidenceFlags.push(`${quarantinedEvents.length}_quarantined_inflows`);
  if (walletCoverage < 0.8) confidenceFlags.push("wallet_coverage_below_80pct");
  if (attributionConfidence === "low") confidenceFlags.push("low_wallet_attestation");
  if (revenueIsPrimarilyAgentToken) confidenceFlags.push("revenue_primarily_agent_token");
  if (hasTruthEngineFeeReceipts) confidenceFlags.push("truth_engine_fee_receipts_confirmed");
  if (txWindowTruncated) confidenceFlags.push("tx_window_truncated");

  // Revenue confidence tiering:
  // - low:    quarantined > operating revenue (data dominated by noise)
  // - medium: low attribution, single wallet, OR revenue is >50% agent token
  // - high:   stablecoin settlement revenue OR truth-engine fee receipts, clean attribution
  const revenueConfidenceBase: BooksConfidence =
    hasQuarantinedEvents && quarantinedUsd > revenue
      ? "low"
      : revenueIsPrimarilyAgentToken || attributionConfidence === "low" || !hasMultipleWallets
        ? "medium"
        : hasSettlementRevenue || hasTruthEngineFeeReceipts
          ? "high"
          : "medium";
  // Incomplete windows can never be high-confidence — totals may be missing txs.
  const revenueConfidence: BooksConfidence =
    txWindowTruncated && revenueConfidenceBase === "high" ? "medium" : revenueConfidenceBase;

  const expenseConfidence: BooksConfidence =
    !hasExpenseWallet
      ? "low"
      : attributionConfidence === "low"
        ? "medium"
        : "high";

  const treasuryConfidence: BooksConfidence =
    !hasTreasuryRole
      ? "low"
      : attributionConfidence === "low"
        ? "medium"
        : "high";

  const confidenceScores = [revenueConfidence, expenseConfidence, treasuryConfidence];
  const overallConfidence: BooksConfidence =
    confidenceScores.every((c) => c === "high")
      ? "high"
      : confidenceScores.some((c) => c === "low")
        ? "low"
        : "medium";

  const fromManifest = scannable.some(
    (w) => (w.evidenceSource ?? "").toLowerCase() === "manifest",
  );

  return {
    agent: agentMeta,
    attributed: true,
    period,
    wallets: {
      declared: declared.length,
      analyzed: scannable.length,
      roles: [...new Set(scannable.map((w) => w.role ?? "unknown"))],
    },
    financials: {
      revenue_usd:          round(revenue),
      gross_inflow_usd:     round(grossInflowUsd),
      expenses_usd:         round(expenses),
      net_income_usd:       round(netIncome),
      treasury_balance_usd: treasuryBalance,
      runway_months:        runwayMonths,
      margin_pct:           revenue > 0 ? round((netIncome / revenue) * 100) : null,
      tx_count:             operational.length,
    },
    classification: {
      operating_revenue_usd:        round(revenue),
      settlement_revenue_usd:       round(settlementRevenueUsd),
      agent_token_revenue_usd:      round(agentTokenRevenueUsd),
      quarantined_inflows_usd:      round(quarantinedUsd),
      bridge_excluded_expense_usd:  round(bridgeExcludedExpenseUsd),
      dex_excluded_usd:             round(dexExcludedUsd),
      quarantined_events:           quarantinedEvents.slice(0, 20),
    },
    confidence: {
      revenue:  revenueConfidence,
      expenses: expenseConfidence,
      treasury: treasuryConfidence,
      overall:  overallConfidence,
      flags:    confidenceFlags,
    },
    breakdown: {
      revenue_by_source: [...bySource.values()]
        .sort((a, b) => b.total_usd - a.total_usd)
        .slice(0, 10)
        .map((e) => ({ ...e, total_usd: round(e.total_usd) })),
      expenses_by_category: [...byCategory.values()]
        .sort((a, b) => b.total_usd - a.total_usd)
        .map((e) => ({ ...e, total_usd: round(e.total_usd) })),
      top_counterparties: [...byCounterparty.values()]
        .sort((a, b) => b.total_usd - a.total_usd)
        .slice(0, 5)
        .map((e) => ({ ...e, total_usd: round(e.total_usd) })),
    },
    attribution: {
      source:                    fromManifest ? "manifest" : "registry",
      confidence:                attributionConfidence,
      internal_transfers_removed: internal.length,
    },
    luca_summary: buildSummary(
      agent.name, period, revenue, expenses, netIncome, operational.length, internal.length,
      undefined, quarantinedUsd, overallConfidence,
    ),
    generated_at: new Date().toISOString(),
  };
}

// ── Revenue Audit Types ───────────────────────────────────────────────────────

export type AuditTx = {
  txHash: string;
  timestamp: string;
  amount_usd: number;
  token_symbol: string;
  token_address: string;
  from: string;
  to: string;
  counterparty: string;
  direction: "income" | "expense" | "internal";
  audit_category: "operating_revenue" | "quarantined" | "dex_excluded" | "bridge_excluded" | "internal_transfer";
  audit_reason: string;
  quarantine_reason?: QuarantineReason;
};

export type AgentRevenueAudit = {
  agent: { slug: string; name: string };
  period: TimeRange;
  wallets: { declared: number; analyzed: number; roles: string[] };
  summary: {
    gross_inflow_usd: number;
    operating_revenue_usd: number;
    quarantined_usd: number;
    dex_excluded_usd: number;
    bridge_excluded_inflow_usd: number;
    internal_transfer_usd: number;
    total_txs_scanned: number;
  };
  transactions: {
    operating_revenue: AuditTx[];
    quarantined: AuditTx[];
    dex_excluded: AuditTx[];
    bridge_excluded: AuditTx[];
    internal_transfers: AuditTx[];
  };
  aeon_diff_notes: string[];
  generated_at: string;
};

function txToAudit(
  tx: LedgerTransaction,
  category: AuditTx["audit_category"],
  reason: string,
  qReason?: QuarantineReason,
): AuditTx {
  return {
    txHash: tx.txHash,
    timestamp: tx.timestamp,
    amount_usd: Math.round((tx.usdValue ?? tx.amountUsdc) * 100) / 100,
    token_symbol: tx.tokenSymbol,
    token_address: tx.tokenAddress,
    from: tx.from,
    to: tx.to,
    counterparty: tx.counterparty ?? "",
    direction: tx.direction,
    audit_category: category,
    audit_reason: reason,
    quarantine_reason: qReason,
  };
}

// buildAgentBooksAudit returns the full transaction-level breakdown used by
// Revenue Audit Mode. It always bypasses cache and returns every transaction
// with its classification reason. Never modifies any classification logic.
export async function buildAgentBooksAudit(
  agent: Agent,
  period: TimeRange,
): Promise<AgentRevenueAudit | { error: string }> {
  const slug = toSlug(agent.name);

  const declared = (agent.wallets ?? []).filter((w) => {
    if (!isValidWalletAddress(w.address)) return false;
    return isBooksEligibleWallet(w, agent.tokenAddress).eligible;
  });

  if (declared.length === 0) return { error: "No manifest-declared wallets found. Only wallets declared via .agent/wallets.json produce attributed books." };

  const scannable = declared
    .filter((w) => !w.chain || w.chain.toLowerCase() === "base")
    .slice(0, MAX_WALLETS);

  if (scannable.length === 0) return { error: "No scannable wallets (Base chain only)." };

  const ownAddresses = new Set(declared.map((w) => w.address.toLowerCase()));

  const scans = await Promise.all(
    scannable.map((w) => buildLedgerScan({ wallet: w.address, range: period, persist: false })),
  );

  const seen = new Set<string>();
  const merged: LedgerTransaction[] = [];
  for (const scan of scans) {
    for (const tx of scan.transactions) {
      const key = `${tx.txHash}:${tx.tokenAddress}:${tx.from.toLowerCase()}:${tx.to.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(tx);
    }
  }

  const internalTxs: LedgerTransaction[] = [];
  const external: LedgerTransaction[] = [];
  for (const tx of merged) {
    const isIntl = ownAddresses.has(tx.from.toLowerCase()) && ownAddresses.has(tx.to.toLowerCase());
    (isIntl ? internalTxs : external).push(tx);
  }

  const directionsByHash = new Map<string, Set<string>>();
  for (const tx of external) {
    const s = directionsByHash.get(tx.txHash) ?? new Set<string>();
    s.add(tx.direction);
    directionsByHash.set(tx.txHash, s);
  }
  const isSwapByHash   = (tx: LedgerTransaction) => (directionsByHash.get(tx.txHash)?.size ?? 0) > 1;
  const isSwapByRouter = (tx: LedgerTransaction) =>
    isDexRouter(tx.from) || isDexRouter(tx.to) || isDexRouter(tx.counterparty ?? "");

  const dexDetectedAddresses = new Set<string>();
  for (const tx of external) {
    if (isSwapByHash(tx) || isSwapByRouter(tx)) {
      if (tx.from) dexDetectedAddresses.add(tx.from.toLowerCase());
      if (tx.to) dexDetectedAddresses.add(tx.to.toLowerCase());
      if (tx.counterparty) dexDetectedAddresses.add(tx.counterparty.toLowerCase());
    }
  }
  for (const addr of ownAddresses) dexDetectedAddresses.delete(addr);

  const isSwapByDetectedAddress = (tx: LedgerTransaction) =>
    dexDetectedAddresses.has((tx.from ?? "").toLowerCase()) ||
    dexDetectedAddresses.has((tx.to ?? "").toLowerCase()) ||
    dexDetectedAddresses.has((tx.counterparty ?? "").toLowerCase());
  const isSwap   = (tx: LedgerTransaction) =>
    isSwapByHash(tx) || isSwapByRouter(tx) || isSwapByDetectedAddress(tx);
  const isBridge = (tx: LedgerTransaction) =>
    isBridgeContract(tx.from) || isBridgeContract(tx.to) || isBridgeContract(tx.counterparty ?? "");

  const usdOf = (tx: LedgerTransaction) => tx.usdValue ?? tx.amountUsdc;
  const round = (n: number) => Math.round(n * 100) / 100;

  const operational      = external.filter((tx) => !isSwap(tx) && !isBridge(tx));
  const dexExcludedTxs   = external.filter((tx) => isSwap(tx));
  const bridgeExcludedTxs = external.filter((tx) => !isSwap(tx) && isBridge(tx));

  const counterpartyInteractions = new Map<string, number>();
  for (const tx of operational) {
    const addr = (tx.counterparty || tx.from).toLowerCase();
    counterpartyInteractions.set(addr, (counterpartyInteractions.get(addr) ?? 0) + 1);
  }

  const STABLECOINS = new Set([
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
    "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42",
  ]);

  const allIncomeTxs = operational.filter((tx) => tx.direction === "income");
  const operatingRevenueAudit: AuditTx[] = [];
  const quarantinedAudit: AuditTx[] = [];

  for (const tx of allIncomeTxs) {
    const counterparty   = (tx.counterparty || tx.from).toLowerCase();
    const priorInt       = counterpartyInteractions.get(counterparty) ?? 0;
    const isStablecoin   = STABLECOINS.has((tx.tokenAddress ?? "").toLowerCase());
    const usd            = usdOf(tx);

    const qReason = getQuarantineReason(counterparty, usd, priorInt, isStablecoin);
    if (qReason) {
      const tokenDistMsg = usd === 0
        ? `$0-value non-stablecoin (${tx.tokenSymbol}) — junk token airdrop, not operating revenue regardless of counterparty history.`
        : `Non-stablecoin (${tx.tokenSymbol}) from counterparty with only ${priorInt} prior interaction(s). Classified as token distribution, not operating revenue.`;
      const EXPLANATIONS: Record<QuarantineReason, string> = {
        capital_injection:   `Single inflow of $${usd.toFixed(2)} from counterparty with only ${priorInt} prior interaction(s) — exceeds $${CAPITAL_INJECTION_THRESHOLD_USD.toLocaleString()} capital injection threshold.`,
        grant_program:       `Inflow from known grant/ecosystem program address. Classified as grant, not operating revenue.`,
        bridge_receipt:      `Inbound bridge transfer. Bridge receipts transfer token ownership but do not represent earned revenue.`,
        token_distribution:  tokenDistMsg,
        unknown_large_inflow:`Large inflow ($${usd.toFixed(2)}) from counterparty with ${priorInt} prior interaction(s). Cannot classify as operating revenue.`,
      };
      quarantinedAudit.push(txToAudit(tx, "quarantined", EXPLANATIONS[qReason], qReason));
    } else {
      const reasons: string[] = [];
      if (isStablecoin) reasons.push(`stablecoin (${tx.tokenSymbol})`);
      if (priorInt >= KNOWN_COUNTERPARTY_MIN_INTERACTIONS) reasons.push(`known counterparty (${priorInt} prior txs)`);
      if (usd < CAPITAL_INJECTION_THRESHOLD_USD) reasons.push(`below $${CAPITAL_INJECTION_THRESHOLD_USD.toLocaleString()} threshold`);
      operatingRevenueAudit.push(
        txToAudit(tx, "operating_revenue", `Counted as operating revenue: ${reasons.join(", ")}.`),
      );
    }
  }

  const dexAudit = dexExcludedTxs.map((tx) => {
    const byHash     = isSwapByHash(tx);
    const byRouter   = isSwapByRouter(tx);
    const byDetected = isSwapByDetectedAddress(tx);
    const why = byHash && byRouter
      ? "Both dual-direction txHash and DEX router address detected."
      : byHash
        ? "Transaction hash contains both income and expense legs — detected as token swap."
        : byRouter
          ? "From/to/counterparty address is a known DEX router or aggregator."
          : byDetected
            ? "Counterparty address participated in confirmed DEX swaps this audit window — standalone inflow treated as DEX activity."
            : "From/to/counterparty address is a known DEX router or aggregator.";
    return txToAudit(tx, "dex_excluded", why);
  });

  const bridgeAudit = bridgeExcludedTxs.map((tx) =>
    txToAudit(tx, "bridge_excluded", "From/to/counterparty address is a known bridge contract."),
  );

  const internalAudit = internalTxs.map((tx) =>
    txToAudit(tx, "internal_transfer", `Both from (${tx.from.slice(0, 10)}…) and to (${tx.to.slice(0, 10)}…) are declared wallets of ${agent.name}. Treasury movement, not revenue.`),
  );

  const grossInflowUsd       = allIncomeTxs.reduce((s, tx) => s + usdOf(tx), 0);
  const operatingRevenueUsd  = operatingRevenueAudit.reduce((s, tx) => s + tx.amount_usd, 0);
  const quarantinedUsd       = quarantinedAudit.reduce((s, tx) => s + tx.amount_usd, 0);
  const dexUsd               = dexAudit.reduce((s, tx) => s + tx.amount_usd, 0);
  const bridgeInflowUsd      = bridgeAudit.filter((t) => t.direction === "income").reduce((s, tx) => s + tx.amount_usd, 0);
  const internalUsd          = internalAudit.reduce((s, tx) => s + tx.amount_usd, 0);

  const aeonDiffNotes = [
    `Zetta operating revenue ($${round(operatingRevenueUsd).toLocaleString()}) = gross inflows ($${round(grossInflowUsd).toLocaleString()}) minus quarantined ($${round(quarantinedUsd).toLocaleString()}).`,
    `DEX swaps ($${round(dexUsd).toLocaleString()} across ${dexAudit.length} tx(s)) are excluded from all revenue and expense calculations.`,
    `Bridge transfers excluded; $${round(bridgeInflowUsd).toLocaleString()} in inbound bridge receipts were not counted as revenue.`,
    `${internalTxs.length} internal transfer(s) between this agent's declared wallets removed (treasury movement).`,
    `Capital injection rule: inflows ≥ $${CAPITAL_INJECTION_THRESHOLD_USD.toLocaleString()} from counterparties with < ${KNOWN_COUNTERPARTY_MIN_INTERACTIONS} prior interactions are quarantined.`,
    `If AEON's figure is higher: it may include bridge receipts, DEX inflows, or capital injections, or aggregate across chains beyond Base.`,
    `If AEON's figure is lower: it may use a shorter time window, different wallet set, or a stricter stablecoin-only filter.`,
    `Only Base chain ERC-20 transfers are scanned. Native ETH inflows and multi-chain activity are not captured.`,
  ];

  return {
    agent: { slug, name: agent.name },
    period,
    summary: {
      gross_inflow_usd:           round(grossInflowUsd),
      operating_revenue_usd:      round(operatingRevenueUsd),
      quarantined_usd:            round(quarantinedUsd),
      dex_excluded_usd:           round(dexUsd),
      bridge_excluded_inflow_usd: round(bridgeInflowUsd),
      internal_transfer_usd:      round(internalUsd),
      total_txs_scanned:          merged.length,
    },
    transactions: {
      operating_revenue:  operatingRevenueAudit,
      quarantined:        quarantinedAudit,
      dex_excluded:       dexAudit,
      bridge_excluded:    bridgeAudit,
      internal_transfers: internalAudit,
    },
    wallets: {
      declared:  declared.length,
      analyzed:  scannable.length,
      roles:     [...new Set(scannable.map((w) => w.role ?? "unknown"))],
    },
    aeon_diff_notes: aeonDiffNotes,
    generated_at: new Date().toISOString(),
  };
}

function buildSummary(
  name: string,
  period: TimeRange,
  revenue: number,
  expenses: number,
  netIncome: number,
  txCount: number,
  internalCount: number,
  history?: AgentBooksSnapshot[],
  quarantinedUsd?: number,
  overallConfidence?: BooksConfidence,
): string {
  if (txCount === 0 && internalCount === 0) {
    return "No attributed financial activity detected yet.";
  }
  const fmt = (n: number) => `$${Math.abs(n).toFixed(2)}`;
  const parts = [
    `${name} recorded ${fmt(revenue)} in operating revenue and ${fmt(expenses)} in expenses over ${period} (${txCount} transactions).`,
    netIncome >= 0
      ? `Net income is positive at ${fmt(netIncome)}.`
      : `Net income is negative at -${fmt(netIncome)} — spending exceeds revenue.`,
  ];
  if (quarantinedUsd && quarantinedUsd > 0) {
    parts.push(
      `${fmt(quarantinedUsd)} quarantined from gross inflows — not counted as operating revenue.`,
    );
  }
  if (internalCount > 0) {
    parts.push(
      `${internalCount} internal transfer${internalCount === 1 ? "" : "s"} between declared wallets excluded from the statement.`,
    );
  }
  if (overallConfidence === "low") {
    parts.push("Data confidence is low — figures are directional, not precise.");
  } else if (overallConfidence === "medium") {
    parts.push("Data confidence is medium — verify wallet roles for higher precision.");
  }
  let summary = parts.join(" ");

  if (history && history.length >= 2) {
    const m = computeMomentum(history, 30);
    if (m) {
      const momentumParts: string[] = [];
      if (m.revenue.direction !== "stable") {
        const verb = m.revenue.direction === "growing" ? "grew" : "declined";
        momentumParts.push(`Revenue ${verb} ${Math.abs(m.revenue.pct).toFixed(0)}% over 30 days.`);
      }
      if (m.expenses.direction !== "stable") {
        const verb = m.expenses.direction === "growing" ? "increased" : "decreased";
        momentumParts.push(`Expenses ${verb} ${Math.abs(m.expenses.pct).toFixed(0)}%.`);
      }
      if (m.net_income.direction !== "stable") {
        const verb = m.net_income.direction === "growing" ? "expanded" : "contracted";
        momentumParts.push(`Net income ${verb} ${Math.abs(m.net_income.pct).toFixed(0)}%.`);
      }
      if (m.treasury && m.treasury.direction !== "stable") {
        const verb = m.treasury.direction === "growing" ? "grew" : "shrank";
        momentumParts.push(`Treasury ${verb} ${Math.abs(m.treasury.pct).toFixed(0)}%.`);
      }
      if (momentumParts.length > 0) summary += " " + momentumParts.join(" ");
    }
  }

  return summary;
}
