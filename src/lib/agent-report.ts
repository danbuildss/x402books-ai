import type { AgentEconomicSummary } from "./agent-events";

// ── Plain-language report generator ──────────────────────────────────────────
// No AI call — pure aggregation + template logic.
// Fast, deterministic, cheap to run.

export interface AgentReport {
  agentName: string;
  period: string;
  sections: ReportSection[];
  verdict: string;
  netPositionLabel: "positive" | "negative" | "neutral";
  summary: string;
}

export interface ReportSection {
  title: string;
  value: string;
  detail?: string;
}

const usd = (n: number) => `$${n.toFixed(2)}`;

export function generateAgentReport(s: AgentEconomicSummary): AgentReport {
  const period = `Last ${s.periodDays} day${s.periodDays === 1 ? "" : "s"}`;
  const sections: ReportSection[] = [];

  // Inference Spend
  sections.push({
    title: "Inference Spend",
    value: usd(s.inferenceCost),
    detail: s.inferenceCost === 0
      ? "No inference purchases recorded."
      : `Includes direct inference purchases and fallback provider usage.`,
  });

  // Inference Revenue
  sections.push({
    title: "Inference Revenue",
    value: usd(s.inferenceRevenue),
    detail: s.inferenceRevenue === 0
      ? "No inference sales recorded."
      : `Earned from marketplace calls and agent service revenue.`,
  });

  // Provider Usage
  sections.push({
    title: "Provider Usage",
    value: usd(s.providerSpend),
    detail: s.topProvider
      ? `Primary provider: ${s.topProvider}.`
      : "No provider activity recorded.",
  });

  // Fallback Usage
  const fallbackCost = s.inferenceCost > 0 && s.providerSpend > 0
    ? round(s.inferenceCost - s.providerSpend)
    : 0;
  sections.push({
    title: "Fallback Usage",
    value: usd(Math.max(0, fallbackCost)),
    detail: fallbackCost > 0
      ? "Fallback provider was used — primary provider may have been unavailable or rate-limited."
      : "No fallback provider spend detected.",
  });

  // API Cost
  sections.push({
    title: "API Cost",
    value: usd(s.apiCost),
    detail: s.apiCost === 0
      ? "No external API costs recorded."
      : "External API usage (data, tools, integrations).",
  });

  // Net Agent Position
  const netLabel =
    s.netPosition > 0.01 ? "positive" :
    s.netPosition < -0.01 ? "negative" : "neutral";

  sections.push({
    title: "Net Agent Position",
    value: `${s.netPosition >= 0 ? "+" : ""}${usd(s.netPosition)}`,
    detail: netLabel === "positive"
      ? "Agent earned more than it spent."
      : netLabel === "negative"
      ? "Agent spent more than it earned."
      : "Agent activity roughly balanced.",
  });

  // Verdict
  const verdict = buildVerdict(s, netLabel);

  // One-line summary
  const summary = buildSummary(s, netLabel);

  return { agentName: s.agentName, period, sections, verdict, netPositionLabel: netLabel, summary };
}

function buildSummary(
  s: AgentEconomicSummary,
  netLabel: "positive" | "negative" | "neutral",
): string {
  if (s.eventCount === 0) {
    return `${s.agentName} has no recorded economic activity in the last ${s.periodDays} days.`;
  }

  const spendPart = s.totalOutflow > 0
    ? `spent ${usd(s.totalOutflow)} on inference and operations`
    : "recorded no outflow";

  const earnPart = s.totalInflow > 0
    ? `earned ${usd(s.totalInflow)} from marketplace calls`
    : "recorded no revenue";

  const netPart = netLabel === "positive"
    ? `Net position: positive (+${usd(s.netPosition)}).`
    : netLabel === "negative"
    ? `Net position: negative (${usd(s.netPosition)}).`
    : "Net position: balanced.";

  return `${s.agentName} ${spendPart} and ${earnPart} this period. ${netPart}`;
}

function buildVerdict(
  s: AgentEconomicSummary,
  netLabel: "positive" | "negative" | "neutral",
): string {
  if (s.eventCount === 0) {
    return "No economic activity detected. Agent may be dormant or not yet connected to event tracking.";
  }

  const costCenterNote = s.primaryCostCenter
    ? `Primary cost center: ${s.primaryCostCenter}.`
    : "";

  const sustainability =
    netLabel === "positive" ? "operationally active, financially sustainable." :
    netLabel === "negative" ? "operationally active, running at a deficit — monitor closely." :
    "operationally active, financially balanced.";

  const providerNote = s.topProvider
    ? ` Top provider: ${s.topProvider}.`
    : "";

  return `${costCenterNote}${providerNote} Verdict: ${sustainability}`.trim();
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
