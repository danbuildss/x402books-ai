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
import type { Agent } from "@/app/registry/types";
import { computeMomentum } from "./agent-momentum";
import type { AgentBooksSnapshot } from "./agent-books-history";
import { isContractAddress } from "@/lib/alchemy";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const MAX_WALLETS = 6;

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentBooks = {
  agent: { slug: string; name: string; ecosystem: string };
  attributed: true;
  period: TimeRange;
  wallets: { declared: number; analyzed: number; roles: string[] };
  financials: {
    revenue_usd: number;
    expenses_usd: number;
    net_income_usd: number;
    treasury_balance_usd: number | null;
    runway_months: number | null;
    margin_pct: number | null;
    tx_count: number;
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
const DB_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

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

  // Check persistent DB cache before running a live Alchemy scan
  const dbCached = await getDbCachedBooks(slug, period);
  if (dbCached) {
    BOOKS_CACHE.set(cacheKey, { expires: Date.now() + BOOKS_CACHE_TTL, data: dbCached });
    return dbCached;
  }

  const data = await computeAgentBooks(agent, period, slug);
  BOOKS_CACHE.set(cacheKey, { expires: Date.now() + BOOKS_CACHE_TTL, data });
  // Persist to DB cache (fire-and-forget)
  setDbCachedBooks(slug, period, data).catch(() => {});
  return data;
}

// Invalidate both in-memory and (via TTL expiry) the DB cache for a specific
// slug+period. Call this before a force-refresh to ensure a fresh Alchemy scan.
export function invalidateBooksCache(slug: string, period = "30d"): void {
  BOOKS_CACHE.delete(`${slug}:${period}`);
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
    // Token contract addresses must never be scanned as operational wallets.
    if (
      agent.tokenAddress &&
      w.address.toLowerCase() === agent.tokenAddress.toLowerCase()
    ) return false;
    // Explicitly-labelled token contract roles are also excluded.
    const role = (w.role ?? "").toLowerCase();
    if (role === "token_contract" || role === "token") return false;
    return true;
  });
  if (declared.length === 0) {
    return {
      agent: agentMeta,
      attributed: false,
      reason: "No declared wallets found. Add .agent/wallets.json to generate books.",
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

  // Check each wallet is an EOA, not a smart contract.
  // Runs in parallel (~200ms overhead on first scan; cached reads skip this).
  const apiKey = process.env.ALCHEMY_API_KEY ?? "";
  const contractFlags = await Promise.all(
    scannable.map((w) => isContractAddress(w.address, apiKey)),
  );
  const eoaWallets = scannable.filter((_, i) => !contractFlags[i]);

  // Log any skipped contracts so they're visible in Vercel logs
  const skippedContracts = scannable.filter((_, i) => contractFlags[i]);
  if (skippedContracts.length > 0) {
    console.warn(
      `[books] Skipped ${skippedContracts.length} contract address(es) for ${agent.name}:`,
      skippedContracts.map((w) => w.address),
    );
  }

  // If contract detection removed every wallet, surface a clear error
  if (eoaWallets.length === 0) {
    return {
      agent: agentMeta,
      attributed: false,
      reason: "wallets_declared_not_scannable",
      message: "All declared wallets are smart contracts, not EOA wallets. Verify declared addresses.",
      wallets: { declared: declared.length, analyzed: 0 },
    };
  }

  const ownAddresses = new Set(declared.map((w) => w.address.toLowerCase()));

  const scans = await Promise.all(
    eoaWallets.map((w) =>
      buildLedgerScan({ wallet: w.address, range: period, persist: false }),
    ),
  );

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

  // Internal transfers: both legs belong to this agent's declared wallets —
  // treasury movement, never revenue or expenses.
  const internal: LedgerTransaction[] = [];
  const external: LedgerTransaction[] = [];
  for (const tx of merged) {
    const isInternal =
      ownAddresses.has(tx.from.toLowerCase()) && ownAddresses.has(tx.to.toLowerCase());
    (isInternal ? internal : external).push(tx);
  }

  // Swap detection: same tx hash with both an inflow and outflow is a token
  // swap, not revenue or spend.
  const directionsByHash = new Map<string, Set<string>>();
  for (const tx of external) {
    const set = directionsByHash.get(tx.txHash) ?? new Set<string>();
    set.add(tx.direction);
    directionsByHash.set(tx.txHash, set);
  }
  const isSwap = (tx: LedgerTransaction) =>
    (directionsByHash.get(tx.txHash)?.size ?? 0) > 1;

  const usdOf = (tx: LedgerTransaction) => tx.usdValue ?? tx.amountUsdc;

  const revenueTxs = external.filter((tx) => tx.direction === "income" && !isSwap(tx));
  const expenseTxs = external.filter((tx) => tx.direction === "expense" && !isSwap(tx));

  const revenue = revenueTxs.reduce((sum, tx) => sum + usdOf(tx), 0);
  const expenses = expenseTxs.reduce((sum, tx) => sum + usdOf(tx), 0);
  const netIncome = revenue - expenses;

  const bySource = new Map<string, { address: string; total_usd: number; tx_count: number }>();
  for (const tx of revenueTxs) {
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
  for (const tx of external) {
    const addr = tx.counterparty;
    if (!addr) continue;
    const e = byCounterparty.get(addr) ?? { address: addr, total_usd: 0, tx_count: 0 };
    e.total_usd += usdOf(tx);
    e.tx_count += 1;
    byCounterparty.set(addr, e);
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  // Fetch live stablecoin balance for treasury wallets.
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

  const confidences = eoaWallets.map((w) => (w.confidence ?? "").toLowerCase());
  const confidence: "high" | "medium" | "low" =
    confidences.length > 0 && confidences.every((c) => c === "verified")
      ? "high"
      : confidences.some((c) => c === "declared" || c === "verified")
        ? "medium"
        : "low";

  const fromManifest = eoaWallets.some(
    (w) => (w.evidenceSource ?? "").toLowerCase() === "manifest",
  );

  return {
    agent: agentMeta,
    attributed: true,
    period,
    wallets: {
      declared: declared.length,
      analyzed: eoaWallets.length,
      roles: [...new Set(eoaWallets.map((w) => w.role ?? "unknown"))],
    },
    financials: {
      revenue_usd: round(revenue),
      expenses_usd: round(expenses),
      net_income_usd: round(netIncome),
      treasury_balance_usd: treasuryBalance,
      runway_months: runwayMonths,
      margin_pct: revenue > 0 ? round((netIncome / revenue) * 100) : null,
      tx_count: external.length,
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
      source: fromManifest ? "manifest" : "registry",
      confidence,
      internal_transfers_removed: internal.length,
    },
    luca_summary: buildSummary(
      agent.name, period, revenue, expenses, netIncome, external.length, internal.length,
    ),
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
): string {
  if (txCount === 0 && internalCount === 0) {
    return "No attributed financial activity detected yet.";
  }
  const fmt = (n: number) => `$${Math.abs(n).toFixed(2)}`;
  const parts = [
    `${name} recorded ${fmt(revenue)} in revenue and ${fmt(expenses)} in expenses over ${period} (${txCount} transactions).`,
    netIncome >= 0
      ? `Net income is positive at ${fmt(netIncome)}.`
      : `Net income is negative at -${fmt(netIncome)} — spending exceeds revenue.`,
  ];
  if (internalCount > 0) {
    parts.push(
      `${internalCount} internal transfer${internalCount === 1 ? "" : "s"} between declared wallets excluded from the statement.`,
    );
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
