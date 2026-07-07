import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { Agent } from "@/app/registry/types";
import { toPublicAgent } from "@/app/registry/types";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import { getInferenceEvents, summarizeInferenceEvents } from "@/lib/inference-events";
import type { InferenceSummary } from "@/lib/inference-events";
import { getToolDecisions } from "@/lib/tool-decisions";
import type { ToolDecisionEvent } from "@/lib/tool-decisions";
import { classifySettlementPattern } from "@/lib/luca-classify";
import type { SettlementClassification } from "@/lib/luca-classify";
import { buildAgentBooks } from "@/lib/agent-books";
import type { AgentBooks, AgentBooksUnattributed } from "@/lib/agent-books";
import { getAgentBooksHistory } from "@/lib/agent-books-history";
import type { AgentBooksSnapshot } from "@/lib/agent-books-history";
import { getAnomaliesForAgent } from "@/lib/anomaly-detector";
import type { Anomaly } from "@/lib/anomaly-detector";
import { scoreAgent } from "@/lib/verification-scorer";
import type { VerificationScore } from "@/lib/verification-scorer";
import { ProfileClient } from "./profile-client";
import { toSlug } from "./slug";

export const revalidate = 300;

async function getAgent(slug: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    return agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return AGENTS.find((a) => toSlug(a.name) === slug) ?? null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) return { title: "Agent not found — Zetta Registry" };

  const desc = `${agent.name} — financial intelligence from Zetta. Revenue, expenses, and profitability tracked on Base.`;

  return {
    title: `${agent.name} (${agent.symbol}) — Agent Books · Zetta`,
    description: desc,
    openGraph: {
      title: `${agent.name} — Agent Books · Zetta`,
      description: desc,
      url: `https://www.zettaai.co/registry/${slug}`,
      siteName: "Zetta",
    },
    twitter: {
      card: "summary",
      title: `${agent.name} (${agent.symbol}) — Zetta`,
      description: desc,
    },
  };
}

async function getLucaEconomics(): Promise<AgentEconomicSummary | undefined> {
  try {
    const events = await getAgentEvents("luca", 7);
    return summarizeEvents("luca", events, 7);
  } catch {
    return undefined;
  }
}

async function getInferenceActivity(agentId: string): Promise<InferenceSummary | undefined> {
  try {
    const events = await getInferenceEvents(agentId, 30);
    if (events.length === 0) return undefined;
    return summarizeInferenceEvents(agentId, events, 30);
  } catch {
    return undefined;
  }
}

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const [economics, inferenceActivity, toolDecisions, books, booksHistory, anomalies] = await Promise.all([
    slug === "luca" ? getLucaEconomics() : Promise.resolve(undefined),
    getInferenceActivity(slug),
    getToolDecisions(slug),
    buildAgentBooks(agent, "30d").catch((): AgentBooks | AgentBooksUnattributed => ({
      agent: { slug, name: agent.name, ecosystem: agent.ecosystem },
      attributed: false,
      reason: "Books temporarily unavailable.",
    })),
    getAgentBooksHistory(slug, 90).catch((): AgentBooksSnapshot[] => []),
    getAnomaliesForAgent(slug).catch((): Anomaly[] => []),
  ]);

  const classification = books.attributed
    ? classifySettlementPattern({
        totalInflow:         books.financials.revenue_usd,
        totalOutflow:        books.financials.expenses_usd,
        txCount:             books.financials.tx_count,
        categories:          books.breakdown.expenses_by_category.map((e) => ({
          category: e.category as import("@/lib/ledger").LedgerCategory,
          label:    e.label,
          count:    e.tx_count,
          totalUsdc: e.total_usd,
        })),
        walletRolesDeclared: books.wallets.declared > 0,
      })
    : undefined;

  const verificationScore: VerificationScore = scoreAgent(
    agent,
    books.attributed,
    books.attributed ? books.financials.tx_count : 0,
  );

  return (
    <ProfileClient
      agent={agent}
      slug={slug}
      economics={economics}
      inferenceActivity={inferenceActivity}
      classification={classification}
      toolDecisions={toolDecisions}
      books={books}
      booksHistory={booksHistory}
      anomalies={anomalies}
      verificationScore={verificationScore}
    />
  );
}
