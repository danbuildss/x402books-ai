import Anthropic from "@anthropic-ai/sdk";
import type { AgentGDP } from "./agent-gdp";

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function periodLabel(type: "weekly" | "monthly" | "quarterly"): string {
  const d = new Date();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();
  if (type === "weekly") {
    const week = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return `Week of ${week}, ${year}`;
  }
  if (type === "monthly") return `${month} ${year}`;
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${year}`;
}

function reportSlug(type: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `state-of-agent-economy-${type}-${date}`;
}

export type GeneratedReport = {
  slug: string;
  title: string;
  subtitle: string;
  type: "weekly" | "monthly" | "quarterly";
  summary: string;
  body: string;
  agent_gdp_usd: number;
  attributed_agents: number;
  period_label: string;
};

export async function generateEconomyReport(
  gdp: AgentGDP,
  type: "weekly" | "monthly" | "quarterly" = "weekly",
): Promise<GeneratedReport> {
  const label = periodLabel(type);
  const slug = reportSlug(type);
  const title = `State of the Agent Economy — ${label}`;
  const subtitle = `${type.charAt(0).toUpperCase() + type.slice(1)} financial intelligence from Luca`;
  const unattributed = gdp.total_agents - gdp.attributed_agents;

  const topAgentsText = gdp.top_agents.length > 0
    ? gdp.top_agents
        .map(
          (a, i) =>
            `${i + 1}. ${a.name} (${a.ecosystem}): Revenue ${fmtUSD(a.revenue_usd)}, Expenses ${fmtUSD(a.expenses_usd)}, Net Income ${a.net_income_usd >= 0 ? "+" : ""}${fmtUSD(a.net_income_usd)}, ${a.tx_count} transactions`,
        )
        .join("\n")
    : "No agents with declared wallet manifests yet.";

  const prompt = `You are Luca, the financial analyst for x402Books. x402Books tracks revenue, expenses, net income, and treasury activity across autonomous AI agents on Base.

You are writing the ${type} "State of the Agent Economy" report for ${label}.

Agent Economy Data (last 30 days):
- Total Revenue: ${fmtUSD(gdp.total_revenue_usd)}
- Total Expenses: ${fmtUSD(gdp.total_expenses_usd)}
- Net Income: ${fmtUSD(gdp.total_net_income_usd)}
- Attributed Agents: ${gdp.attributed_agents} (of ${gdp.total_agents} indexed; ${unattributed} unattributed)
- Attributed Wallets: ${gdp.attributed_wallets}

Top Agents by Revenue:
${topAgentsText}

Write a ${type} financial intelligence report. Style: Bloomberg Intelligence analyst. Cold. Precise. Data-driven. No hype. No marketing language. No speculation beyond what the data supports. Write as Luca — an analyst, not an assistant.

Structure (prose only, no headers, no bullets, no markdown):
1. Opening paragraph: Agent GDP figure, what it represents, brief context on attribution coverage
2. Top performers: specific revenue/expense/net income figures for named agents
3. Expense or treasury patterns visible in the data (if the numbers support it)
4. The attribution gap: ${unattributed} of ${gdp.total_agents} agents are unattributed — what this means for completeness of the data
5. One closing observation: a single factual takeaway a financial reader would find useful

Format: Plain prose paragraphs, separated by blank lines. 4 to 6 paragraphs total. No markdown, no headers, no bullets.

After the body, on a new line write exactly:
SUMMARY: [one sentence under 25 words summarizing the key finding]`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const body = buildFallbackBody(gdp, label, unattributed, topAgentsText);
    const summary = `Agent GDP reached ${fmtUSD(gdp.total_revenue_usd)} in revenue across ${gdp.attributed_agents} attributed agents over the last 30 days.`;
    return { slug, title, subtitle, type, summary, body, agent_gdp_usd: gdp.total_revenue_usd, attributed_agents: gdp.attributed_agents, period_label: label };
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  const summaryMatch = raw.match(/\nSUMMARY:\s*(.+)$/);
  const summary = summaryMatch
    ? summaryMatch[1].trim()
    : `Agent GDP reached ${fmtUSD(gdp.total_revenue_usd)} in revenue across ${gdp.attributed_agents} attributed agents.`;
  const body = summaryMatch ? raw.slice(0, summaryMatch.index).trim() : raw;

  return {
    slug,
    title,
    subtitle,
    type,
    summary,
    body,
    agent_gdp_usd: gdp.total_revenue_usd,
    attributed_agents: gdp.attributed_agents,
    period_label: label,
  };
}

function buildFallbackBody(
  gdp: AgentGDP,
  label: string,
  unattributed: number,
  topAgentsText: string,
): string {
  const paragraphs: string[] = [];

  paragraphs.push(
    `Agent GDP for ${label} totals ${fmtUSD(gdp.total_revenue_usd)} in attributed revenue across ${gdp.attributed_agents} agents with declared wallet manifests on Base. Total attributed expenses reached ${fmtUSD(gdp.total_expenses_usd)}, producing a net income of ${fmtUSD(gdp.total_net_income_usd)} across the attributed agent economy. These figures represent confirmed on-chain activity only.`,
  );

  if (gdp.top_agents.length > 0) {
    const top = gdp.top_agents[0];
    const second = gdp.top_agents[1];
    let para = `${top.name} leads by revenue at ${fmtUSD(top.revenue_usd)}, with ${top.tx_count} transactions over the period. Net income is ${top.net_income_usd >= 0 ? `positive at +${fmtUSD(top.net_income_usd)}` : `negative at ${fmtUSD(top.net_income_usd)}`}.`;
    if (second) {
      para += ` ${second.name} follows at ${fmtUSD(second.revenue_usd)} revenue and ${fmtUSD(second.expenses_usd)} expenses.`;
    }
    paragraphs.push(para);
  } else {
    paragraphs.push(topAgentsText);
  }

  paragraphs.push(
    `${unattributed} of ${gdp.total_agents} indexed agents remain unattributed — no declared wallet manifest on file. These agents are excluded from all financial figures. Agent GDP expands as attribution coverage improves. Operators can submit a wallet manifest at x402books.xyz/registry to be included in future reports.`,
  );

  return paragraphs.join("\n\n");
}
