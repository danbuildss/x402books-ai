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
import { ProfileClient } from "./profile-client";
import { toSlug } from "./slug";

export const revalidate = 300; // 5 minutes — books are DB-cached for 4h, no need to ISR every 30s

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
  if (!agent) return { title: "Agent not found — x402Books Registry" };

  const desc = `${agent.name} — financial intelligence from x402Books. Revenue, expenses, and profitability tracked on Base.`;

  return {
    title: `${agent.name} (${agent.symbol}) — Agent Books · x402Books`,
    description: desc,
    openGraph: {
      title: `${agent.name} — Agent Books · x402Books`,
      description: desc,
      url: `https://www.x402books.xyz/registry/${slug}`,
      siteName: "x402Books AI",
    },
    twitter: {
      card: "summary",
      title: `${agent.name} (${agent.symbol}) — x402Books`,
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

  const [economics, inferenceActivity, toolDecisions, books, booksHistory] = await Promise.all([
    slug === "luca" ? getLucaEconomics() : Promise.resolve(undefined),
    getInferenceActivity(slug),
    getToolDecisions(slug),
    buildAgentBooks(agent, "30d").catch((): AgentBooks | AgentBooksUnattributed => ({
      agent: { slug, name: agent.name, ecosystem: agent.ecosystem },
      attributed: false,
      reason: "Books temporarily unavailable.",
    })),
    getAgentBooksHistory(slug, 90).catch((): AgentBooksSnapshot[] => []),
  ]);

  // Classification only derived from real on-chain data — never synthetic
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
    />
  );
}
