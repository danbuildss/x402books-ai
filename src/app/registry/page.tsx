import { Suspense } from "react";
import { getRegistryAgents } from "@/lib/registry-db";
import { getAgentGDP } from "@/lib/agent-gdp";
import { AGENTS } from "./data";
import { RegistryClient } from "./registry-client";
import { toPublicAgent } from "./types";
import type { AgentGDPEntry } from "@/lib/agent-gdp";

export const revalidate = 300;

export default async function RegistryPage() {
  const [agentsResult, gdpResult] = await Promise.allSettled([
    getRegistryAgents(),
    getAgentGDP(),
  ]);

  const rawAgents =
    agentsResult.status === "fulfilled" && agentsResult.value.agents.length > 0
      ? agentsResult.value.agents
      : AGENTS;

  // Strip internal CRM fields before passing to client bundle
  const agents = rawAgents.map(toPublicAgent);

  const economics: Record<string, AgentGDPEntry> = {};
  if (gdpResult.status === "fulfilled") {
    for (const entry of gdpResult.value.all_attributed) {
      economics[entry.slug] = entry;
    }
  }

  return (
    <Suspense fallback={null}>
      <RegistryClient initialAgents={agents} initialEconomics={economics} />
    </Suspense>
  );
}
