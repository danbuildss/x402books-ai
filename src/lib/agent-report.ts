import type { AgentEconomicSummary } from "./agent-events";

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
  const totalOutflow = s.totalInferenceSpend + s.providerSpend + s.apiCosts + s.walletOutflows;
  const totalInflow  = s.totalInferenceRevenue + s.walletInflows;

  const sections: ReportSection[] = [
    {
      title: "Inference Spend",
      value: usd(s.totalInferenceSpend),
      detail: s.totalInferenceSpend === 0
        ? "No inference purchases recorded."
        : "Includes direct inference purchases and fallback provider usage.",
    },
    {
      title: "Inference Revenue",
      value: usd(s.totalInferenceRevenue),
      detail: s.totalInferenceRevenue === 0
        ? "No inference sales recorded."
        : "Earned from marketplace calls and agent service revenue.",
    },
    {
      title: "Provider Usage",
      value: usd(s.providerSpend),
      detail: s.topProvider ? `Primary provider: ${s.topProvider}.` : "No provider activity recorded.",
    },
    {
      title: "Fallback Usage",
      value: usd(s.fallbackProviderSpend),
      detail: s.fallbackUsageCount > 0
        ? `Fallback used ${s.fallbackUsageCount} time${s.fallbackUsageCount === 1 ? "" : "s"}.`
        : "No fallback provider spend detected.",
    },
    {
      title: "API Cost",
      value: usd(s.apiCosts),
      detail: s.apiCosts === 0 ? "No external API costs recorded." : "External API usage.",
    },
    {
      title: "Wallet Flows",
      value: `+${usd(s.walletInflows)} / -${usd(s.walletOutflows)}`,
      detail: "Inflows and outflows not tied to inference or API activity.",
    },
    {
      title: "Net Agent Position",
      value: `${s.netAgentPosition >= 0 ? "+" : ""}${usd(s.netAgentPosition)}`,
      detail: s.netAgentPosition > 0.01
        ? "Agent earned more than it spent."
        : s.netAgentPosition < -0.01
        ? "Agent spent more than it earned."
        : "Activity roughly balanced.",
    },
  ];

  const netLabel: "positive" | "negative" | "neutral" =
    s.netAgentPosition > 0.01 ? "positive" :
    s.netAgentPosition < -0.01 ? "negative" : "neutral";

  const name = s.agentName ?? s.agentId;
  const summary = s.eventCount === 0
    ? `${name} has no recorded economic activity in the last ${s.periodDays} days.`
    : `${name} spent ${usd(totalOutflow)} and earned ${usd(totalInflow)} over ${s.periodDays} days. Net position: ${netLabel} (${s.netAgentPosition >= 0 ? "+" : ""}${usd(s.netAgentPosition)}).`;

  return { agentName: name, period, sections, verdict: s.lucaVerdict, netPositionLabel: netLabel, summary };
}
