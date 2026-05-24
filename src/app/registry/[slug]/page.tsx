import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { Agent } from "@/app/registry/types";
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

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  return <ProfileClient agent={agent} slug={slug} />;
}
