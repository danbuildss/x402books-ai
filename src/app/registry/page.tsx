import { getRegistryAgents } from "@/lib/registry-db";
import { getAgentGDP } from "@/lib/agent-gdp";
import { toSlug } from "./[slug]/slug";
import { AGENTS } from "./data";
import { RegistryClient } from "./registry-client";
import type { AgentGDPEntry } from "@/lib/agent-gdp";

export const revalidate = 300;

export default async function RegistryPage() {
  const [agentsResult, gdpResult] = await Promise.allSettled([
    getRegistryAgents(),
    getAgentGDP(),
  ]);

  const agents =
    agentsResult.status === "fulfilled" && agentsResult.value.agents.length > 0
      ? agentsResult.value.agents
      : AGENTS;

  const economics: Record<string, AgentGDPEntry> = {};
  if (gdpResult.status === "fulfilled") {
    for (const entry of gdpResult.value.all_attributed) {
      economics[entry.slug] = entry;
    }
  }

  return <RegistryClient initialAgents={agents} initialEconomics={economics} />;
}
