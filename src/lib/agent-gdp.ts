import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks } from "@/lib/agent-books";
import { toSlug } from "@/app/registry/[slug]/slug";

export type AgentGDPEntry = {
  name: string;
  slug: string;
  ecosystem: string;
  revenue_usd: number;
  expenses_usd: number;
  net_income_usd: number;
  tx_count: number;
};

export type AwaitingManifestEntry = {
  name: string;
  slug: string;
  ecosystem: string;
  verificationStatus: string;
  isErc8004: boolean;
};

export type AgentGDP = {
  total_revenue_usd: number;
  total_expenses_usd: number;
  total_net_income_usd: number;
  attributed_agents: number;
  attributed_wallets: number;
  total_agents: number;
  erc8004_agents: number;            // indexed via ERC-8004, may or may not have manifest
  awaiting_manifest: AwaitingManifestEntry[]; // agents without manifest-declared wallets
  top_agents: AgentGDPEntry[];       // top 6 for homepage
  all_attributed: AgentGDPEntry[];   // all attributed, sorted by revenue
  generated_at: string;
};

const GDP_CACHE_TTL = 60 * 60 * 1000; // 1 hour
let _cache: { data: AgentGDP; expires: number } | null = null;

export async function getAgentGDP(): Promise<AgentGDP> {
  if (_cache && _cache.expires > Date.now()) return _cache.data;

  const { agents } = await getRegistryAgents();

  // Only agents with at least one manifest-declared wallet get books computed.
  const withManifestWallets = agents.filter((a) =>
    (a.wallets ?? []).some((w) => (w.evidenceSource ?? "").toLowerCase() === "manifest"),
  );

  const booksResults = await Promise.allSettled(
    withManifestWallets.map((a) => buildAgentBooks(a, "30d")),
  );

  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalWallets = 0;
  const topAgents: AgentGDPEntry[] = [];

  for (let i = 0; i < booksResults.length; i++) {
    const result = booksResults[i];
    if (result.status !== "fulfilled" || !result.value.attributed) continue;
    const b = result.value;
    totalRevenue += b.financials.revenue_usd;
    totalExpenses += b.financials.expenses_usd;
    totalWallets += b.wallets.analyzed;
    topAgents.push({
      name: withManifestWallets[i].name,
      slug: toSlug(withManifestWallets[i].name),
      ecosystem: withManifestWallets[i].ecosystem,
      revenue_usd: b.financials.revenue_usd,
      expenses_usd: b.financials.expenses_usd,
      net_income_usd: b.financials.net_income_usd,
      tx_count: b.financials.tx_count,
    });
  }

  topAgents.sort((a, b) => b.revenue_usd - a.revenue_usd);

  // Agents without manifest-declared wallets — indexed but awaiting declaration.
  const manifestNames = new Set(withManifestWallets.map((a) => a.name));
  const awaitingManifest: AwaitingManifestEntry[] = agents
    .filter((a) => !manifestNames.has(a.name))
    .map((a) => ({
      name: a.name,
      slug: toSlug(a.name),
      ecosystem: a.ecosystem,
      verificationStatus: a.verificationStatus,
      isErc8004: (a.evidenceSources ?? []).includes("ERC-8004"),
    }));

  const erc8004Agents = agents.filter((a) =>
    (a.evidenceSources ?? []).includes("ERC-8004"),
  ).length;

  const round = (n: number) => Math.round(n * 100) / 100;

  const data: AgentGDP = {
    total_revenue_usd: round(totalRevenue),
    total_expenses_usd: round(totalExpenses),
    total_net_income_usd: round(totalRevenue - totalExpenses),
    attributed_agents: topAgents.length,
    attributed_wallets: totalWallets,
    total_agents: agents.length,
    erc8004_agents: erc8004Agents,
    awaiting_manifest: awaitingManifest,
    top_agents: topAgents.slice(0, 6),
    all_attributed: topAgents,
    generated_at: new Date().toISOString(),
  };

  _cache = { data, expires: Date.now() + GDP_CACHE_TTL };
  return data;
}
