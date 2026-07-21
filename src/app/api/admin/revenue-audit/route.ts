// POST /api/admin/revenue-audit
// Batch revenue audit for named agents or top-N by GDP.
// Returns full AgentRevenueAudit per agent + automated analysis flags.
// Protected by ZETTA_INTERNAL_SECRET — admin use only.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getAgentBySlug, buildAgentBooksAudit } from "@/lib/agent-books";
import { getRegistryAgents } from "@/lib/registry-db";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { TimeRange } from "@/lib/ledger";
import type { AgentRevenueAudit } from "@/lib/agent-books";

const VALID_PERIODS: TimeRange[] = ["7d", "14d", "30d", "90d"];
const MAX_AGENTS = 20;
const CONCURRENCY = 3;

// ── Automated analysis flag types ─────────────────────────────────────────────

export type AuditFlag = {
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
};

export type AgentAuditResult =
  | { ok: true; audit: AgentRevenueAudit; metrics: { quarantine_rate: number; dex_rate: number; bridge_rate: number; wallet_coverage: number; revenue_per_tx: number }; flags: AuditFlag[] }
  | { ok: false; slug: string; error: string };

type AuditMetrics = { quarantine_rate: number; dex_rate: number; bridge_rate: number; wallet_coverage: number; revenue_per_tx: number };

function analyzeAudit(audit: AgentRevenueAudit): { metrics: AuditMetrics; flags: AuditFlag[] } {
  const s = audit.summary;
  const w = audit.wallets;

  const totalInflows = s.gross_inflow_usd + s.bridge_excluded_inflow_usd;
  const quarantine_rate  = s.gross_inflow_usd > 0 ? s.quarantined_usd / s.gross_inflow_usd : 0;
  const dex_rate         = (s.gross_inflow_usd + s.dex_excluded_usd) > 0
    ? s.dex_excluded_usd / (s.gross_inflow_usd + s.dex_excluded_usd) : 0;
  const bridge_rate      = (totalInflows) > 0 ? s.bridge_excluded_inflow_usd / totalInflows : 0;
  const wallet_coverage  = w.declared > 0 ? w.analyzed / w.declared : 1;
  const revenue_per_tx   = s.total_txs_scanned > 0 ? s.operating_revenue_usd / s.total_txs_scanned : 0;

  const flags: AuditFlag[] = [];

  // Quarantine anomalies
  if (quarantine_rate > 0.8 && s.gross_inflow_usd > 1000) {
    flags.push({ severity: "high", code: "HIGH_QUARANTINE_RATE", message: `${(quarantine_rate * 100).toFixed(0)}% of gross inflows quarantined — most activity is capital injections or grants, not operating revenue.` });
  } else if (quarantine_rate > 0.4 && s.gross_inflow_usd > 500) {
    flags.push({ severity: "medium", code: "ELEVATED_QUARANTINE_RATE", message: `${(quarantine_rate * 100).toFixed(0)}% of gross inflows quarantined — review quarantined txs for misclassified recurring revenue.` });
  }

  // All inflows quarantined with zero operating revenue
  if (s.gross_inflow_usd > 0 && s.operating_revenue_usd === 0) {
    flags.push({ severity: "high", code: "ZERO_OPERATING_REVENUE", message: "Gross inflows exist but operating revenue is zero — every inflow was quarantined, excluded, or filtered. Likely wallet coverage gap or all-capital-injection pattern." });
  }

  // Suspiciously high revenue
  if (s.operating_revenue_usd > 5_000_000) {
    flags.push({ severity: "high", code: "VERY_HIGH_REVENUE", message: `Operating revenue $${(s.operating_revenue_usd / 1_000_000).toFixed(2)}M — verify wallet roles. A treasury or token contract wallet miscategorised as revenue-generating would inflate this.` });
  } else if (s.operating_revenue_usd > 1_000_000) {
    flags.push({ severity: "medium", code: "HIGH_REVENUE", message: `Operating revenue $${(s.operating_revenue_usd / 1_000_000).toFixed(2)}M — cross-check against AEON's internal figure.` });
  }

  // Wallet coverage gaps
  if (wallet_coverage < 0.5 && w.declared > 1) {
    flags.push({ severity: "high", code: "LOW_WALLET_COVERAGE", message: `Only ${w.analyzed}/${w.declared} declared wallets are scannable (Base). Revenue and expenses are materially understated.` });
  } else if (wallet_coverage < 0.8 && w.declared > 2) {
    flags.push({ severity: "medium", code: "PARTIAL_WALLET_COVERAGE", message: `${w.analyzed}/${w.declared} wallets scanned — non-Base wallets excluded. Figures are partial.` });
  }

  // Multi-chain agents with bridge activity
  if (s.bridge_excluded_inflow_usd > s.operating_revenue_usd * 0.5 && s.bridge_excluded_inflow_usd > 1000) {
    flags.push({ severity: "medium", code: "HIGH_BRIDGE_ACTIVITY", message: `$${s.bridge_excluded_inflow_usd.toLocaleString()} in bridge inflows excluded — agent is cross-chain. Base-only scan may significantly understate total revenue.` });
  }

  // DEX-heavy agents
  if (dex_rate > 0.5 && s.dex_excluded_usd > 10_000) {
    flags.push({ severity: "medium", code: "DEX_DOMINANT", message: `${(dex_rate * 100).toFixed(0)}% of activity is DEX swaps. Revenue figure may be understated if any swap fees or LP rewards are miscategorised as swaps.` });
  }

  // Single wallet only (common for small agents — low confidence)
  if (w.analyzed === 1) {
    flags.push({ severity: "low", code: "SINGLE_WALLET", message: "Only one wallet scanned. Multi-wallet agents may have significant activity in undeclared wallets." });
  }

  // Very high revenue-per-tx (anomalous single tx dominating)
  if (revenue_per_tx > 50_000 && s.total_txs_scanned < 10) {
    flags.push({ severity: "medium", code: "SINGLE_TX_DOMINANCE", message: `Revenue dominated by ${s.total_txs_scanned} transaction(s) at $${revenue_per_tx.toFixed(0)}/tx avg — one large inflow may have escaped quarantine.` });
  }

  // No wallets at all
  if (w.declared === 0) {
    flags.push({ severity: "high", code: "NO_WALLETS_DECLARED", message: "No wallets declared. Agent has no financial attribution — revenue figure is zero by definition." });
  }

  // Capital injections that passed (low prior interactions but stablecoin, under threshold)
  const passedSmallCapital = audit.transactions.operating_revenue.filter(
    (tx) => tx.amount_usd >= 1000 && tx.amount_usd < 10000
  );
  if (passedSmallCapital.length > 0) {
    const total = passedSmallCapital.reduce((s, tx) => s + tx.amount_usd, 0);
    flags.push({ severity: "low", code: "NEAR_THRESHOLD_INFLOWS", message: `${passedSmallCapital.length} inflow(s) totalling $${total.toFixed(0)} are $1k–$10k stablecoins that passed the capital injection check. Review if these are genuine recurring revenue.` });
  }

  return {
    metrics: { quarantine_rate, dex_rate, bridge_rate, wallet_coverage, revenue_per_tx },
    flags,
  };
}

