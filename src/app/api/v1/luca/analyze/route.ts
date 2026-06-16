import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { getInferenceEvents, summarizeInferenceEvents } from "@/lib/inference-events";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import { classifySettlementPattern } from "@/lib/luca-classify";
import { buildLedgerScan } from "@/lib/ledger-service";
import { isValidWalletAddress } from "@/lib/ledger";
import type { Agent } from "@/app/registry/types";

export const dynamic = "force-dynamic";

// ── Slug helper ───────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Registry helpers ──────────────────────────────────────────────────────────

async function findAgentBySlug(slug: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    return agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return null;
  }
}

async function findAgentByWallet(wallet: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    const lower = wallet.toLowerCase();
    return agents.find((a) =>
      a.wallets.some((w) => w.address.toLowerCase() === lower) ||
      a.tokenAddress?.toLowerCase() === lower,
    ) ?? null;
  } catch {
    return null;
  }
}

// ── Health ratio (from profile page pattern) ──────────────────────────────────

const HEALTH_RATIO: Record<string, number> = {
  "Healthy": 0.72,
  "Stable":  0.95,
  "Watch":   1.35,
  "At Risk": 1.90,
};

// ── Agent-ID path (fast: registry + DB only, no wallet scan) ─────────────────

async function analyzeByAgentId(agentId: string) {
  const [agent, inferenceEvents, economicEvents] = await Promise.all([
    findAgentBySlug(agentId),
    getInferenceEvents(agentId, 30),
    getAgentEvents(agentId, 30),
  ]);

  if (!agent) {
    return NextResponse.json(
      { error: `Agent "${agentId}" not found in registry.` },
      { status: 404 },
    );
  }

  const inferenceSummary = inferenceEvents.length > 0
    ? summarizeInferenceEvents(agentId, inferenceEvents, 30)
    : null;

  const economicSummary = economicEvents.length > 0
    ? summarizeEvents(agentId, economicEvents, 30)
    : null;

  // Derive classification from registry health signal
  const score      = agent.financialActivityScore ?? 0;
  const isActive   = score >= 10;
  const ratio      = HEALTH_RATIO[agent.treasuryHealth ?? ""] ?? 1.0;
  const totalInflow  = isActive ? 100 : 0;
  const totalOutflow = totalInflow * ratio;

  const classification = classifySettlementPattern({
    totalInflow,
    totalOutflow,
    txCount:             isActive ? Math.max(10, score) : 0,
    categories:          [],
    walletRolesDeclared: agent.wallets.length > 0,
  });

  // Verdict: prefer economic summary verdict, fall back to settlement verdict, fall back to admin notes
  const verdict =
    economicSummary?.lucaVerdict ??
    (classification.signals.length > 0 ? classification.signals.join(" ") : null) ??
    agent.adminNotes ??
    `${agent.name} is indexed in the registry. No active economic data available.`;

  const walletsVerified = agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed";

  return NextResponse.json({
    source: "registry",
    data_quality: {
      treasury_live_scan: false,
      wallets_verified:   walletsVerified,
      inference_live:     inferenceEvents.length > 0,
      note: walletsVerified
        ? "Agent verified. Wallets confirmed via manifest."
        : "Treasury health derived from registry signals — not a live wallet scan. Use wallet mode for live data.",
    },
    agent: {
      name:      agent.name,
      symbol:    agent.symbol,
      slug:      agentId,
      ecosystem: agent.ecosystem,
      status:    agent.verificationStatus,
    },
    treasury: {
      health:  agent.treasuryHealth ?? "Pending",
      inflow:  economicSummary?.walletInflows ?? null,
      outflow: economicSummary?.walletOutflows ?? null,
      net:     economicSummary?.netAgentPosition ?? null,
    },
    activity: {
      score:   agent.financialActivityScore ?? null,
      pattern: classification.patterns[0] ?? "dormant",
      signals: classification.signals,
    },
    inference: inferenceSummary ? {
      spend_30d:    inferenceSummary.totalCostUsd,
      requests:     inferenceSummary.requestCount,
      top_provider: inferenceSummary.primaryProvider,
      avg_cost:     inferenceSummary.avgCostPerRequest,
      providers:    inferenceSummary.providersUsed,
    } : null,
    wallets: Array.from(
      new Map(agent.wallets.map((w) => [w.address.toLowerCase(), w])).values()
    ).map((w) => ({
      address:  w.address,
      role:     w.label,
      verified: walletsVerified,
    })),
    // Internal CRM fields — never include in API responses or client bundles.
    // These are stripped by toPublicAgent() before any data reaches the client.
    // financial_activity_score is surfaced here as a derived activity signal (auth-gated partner API only).
    // partnership_fit and outreach fields are strictly internal and must not appear in any response.
    scores: {
      financial_activity: agent.financialActivityScore ?? null,
    },
    verdict,
  });
}

