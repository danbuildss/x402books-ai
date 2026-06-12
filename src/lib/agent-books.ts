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
import { toSlug } from "@/app/registry/[slug]/slug";
import {
  isValidWalletAddress,
  formatCategory,
  type LedgerTransaction,
  type TimeRange,
} from "@/lib/ledger";
import type { Agent } from "@/app/registry/types";

// Cap wallets scanned per agent to protect Alchemy quota
const MAX_WALLETS = 6;

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
};

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const { agents } = await getRegistryAgents();
  return agents.find((a) => toSlug(a.name) === slug) ?? null;
}

export async function buildAgentBooks(
  agent: Agent,
  period: TimeRange,
): Promise<AgentBooks | AgentBooksUnattributed> {
  const slug = toSlug(agent.name);
  const agentMeta = { slug, name: agent.name, ecosystem: agent.ecosystem };

  const declared = (agent.wallets ?? []).filter((w) => isValidWalletAddress(w.address));
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

  const ownAddresses = new Set(declared.map((w) => w.address.toLowerCase()));

  // Scan every declared wallet through the existing ledger engine
  const scans = await Promise.all(
    scannable.map((w) =>
      buildLedgerScan({ wallet: w.address, range: period, persist: false }),
    ),
  );

  // Merge transactions across wallets, deduplicating transfer legs that appear
  // in two scans (a transfer between own wallets shows up in both the sender's
  // and the receiver's scan).
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

  // Internal transfers: both legs belong to this agent's declared wallets.
  // These are treasury movement, never revenue or expenses.
  const internal: LedgerTransaction[] = [];
  const external: LedgerTransaction[] = [];
  for (const tx of merged) {
    const isInternal =
      ownAddresses.has(tx.from.toLowerCase()) && ownAddresses.has(tx.to.toLowerCase());
    (isInternal ? internal : external).push(tx);
  }

  // Swap detection: the same tx hash carrying both an inflow and an outflow is
  // a token swap, not revenue or spend.
  const directionsByHash = new Map<string, Set<string>>();
  for (const tx of external) {
    const set = directionsByHash.get(tx.txHash) ?? new Set<string>();
    set.add(tx.direction);
    directionsByHash.set(tx.txHash, set);
  }
  const isSwap = (tx: LedgerTransaction) =>
    (directionsByHash.get(tx.txHash)?.size ?? 0) > 1;

  const usd = (tx: LedgerTransaction) => tx.usdValue ?? tx.amountUsdc;

  const revenueTxs = external.filter((tx) => tx.direction === "income" && !isSwap(tx));
  const expenseTxs = external.filter((tx) => tx.direction === "expense" && !isSwap(tx));

  const revenue = revenueTxs.reduce((sum, tx) => sum + usd(tx), 0);
  const expenses = expenseTxs.reduce((sum, tx) => sum + usd(tx), 0);
  const netIncome = revenue - expenses;

  // Revenue by source (counterparty)
  const bySource = new Map<string, { address: string; total_usd: number; tx_count: number }>();
  for (const tx of revenueTxs) {
    const addr = tx.counterparty || tx.from;
    const entry = bySource.get(addr) ?? { address: addr, total_usd: 0, tx_count: 0 };
    entry.total_usd += usd(tx);
    entry.tx_count += 1;
    bySource.set(addr, entry);
  }

  // Expenses by category
  const byCategory = new Map<string, { category: string; label: string; total_usd: number; tx_count: number }>();
  for (const tx of expenseTxs) {
    const cat = tx.category ?? "unknown";
    const entry = byCategory.get(cat) ?? {
      category: cat,
      label: formatCategory(cat),
      total_usd: 0,
      tx_count: 0,
    };
    entry.total_usd += usd(tx);
    entry.tx_count += 1;
    byCategory.set(cat, entry);
  }

  // Top counterparties across all external activity
  const byCounterparty = new Map<string, { address: string; total_usd: number; tx_count: number }>();
  for (const tx of external) {
    const addr = tx.counterparty;
    if (!addr) continue;
    const entry = byCounterparty.get(addr) ?? { address: addr, total_usd: 0, tx_count: 0 };
    entry.total_usd += usd(tx);
    entry.tx_count += 1;
    byCounterparty.set(addr, entry);
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  const confidences = scannable.map((w) => (w.confidence ?? "").toLowerCase());
  const confidence: "high" | "medium" | "low" =
    confidences.length > 0 && confidences.every((c) => c === "verified")
      ? "high"
      : confidences.some((c) => c === "declared" || c === "verified")
        ? "medium"
        : "low";

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
      revenue_usd: round(revenue),
      expenses_usd: round(expenses),
      net_income_usd: round(netIncome),
      // Balance tracking is not built yet — flows only. Never fabricate it.
      treasury_balance_usd: null,
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
    luca_summary: buildSummary(agent.name, period, revenue, expenses, netIncome, external.length, internal.length),
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
    parts.push(`${internalCount} internal transfer${internalCount === 1 ? "" : "s"} between declared wallets excluded from the statement.`);
  }
  return parts.join(" ");
}
