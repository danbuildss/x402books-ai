import type { AgentBooksSnapshot } from "./agent-books-history";

export type MomentumDirection = "growing" | "stable" | "declining";

export type MetricMomentum = {
  direction: MomentumDirection;
  pct: number; // signed: +27.3 = +27.3%, -12.0 = -12.0%
};

export type AgentMomentum = {
  revenue: MetricMomentum;
  net_income: MetricMomentum;
  expenses: MetricMomentum;
  treasury: MetricMomentum | null; // null if no treasury data
  snapshot_count: number;
  window_days: number;
};

const THRESHOLD = 5; // ±5% = stable

function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / Math.abs(from)) * 100;
}

function direction(pct: number): MomentumDirection {
  if (pct > THRESHOLD) return "growing";
  if (pct < -THRESHOLD) return "declining";
  return "stable";
}

// Returns null if fewer than 2 snapshots
export function computeMomentum(
  snapshots: AgentBooksSnapshot[],
  windowDays = 30,
): AgentMomentum | null {
  if (snapshots.length < 2) return null;
  const first = snapshots[0];
  const last  = snapshots[snapshots.length - 1];
  return computeMomentumFromPair(first, last, snapshots.length, windowDays);
}

// Compute from just first+last (for bulk registry use)
export function computeMomentumFromPair(
  first: AgentBooksSnapshot,
  last: AgentBooksSnapshot,
  snapshotCount: number,
  windowDays: number,
): AgentMomentum | null {
  if (snapshotCount < 2) return null;
  const revPct = pctChange(first.revenue_usd,    last.revenue_usd);
  const niPct  = pctChange(first.net_income_usd, last.net_income_usd);
  const expPct = pctChange(first.expenses_usd,   last.expenses_usd);

  let treasury: MetricMomentum | null = null;
  if (first.treasury_usd !== null && last.treasury_usd !== null) {
    const tPct = pctChange(first.treasury_usd, last.treasury_usd);
    treasury = { direction: direction(tPct), pct: tPct };
  }

  return {
    revenue:    { direction: direction(revPct), pct: revPct },
    net_income: { direction: direction(niPct),  pct: niPct  },
    expenses:   { direction: direction(expPct), pct: expPct },
    treasury,
    snapshot_count: snapshotCount,
    window_days:    windowDays,
  };
}
