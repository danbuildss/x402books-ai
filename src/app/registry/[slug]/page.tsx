import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { Agent } from "@/app/registry/types";
import type { Health } from "@/app/registry/types";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import { getInferenceEvents, summarizeInferenceEvents } from "@/lib/inference-events";
import type { InferenceSummary } from "@/lib/inference-events";
import { getToolDecisions } from "@/lib/tool-decisions";
import type { ToolDecisionEvent } from "@/lib/tool-decisions";
import { classifySettlementPattern } from "@/lib/luca-classify";
import type { SettlementClassification } from "@/lib/luca-classify";
import { ProfileClient } from "./profile-client";
import { toSlug } from "./slug";

export const revalidate = 30;

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

  const health = agent.treasuryHealth ?? "Pending";
  const score = agent.financialActivityScore;
  const desc = agent.adminNotes
    ? `${agent.adminNotes.slice(0, 120)}…`
    : `${agent.name} agent profile — treasury health: ${health}. Tracked by x402Books AI.`;

  return {
    title: `${agent.name} (${agent.symbol}) — x402Books Registry`,
    description: desc,
    openGraph: {
      title: `${agent.name} — x402Books Agent Profile`,
      description: desc,
      url: `https://www.x402books.xyz/registry/${slug}`,
      siteName: "x402Books AI",
    },
    twitter: {
      card: "summary",
      title: `${agent.name} (${agent.symbol}) — x402Books`,
      description: score
        ? `Financial Activity Score: ${score}/100 · Treasury: ${health}`
        : `Treasury: ${health} · Tracked by x402Books AI`,
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

const HEALTH_RATIO: Partial<Record<Health, number>> = {
  "Healthy":  0.72,
  "Stable":   0.95,
  "Watch":    1.35,
  "At Risk":  1.90,
};

function deriveClassification(agent: Agent): SettlementClassification {
  const score      = agent.financialActivityScore ?? 0;
  const isActive   = score >= 10;
  const ratio      = HEALTH_RATIO[agent.treasuryHealth] ?? 1.0;
  const totalInflow  = isActive ? 100 : 0;
  const totalOutflow = totalInflow * ratio;

  return classifySettlementPattern({
    totalInflow,
    totalOutflow,
    txCount:             isActive ? Math.max(10, score) : 0,
    categories:          [],
    walletRolesDeclared: (agent.wallets ?? []).length > 0,
  });
}

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const economics         = slug === "luca" ? await getLucaEconomics() : undefined;
  const inferenceActivity = await getInferenceActivity(slug);
  const classification    = deriveClassification(agent);
  const toolDecisions     = await getToolDecisions(slug);

  return <ProfileClient agent={agent} slug={slug} economics={economics} inferenceActivity={inferenceActivity} classification={classification} toolDecisions={toolDecisions} />;
}
