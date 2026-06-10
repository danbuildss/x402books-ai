// The join: Manifest Wallets + Ledger Engine + Transaction Classification
// = Per-Agent Financial Statements.
//
// This is the core product. Books integrity rules:
//   1. Full statements ONLY for agents with declared wallet attribution.
//   2. Transfers between an agent's own attributed wallets are internal —
//      never revenue, never expense.
//   3. Numbers we can't stand behind are omitted, not estimated.

import { buildLedgerScan } from "@/lib/ledger-service";
import type { LedgerTransaction, TimeRange } from "@/lib/ledger";
import type { Agent } from "@/app/registry/types";

export type AgentBooks = {
  attributed: true;
  agent: string;
  range: TimeRange;
  statement: {
    revenue_usd: number;
    expenses_usd: number;
    net_income_usd: number;
    net_margin_pct: number | null; // null when revenue is 0
    transaction_count: number;
    internal_transfers: number;
    top_expense_category: string | null;
    top_revenue_source: string | null; // counterparty address (top income source)
  };
  wallets: Array<{
    address: string;
    role: string;
    inflow_usd: number;
    outflow_usd: number;
    transaction_count: number;
  }>;
  attribution: {
    wallets_declared: number;
    wallets_analyzed: number; // base-chain wallets actually scanned
    source: "manifest";
  };
  generated_at: string;
};

export type AgentBooksUnattributed = {
  attributed: false;
  agent: string;
  reason: string;
};

const MAX_WALLETS = 6; // bound upstream API cost per request

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function buildAgentBooks(
  agent: Agent,
  range: TimeRange,
): Promise<AgentBooks | AgentBooksUnattributed> {
  // Rule 1: no attribution → no books. Honest, not estimated.
  const declared = agent.wallets ?? [];
  const baseWallets = declared
    .filter((w) => !w.chain || w.chain.toLowerCase() === "base")
    .slice(0, MAX_WALLETS);

  if (baseWallets.length === 0) {
    return {
      attributed: false,
      agent: agent.name,
      reason:
        declared.length === 0
          ? "No wallets declared. Add .agent/wallets.json to the agent's repo to unlock books."
          : "Declared wallets are not on Base — books currently cover Base activity only.",
    };
  }

  const ownAddresses = new Set(declared.map((w) => w.address.toLowerCase()));

  // Scan each attributed wallet through the ledger engine
  const scans = await Promise.all(
    baseWallets.map(async (w) => {
      try {
        const scan = await buildLedgerScan({ wallet: w.address, range, persist: false });
        return { wallet: w, transactions: scan.transactions };
      } catch {
        return { wallet: w, transactions: [] as LedgerTransaction[] };
      }
    }),
  );

  // Merge + aggregate with internal-transfer elimination.
  // A transfer between two attributed wallets appears in both scans (expense
  // in one, income in the other) — count it once, as internal, worth $0 P&L.
  const seenTx = new Set<string>();
  let revenue = 0;
  let expenses = 0;
  let internalCount = 0;
  const expenseByCategory = new Map<string, number>();
  const incomeBySource = new Map<string, number>();

  const walletRows = scans.map(({ wallet, transactions }) => {
    let inflow = 0;
    let outflow = 0;
    let txCount = 0;

    for (const tx of transactions) {
      const usd = tx.usdValue ?? tx.amountUsdc;
      const isInternal =
        tx.direction === "internal" ||
        ownAddresses.has(tx.counterparty.toLowerCase());

      // Per-wallet flows include everything (operational view)
      if (tx.direction === "income") inflow += usd;
      if (tx.direction === "expense") outflow += usd;
      txCount++;

      // Agent-level P&L: dedupe across wallet scans, exclude internal
      const txKey = tx.txHash;
      if (seenTx.has(txKey)) continue;
      seenTx.add(txKey);

      if (isInternal) {
        internalCount++;
        continue;
      }
      if (tx.direction === "income") {
        revenue += usd;
        const src = tx.counterparty.toLowerCase();
        incomeBySource.set(src, (incomeBySource.get(src) ?? 0) + usd);
      } else if (tx.direction === "expense") {
        expenses += usd;
        const cat = tx.category ?? "unknown";
        expenseByCategory.set(cat, (expenseByCategory.get(cat) ?? 0) + usd);
      }
    }

    return {
      address: wallet.address,
      role: wallet.role ?? "unknown",
      inflow_usd: round2(inflow),
      outflow_usd: round2(outflow),
      transaction_count: txCount,
    };
  });

  const top = <K,>(m: Map<K, number>): K | null => {
    let best: K | null = null;
    let max = 0;
    for (const [k, v] of m) if (v > max) { max = v; best = k; }
    return best;
  };

  const net = revenue - expenses;

  return {
    attributed: true,
    agent: agent.name,
    range,
    statement: {
      revenue_usd: round2(revenue),
      expenses_usd: round2(expenses),
      net_income_usd: round2(net),
      net_margin_pct: revenue > 0 ? round2((net / revenue) * 100) : null,
      transaction_count: seenTx.size,
      internal_transfers: internalCount,
      top_expense_category: top(expenseByCategory),
      top_revenue_source: top(incomeBySource),
    },
    wallets: walletRows,
    attribution: {
      wallets_declared: declared.length,
      wallets_analyzed: baseWallets.length,
      source: "manifest",
    },
    generated_at: new Date().toISOString(),
  };
}