// ── Concurrency helper ────────────────────────────────────────────────────────

async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slugs?: string[]; period?: string } = {};
  try { body = await req.json(); } catch { /* empty body = ok */ }

  const period = (VALID_PERIODS.includes(body.period as TimeRange) ? body.period : "30d") as TimeRange;

  // Determine slug list
  let slugs: string[] = body.slugs ?? [];

  if (slugs.length === 0) {
    // Default: AEON/Luca, Bankr, Virtuals + all others up to MAX_AGENTS
    const { agents } = await getRegistryAgents();
    slugs = agents.map((a) => toSlug(a.name)).slice(0, MAX_AGENTS);
  } else {
    slugs = slugs.slice(0, MAX_AGENTS);
  }

  // Run audits with concurrency limit
  const tasks = slugs.map((slug) => async (): Promise<AgentAuditResult> => {
    const agent = await getAgentBySlug(slug);
    if (!agent) return { ok: false, slug, error: "Agent not found" };

    const audit = await buildAgentBooksAudit(agent, period);
    if ("error" in audit) return { ok: false, slug, error: audit.error };

    const { metrics, flags } = analyzeAudit(audit);
    return { ok: true, audit, metrics, flags };
  });

  const results = await runConcurrent(tasks, CONCURRENCY);

  // Sort: ok results by revenue desc, then errors
  const sorted = results.sort((a, b) => {
    if (!a.ok && !b.ok) return 0;
    if (!a.ok) return 1;
    if (!b.ok) return -1;
    return b.audit.summary.operating_revenue_usd - a.audit.summary.operating_revenue_usd;
  });

  const highFlags    = sorted.flatMap((r) => r.ok ? r.flags.filter((f) => f.severity === "high").map((f) => ({ agent: r.audit.agent.name, ...f })) : []);
  const mediumFlags  = sorted.flatMap((r) => r.ok ? r.flags.filter((f) => f.severity === "medium").map((f) => ({ agent: r.audit.agent.name, ...f })) : []);

  return NextResponse.json({
    ok: true,
    period,
    agent_count: slugs.length,
    generated_at: new Date().toISOString(),
    summary: {
      total_gross_inflows:     sorted.filter((r) => r.ok).reduce((s, r) => s + (r.ok ? r.audit.summary.gross_inflow_usd : 0), 0),
      total_operating_revenue: sorted.filter((r) => r.ok).reduce((s, r) => s + (r.ok ? r.audit.summary.operating_revenue_usd : 0), 0),
      total_quarantined:       sorted.filter((r) => r.ok).reduce((s, r) => s + (r.ok ? r.audit.summary.quarantined_usd : 0), 0),
      high_risk_agents:        highFlags.map((f) => f.agent).filter((v, i, a) => a.indexOf(v) === i),
    },
    flags: { high: highFlags, medium: mediumFlags },
    results: sorted,
  });
}
