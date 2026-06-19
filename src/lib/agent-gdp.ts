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

export type AgentGDP = {
  total_revenue_usd: number;
  total_expenses_usd: number;
  total_net_income_usd: number;
  attributed_agents: number;
  attributed_wallets: number;
  total_agents: number;
  top_agents: AgentGDPEntry[];       // top 6 for homepage
  all_attributed: AgentGDPEntry[];   // all attributed, sorted by revenue
  generated_at: string;
};

const GDP_CACHE_TTL = 60 * 60 * 1000; // 1 hour
let _cache: { data: AgentGDP; expires: number } | null = null;

export async function getAgentGDP(): Promise<AgentGDP> {
  if (_cache && _cache.expires > Date.now()) return _cache.data;

  const { agents } = await getRegistryAgents();
  const withWallets = agents.filter((a) => (a.wallets ?? []).length > 0);

  const booksResults = await Promise.allSettled(
    withWallets.map((a) => buildAgentBooks(a, "30d")),
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
      name: withWallets[i].name,
      slug: toSlug(withWallets[i].name),
      ecosystem: withWallets[i].ecosystem,
      revenue_usd: b.financials.revenue_usd,
      expenses_usd: b.financials.expenses_usd,
      net_income_usd: b.financials.net_income_usd,
      tx_count: b.financials.tx_count,
    });
  }

  topAgents.sort((a, b) => b.revenue_usd - a.revenue_usd);

  const round = (n: number) => Math.round(n * 100) / 100;

  const data: AgentGDP = {
    total_revenue_usd: round(totalRevenue),
    total_expenses_usd: round(totalExpenses),
    total_net_income_usd: round(totalRevenue - totalExpenses),
    attributed_agents: topAgents.length,
    attributed_wallets: totalWallets,
    total_agents: agents.length,
    top_agents: topAgents.slice(0, 6),
    all_attributed: topAgents,
    generated_at: new Date().toISOString(),
  };

  _cache = { data, expires: Date.now() + GDP_CACHE_TTL };
  return data;
}
