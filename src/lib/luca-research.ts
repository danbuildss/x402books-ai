// Luca Research Engine
//
// Phase 1 — Grok API: real-time research on X and the web for each agent
//   and the broader ecosystem. Gives Luca live context beyond on-chain data.
//
// Phase 2 — Claude: writes the State of the Agent Economy report using
//   both the x402Books financial data and the Grok research findings.
//
// If GROK_API_KEY is missing, Phase 1 is skipped.
// If ANTHROPIC_API_KEY is missing, falls back to a rules-based report.

import Anthropic from "@anthropic-ai/sdk";
import type { AgentGDP, AgentGDPEntry } from "./agent-gdp";

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

// ── Phase 1: Grok research ────────────────────────────────────────────────────

async function researchWithGrok(
  topAgents: AgentGDPEntry[],
  gdp: AgentGDP,
): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) return "";

  const agentNames = topAgents.map((a) => a.name).join(", ");
  const ecosystems = [...new Set(topAgents.map((a) => a.ecosystem))].join(", ");
  const model = process.env.GROK_MODEL ?? "grok-3";

  const systemPrompt = `You are a financial research analyst with real-time access to X (Twitter) and the web.
Your job is to find recent, factual context about autonomous AI agents operating on Base blockchain.
Return only confirmed facts. Include dates where available. Do not speculate.
Format: flowing prose. 3 to 5 paragraphs. No bullet points.`;

  const userPrompt = `Research the current state of the following autonomous AI agents and their ecosystems:

Agents to research: ${agentNames}
Ecosystems: ${ecosystems}

Find and report on (for the past 7 days):
1. Any notable announcements, launches, or milestones from these agents or their teams
2. Relevant X/Twitter posts or community discussions about these agents
3. Any news about the ${ecosystems} ecosystem(s) that could affect agent economics
4. Market context: is AI agent activity on Base growing or contracting?
5. Any notable partnerships, integrations, or protocol changes relevant to these agents

Be specific. Cite what you find. If something notable happened with a specific agent, name it and describe it.`;

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 900,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.error("[luca-research] Grok API error:", res.status, await res.text());
      return "";
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[luca-research] Grok fetch error:", err);
    return "";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Phase 2: Claude writes the report ─────────────────────────────────────────

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

  // Phase 1: research
  const researchContext = await researchWithGrok(gdp.top_agents, gdp);

  // Phase 2: write
  // LLM_API_KEY + LLM_BASE_URL allows routing through BANKR's LLM gateway
  // (or any Anthropic-compatible endpoint) instead of Anthropic directly.
  // LLM_MODEL sets the model; defaults to claude-sonnet-4-6.
  const anthropicKey = process.env.LLM_API_KEY ?? process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    const body = buildFallbackBody(gdp, label, unattributed, topAgentsText);
    const summary = `Agent GDP reached ${fmtUSD(gdp.total_revenue_usd)} in revenue across ${gdp.attributed_agents} attributed agents over the last 30 days.`;
    return { slug, title, subtitle, type, summary, body, agent_gdp_usd: gdp.total_revenue_usd, attributed_agents: gdp.attributed_agents, period_label: label };
  }

  const prompt = `You are Luca, the financial analyst for x402Books. You have two sources of intelligence:
1. On-chain financial data from x402Books (authoritative, confirmed)
2. Real-time research from Grok (contextual, use to add color where relevant)

You are writing the ${type} "State of the Agent Economy" report for ${label}.

── ON-CHAIN FINANCIAL DATA (x402Books, last 30 days) ──
Total Revenue: ${fmtUSD(gdp.total_revenue_usd)}
Total Expenses: ${fmtUSD(gdp.total_expenses_usd)}
Net Income: ${fmtUSD(gdp.total_net_income_usd)}
Attributed Agents: ${gdp.attributed_agents} of ${gdp.total_agents} indexed (${unattributed} unattributed)
Attributed Wallets: ${gdp.attributed_wallets}

Top Agents by Revenue:
${topAgentsText}

${researchContext ? `── REAL-TIME RESEARCH (Grok) ──\n${researchContext}\n\nUse this context to add real-world color to the report. Cross-reference with on-chain data. Prioritize on-chain numbers over any figures from external sources.\n` : ""}
── REPORT INSTRUCTIONS ──
Style: Bloomberg Intelligence analyst. Cold. Precise. Factual. No hype. No marketing language.
Write as Luca — an analyst who has read both the books and the news.

Structure (prose only — no headers, no bullets, no markdown):
1. Opening paragraph: Agent GDP figure, what it represents, attribution coverage context
2. Top performers: specific revenue/expense/net income for named agents${researchContext ? "; weave in relevant real-world context from the research" : ""}
3. Expense or treasury patterns visible in the on-chain data${researchContext ? "; any ecosystem news that explains or contextualizes the numbers" : ""}
4. Attribution gap: ${unattributed} of ${gdp.total_agents} agents are unattributed — what this means for the completeness of the data
5. Closing observation: one factual takeaway a financial reader would find useful

Format: Plain prose paragraphs, separated by blank lines. 5 to 7 paragraphs. No markdown, no headers, no bullets.

After the body, on a new line write exactly:
SUMMARY: [one sentence under 25 words capturing the key finding]`;

  const clientOptions: ConstructorParameters<typeof Anthropic>[0] = { apiKey: anthropicKey };
  if (process.env.LLM_BASE_URL) clientOptions.baseURL = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL ?? "claude-sonnet-4-6";

  const client = new Anthropic(clientOptions);
  const message = await client.messages.create({
    model,
    max_tokens: 1400,
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

// ── Fallback (no Anthropic key) ───────────────────────────────────────────────

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
