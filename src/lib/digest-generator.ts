// Weekly digest generator.
// Builds a structured summary for each active agent: momentum, anomalies, treasury snapshot.
// Output is plain text — suitable for email, Telegram, or in-app notification.

import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, getAgentBySlug } from "@/lib/agent-books";
import { getAgentBooksHistory } from "@/lib/agent-books-history";
import { computeMomentum } from "@/lib/agent-momentum";
import { getAnomaliesForAgent } from "@/lib/anomaly-detector";
import { classifySettlementPattern } from "@/lib/luca-classify";

export interface AgentDigestEntry {
  slug:       string;
  name:       string;
  momentum:   string;
  treasury:   string;
  anomalies:  string[];
  verdict:    string;
}

export interface WeeklyDigest {
  generated_at: string;
  period:       string;
  entries:      AgentDigestEntry[];
  skipped:      number;
}

export async function generateWeeklyDigest(): Promise<WeeklyDigest> {
  const { agents } = await getRegistryAgents();
  const entries: AgentDigestEntry[] = [];
  let skipped = 0;

  for (const agent of agents) {
    const slug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const books = await buildAgentBooks(agent, "7d");
      if (!books.attributed) { skipped++; continue; }

      const history = await getAgentBooksHistory(slug, 90);
      const momentum = computeMomentum(history, 7);

      const anomalies = await getAnomaliesForAgent(slug);
      const activeAnomalies = anomalies
        .filter((a) => a.severity === "high" || a.severity === "medium")
        .map((a) => a.description);

      const classification = classifySettlementPattern({
        totalInflow:  books.financials.gross_inflow_usd,
        totalOutflow: books.financials.expenses_usd,
        txCount:      books.financials.tx_count,
        categories:   [],
      });

      const momentumLine = momentum
        ? `Revenue ${momentum.revenue.direction} (${momentum.revenue.pct > 0 ? "+" : ""}${momentum.revenue.pct.toFixed(1)}%)`
        : "Insufficient history for momentum.";

      const treasuryBal = books.financials.treasury_balance_usd;
      const treasuryLine = treasuryBal != null
        ? `Treasury $${treasuryBal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : "Treasury unavailable.";

      entries.push({
        slug,
        name:      agent.name,
        momentum:  momentumLine,
        treasury:  treasuryLine,
        anomalies: activeAnomalies,
        verdict:   classification.verdict,
      });
    } catch {
      skipped++;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    period: "7d",
    entries,
    skipped,
  };
}

export function formatDigestText(digest: WeeklyDigest): string {
  const lines: string[] = [
    `Zetta Weekly Digest — ${new Date(digest.generated_at).toDateString()}`,
    `Period: last 7 days | Agents: ${digest.entries.length} active, ${digest.skipped} skipped`,
    "",
  ];

  for (const entry of digest.entries) {
    lines.push(`── ${entry.name} (${entry.slug})`);
    lines.push(`   ${entry.momentum}`);
    lines.push(`   ${entry.treasury}`);
    if (entry.anomalies.length > 0) {
      lines.push(`   ⚠ ${entry.anomalies.join(" | ")}`);
    }
    lines.push(`   ${entry.verdict}`);
    lines.push("");
  }

  return lines.join("\n");
}
