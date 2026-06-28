import type { ResearchReport } from "./research-db";

export const INAUGURAL_REPORT: ResearchReport = {
  id: "inaugural-2026-q2",
  slug: "state-of-agent-finance-q2-2026",
  title: "State of Agent Finance: Q2 2026",
  subtitle: "The inaugural Zetta economic report on autonomous agent revenue, treasury activity, and financial identity.",
  type: "quarterly",
  period_label: "Q2 2026",
  published_at: "2026-06-28T00:00:00.000Z",
  agent_gdp_usd: null,
  attributed_agents: null,
  summary: "Autonomous agents are generating real revenue. For the first time, Zetta has enough attributed agents with declared wallet manifests to produce a baseline financial picture of the agent economy. This inaugural report documents what we can measure, what we cannot, and why financial identity for agents matters now.",
  body: `The agent economy is real. It is generating revenue, incurring expenses, and building treasury positions — and most of it is invisible.

Zetta was built to fix that. This report is the first formal snapshot of what we can see: agents with declared wallet manifests, verified on-chain activity, and attributed financial records.

What We Can Measure

The agents indexed in Zetta's registry — those with submitted wallet manifests — represent the leading edge of financially-transparent autonomous systems. These are teams that have declared their treasury wallets, fee recipients, and operator addresses. For these agents, Zetta tracks inbound revenue (protocol fees, service fees, x402 payments), outbound expenses (gas, inference costs, operational spend), and net position on a rolling 30-day basis.

The attribution rate — agents with declared manifests as a share of all indexed agents — is the metric we watch most closely. A higher attribution rate means more of the agent economy is auditable. A lower rate means more revenue is flowing through systems with no public financial identity.

What We Cannot Measure (Yet)

The majority of autonomous agents have not submitted wallet manifests. Their on-chain activity is visible but unattributed — we can see the transactions, but we cannot confidently associate them with a named agent, ecosystem, or team. This is the attribution gap.

The attribution gap is not a data problem. It is an identity problem. Agents without manifests exist in a financial blind spot: their revenue cannot be classified, their treasury health cannot be assessed, and their financial credibility cannot be established.

The Ecosystems We Track

Zetta currently tracks agents across four primary ecosystems: Base, BANKR, Virtuals, and AEON. Each ecosystem has different revenue patterns, different spend profiles, and different levels of manifest adoption.

BANKR agents, by design, have the highest manifest adoption rate — the ecosystem's architecture makes wallet disclosure a natural part of agent deployment. Virtuals agents tend toward higher raw revenue but lower attribution rates, reflecting the ecosystem's focus on token-driven models over fee-based revenue. AEON agents show the clearest infrastructure cost profiles, with inference spend and x402 payment activity well-represented in their books.

What Good Financial Identity Looks Like

An agent with strong financial identity has: a declared manifest with treasury, fee, and operator wallets; consistent inbound revenue over multiple periods; expense patterns that reflect real operational activity; and a healthy net income ratio. These agents earn a Verified or Claimed status in the Zetta registry and appear in the leaderboard with attributed books.

What Comes Next

Zetta will publish weekly snapshots of the attributed agent economy, monthly summaries of ecosystem-level trends, and quarterly reports like this one. As more agents submit manifests, the picture will sharpen. The inaugural State of Agent Finance is the baseline. Every subsequent report will have more signal.

If your agent is not yet in the registry with a declared manifest, the process takes minutes. Submit at zettaai.co/registry. Your agent's financial identity starts there.`,
};
