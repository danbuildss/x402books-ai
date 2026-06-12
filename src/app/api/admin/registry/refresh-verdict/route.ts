import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";
import { classifySettlementPattern } from "@/lib/luca-classify";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import { getInferenceEvents, summarizeInferenceEvents } from "@/lib/inference-events";
import type { Agent } from "@/app/registry/types";
import type { SettlementClassification } from "@/lib/luca-classify";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import type { InferenceSummary } from "@/lib/inference-events";
import { internalAuth as authOk } from "@/lib/internal-auth";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const HEALTH_RATIO: Record<string, number> = {
  Healthy:  0.72,
  Stable:   0.95,
  Watch:    1.35,
  "At Risk": 1.90,
};

function buildVerdict(
  agent: Agent,
  classification: SettlementClassification,
  economics: AgentEconomicSummary | null,
  inference: InferenceSummary | null,
): string {
  const parts: string[] = [];

  // Role intro — keep first sentence of existing notes if it reads like a description
  const firstNote = agent.adminNotes?.split(".")[0]?.trim();
  if (firstNote && firstNote.length > 10 && firstNote.length < 120) {
    parts.push(firstNote + ".");
  }

  // Treasury health
  const health = agent.treasuryHealth;
  if (health && health !== "Pending") {
    const healthMap: Record<string, string> = {
      Healthy:  "Treasury healthy.",
      Stable:   "Treasury stable.",
      Watch:    "Treasury under watch — elevated outflow ratio.",
      "At Risk": "Treasury at risk — outflows significantly exceed inflows.",
    };
    if (healthMap[health]) parts.push(healthMap[health]);
  }

  // Settlement patterns
  const patterns = classification.patterns;
  if (patterns.includes("stable_treasury")) parts.push("Settlement activity balanced.");
  if (patterns.includes("revenue_generating")) parts.push("Revenue-generating activity confirmed.");
  if (patterns.includes("heavy_outbound_settlement")) parts.push("High outbound settlement volume.");
  if (patterns.includes("high_spend_low_revenue")) parts.push("Spend significantly exceeds recorded revenue — monitor runway.");
  if (patterns.includes("recurring_flow_detected")) parts.push("Recurring flow patterns detected — consistent operational cadence.");
  if (patterns.includes("high_internal_transfer")) parts.push("High internal transfer ratio.");
  if (patterns.includes("unknown_counterparty_dominant")) parts.push("Majority of flows to unclassified counterparties.");
  if (patterns.includes("dormant")) parts.push("No recent on-chain activity detected.");

  // Economic data if available
  if (economics && economics.walletInflows > 0) {
    parts.push(`Net position: ${economics.netAgentPosition >= 0 ? "+" : ""}$${economics.netAgentPosition.toFixed(2)} over ${economics.periodDays}d.`);
  }

  // Wallet status
  const walletCount = (agent.wallets ?? []).length;
  const status = agent.verificationStatus;
  if (status === "Verified" || status === "Luca Managed") {
    parts.push(`${walletCount} wallet${walletCount !== 1 ? "s" : ""} verified.`);
  } else if (status === "Wallets Declared") {
    parts.push(`${walletCount} wallet${walletCount !== 1 ? "s" : ""} declared via repo manifest — verification pending.`);
  } else if (walletCount > 0) {
    parts.push(`${walletCount} candidate wallet${walletCount !== 1 ? "s" : ""} from public data — declaration recommended.`);
  } else {
    parts.push("No wallets declared. Submit a wallet manifest to unlock full classification.");
  }

  // Inference activity
  if (inference && inference.requestCount > 0) {
    parts.push(`Inference activity: ${inference.requestCount} request${inference.requestCount !== 1 ? "s" : ""} in 30d via ${inference.primaryProvider ?? "unknown provider"}.`);
  }

  // Financial activity score
  const score = agent.financialActivityScore;
  if (score !== null) {
    const label = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
    parts.push(`${label} financial activity — ${score}/100.`);
  }

  // Partnership fit
  const fit = agent.partnershipFitScore;
  if (fit !== null && fit >= 80) {
    parts.push(`Strong partnership fit score: ${fit}/100.`);
  }

  return parts.length > 0
    ? parts.join(" ")
    : `${agent.name} is indexed in the registry. No financial data available for verdict generation.`;
}

// POST /api/admin/registry/refresh-verdict
// Body: { agent_id: string }   (slug, e.g. "aeon")
// Generates a fresh Luca verdict from live registry + DB data and writes it
// back to admin_notes + last_checked in registry_agents.
export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  let body: { agent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const slug = body.agent_id?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ ok: false, error: "agent_id is required" }, { status: 400 });
  }

  // Find agent
  let agent: Agent | null = null;
  try {
    const { agents } = await getRegistryAgents();
    agent = agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load registry" }, { status: 500 });
  }
  if (!agent) {
    return NextResponse.json({ ok: false, error: `Agent "${slug}" not found` }, { status: 404 });
  }

  // Fetch economic and inference data in parallel
  const [economicEvents, inferenceEvents] = await Promise.all([
    getAgentEvents(slug, 30).catch(() => []),
    getInferenceEvents(slug, 30).catch(() => []),
  ]);

  const economics = economicEvents.length > 0 ? summarizeEvents(slug, economicEvents, 30) : null;
  const inference = inferenceEvents.length > 0 ? summarizeInferenceEvents(slug, inferenceEvents, 30) : null;

  // Derive classification
  const score       = agent.financialActivityScore ?? 0;
  const isActive    = score >= 10;
  const ratio       = HEALTH_RATIO[agent.treasuryHealth ?? ""] ?? 1.0;
  const totalInflow = isActive ? 100 : 0;

  const classification = classifySettlementPattern({
    totalInflow,
    totalOutflow:        totalInflow * ratio,
    txCount:             isActive ? Math.max(10, score) : 0,
    categories:          [],
    walletRolesDeclared: (agent.wallets ?? []).length > 0,
  });

  const verdict = buildVerdict(agent, classification, economics, inference);
  const today   = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Write back to DB
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("registry_agents")
    .update({ admin_notes: verdict, last_checked: today })
    .eq("name", agent.name);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, agent: agent.name, verdict });
}
