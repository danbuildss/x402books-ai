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

// POST /api/admin/registry/refresh-all-verdicts
// Called by Luca (on Hermes) on a daily schedule.
// Loops all agents with declared wallets, recomputes verdict, writes back to Supabase.
// Body: { dry_run?: boolean }  — dry_run=true returns verdicts without writing

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildVerdict(
  agent: Agent,
  classification: SettlementClassification,
  economics: AgentEconomicSummary | null,
  inference: InferenceSummary | null,
): string {
  const parts: string[] = [];

  const firstNote = agent.adminNotes?.split(".")[0]?.trim();
  if (firstNote && firstNote.length > 10 && firstNote.length < 120) {
    parts.push(firstNote + ".");
  }

  const health = agent.treasuryHealth;
  if (health && health !== "Pending") {
    const healthMap: Record<string, string> = {
      Active:     "Treasury activity detected.",
      Stable:     "Treasury stable.",
      Unverified: "Treasury activity unverified — elevated outflow ratio.",
      Inactive:   "No treasury activity detected — outflows significantly exceed inflows.",
    };
    if (healthMap[health]) parts.push(healthMap[health]);
  }

  const patterns = classification.patterns;
  if (patterns.includes("stable_treasury"))             parts.push("Settlement activity balanced.");
  if (patterns.includes("revenue_generating"))          parts.push("Revenue-generating activity confirmed.");
  if (patterns.includes("heavy_outbound_settlement"))   parts.push("High outbound settlement volume.");
  if (patterns.includes("high_spend_low_revenue"))      parts.push("Spend significantly exceeds recorded revenue — monitor runway.");
  if (patterns.includes("recurring_flow_detected"))     parts.push("Recurring flow patterns detected — consistent operational cadence.");
  if (patterns.includes("high_internal_transfer"))      parts.push("High internal transfer ratio.");
  if (patterns.includes("unknown_counterparty_dominant")) parts.push("Majority of flows to unclassified counterparties.");
  if (patterns.includes("dormant"))                     parts.push("No recent on-chain activity detected.");

  if (economics && economics.walletInflows > 0) {
    parts.push(`Net position: ${economics.netAgentPosition >= 0 ? "+" : ""}$${economics.netAgentPosition.toFixed(2)} over ${economics.periodDays}d.`);
  }

  const walletCount = (agent.wallets ?? []).length;
  const status = agent.verificationStatus;
  if (status === "Verified" || status === "Luca Managed") {
    parts.push(`${walletCount} wallet${walletCount !== 1 ? "s" : ""} verified.`);
  } else if (status === "Wallets Declared") {
    parts.push(`${walletCount} wallet${walletCount !== 1 ? "s" : ""} declared via repo manifest — verification pending.`);
  } else if (walletCount > 0) {
    parts.push(`${walletCount} candidate wallet${walletCount !== 1 ? "s" : ""} from public data — declaration recommended.`);
  }

  if (inference && inference.requestCount > 0) {
    parts.push(`Inference activity: ${inference.requestCount} request${inference.requestCount !== 1 ? "s" : ""} in 30d via ${inference.primaryProvider ?? "unknown provider"}.`);
  }

  return parts.length > 0
    ? parts.join(" ")
    : `${agent.name} is indexed in the registry. No financial data available for verdict generation.`;
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  let body: { dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* no body is fine */ }
  const dryRun = body.dry_run === true;

  const { agents } = await getRegistryAgents();

  // Only agents with at least one declared wallet
  const eligible = agents.filter((a) => (a.wallets ?? []).length > 0);

  const sb = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 7);

  const results: { name: string; verdict: string; ok: boolean; error?: string }[] = [];

  for (const agent of eligible) {
    const slug = toSlug(agent.name);
    try {
      const [economicEvents, inferenceEvents] = await Promise.all([
        getAgentEvents(slug, 30).catch(() => []),
        getInferenceEvents(slug, 30).catch(() => []),
      ]);

      const economics = economicEvents.length > 0 ? summarizeEvents(slug, economicEvents, 30) : null;
      const inference = inferenceEvents.length > 0 ? summarizeInferenceEvents(slug, inferenceEvents, 30) : null;

      const classification = classifySettlementPattern({
        totalInflow:         economics ? economics.walletInflows  : 0,
        totalOutflow:        economics ? economics.walletOutflows : 0,
        txCount:             economics ? economicEvents.length    : 0,
        categories:          [],
        walletRolesDeclared: true,
      });

      const verdict = buildVerdict(agent, classification, economics, inference);

      if (!dryRun) {
        const { error } = await sb
          .from("registry_agents")
          .update({ admin_notes: verdict, last_checked: today })
          .eq("name", agent.name);

        if (error) {
          results.push({ name: agent.name, verdict, ok: false, error: error.message });
          continue;
        }
      }

      results.push({ name: agent.name, verdict, ok: true });
    } catch (err) {
      results.push({ name: agent.name, verdict: "", ok: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed    = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    total_eligible: eligible.length,
    succeeded,
    failed,
    results,
    ran_at: new Date().toISOString(),
  });
}