// ── Wallet path (live scan via Alchemy) ───────────────────────────────────────

async function analyzeByWallet(wallet: string) {
  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const [scan, agent] = await Promise.all([
    buildLedgerScan({ wallet, range: "30d", persist: false }),
    findAgentByWallet(wallet),
  ]);

  const agentId = agent ? toSlug(agent.name) : null;

  const inferenceSummary = agentId
    ? await getInferenceEvents(agentId, 30).then((evs) =>
        evs.length > 0 ? summarizeInferenceEvents(agentId, evs, 30) : null,
      )
    : null;

  const classification = classifySettlementPattern({
    totalInflow:  scan.summary.totalIncome,
    totalOutflow: scan.summary.totalSpend,
    txCount:      scan.summary.transactionCount,
    categories:   [],
    walletRolesDeclared: (agent?.wallets.length ?? 0) > 0,
  });

  const verdict = classification.signals.length > 0
    ? classification.signals.join(" ")
    : scan.report.budgetStatus
      ? `Wallet is ${scan.report.budgetStatus.toLowerCase()}.`
      : "Insufficient activity to generate a verdict.";

  const agentVerified = agent?.verificationStatus === "Verified" || agent?.verificationStatus === "Luca Managed";

  return NextResponse.json({
    source: "wallet_scan",
    data_quality: {
      treasury_live_scan: true,
      wallets_verified:   agentVerified ?? false,
      inference_live:     inferenceSummary !== null,
      note: agent
        ? `Live scan complete. Wallet matched to ${agent.name} in registry (${agent.verificationStatus}).`
        : "Live scan complete. Wallet not matched to any indexed agent — ownership unconfirmed.",
    },
    agent: agent ? {
      name:      agent.name,
      symbol:    agent.symbol,
      slug:      agentId,
      ecosystem: agent.ecosystem,
      status:    agent.verificationStatus,
    } : null,
    treasury: {
      health:  agent?.treasuryHealth ?? scan.report.budgetStatus ?? "Unknown",
      inflow:  scan.summary.totalIncome,
      outflow: scan.summary.totalSpend,
      net:     scan.summary.netFlow,
    },
    activity: {
      score:   agent?.financialActivityScore ?? null,
      pattern: classification.patterns[0] ?? "dormant",
      signals: classification.signals,
    },
    inference: inferenceSummary ? {
      spend_30d:    inferenceSummary.totalCostUsd,
      requests:     inferenceSummary.requestCount,
      top_provider: inferenceSummary.primaryProvider,
      avg_cost:     inferenceSummary.avgCostPerRequest,
      providers:    inferenceSummary.providersUsed,
    } : null,
    wallets: agent
      ? Array.from(
          new Map(agent.wallets.map((w) => [w.address.toLowerCase(), w])).values()
        ).map((w) => ({ address: w.address, role: w.label, verified: agentVerified }))
      : [{ address: wallet, role: "unknown", verified: false }],
    // Internal CRM fields — never include in API responses or client bundles.
    // These are stripped by toPublicAgent() before any data reaches the client.
    // financial_activity_score is surfaced here as a derived activity signal (auth-gated partner API only).
    // partnership_fit and outreach fields are strictly internal and must not appear in any response.
    scores: {
      financial_activity: agent?.financialActivityScore ?? null,
    },
    verdict,
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

// POST /api/v1/luca/analyze
// Unified financial intelligence endpoint for partners (Venice, AEON, Surplus, etc.)
//
// Modes:
//   { "agent_id": "bankr" }  → fast registry + DB path (~200ms)
//   { "wallet": "0x..." }    → live wallet scan via Alchemy (~3-8s)
//
// Auth: Bearer <api_key> or X-API-Key header
export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const start = Date.now();

  let result: NextResponse;

  if (typeof body.agent_id === "string" && body.agent_id.trim()) {
    result = await analyzeByAgentId(body.agent_id.trim().toLowerCase());
  } else if (typeof body.wallet === "string" && body.wallet.trim()) {
    result = await analyzeByWallet(body.wallet.trim());
  } else {
    return NextResponse.json(
      { error: "Provide either agent_id (registry slug) or wallet (0x address)." },
      { status: 400 },
    );
  }

  auth.finish(result.status, Date.now() - start, "/api/v1/luca/analyze");
  return result;
}
