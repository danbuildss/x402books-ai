import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";
import type { AgentGDP } from "./agent-gdp";

export type GDPSnapshot = {
  id: string;
  total_revenue_usd: number;
  total_expenses_usd: number;
  total_net_income_usd: number;
  attributed_agents: number;
  total_agents: number;
  snapshotted_at: string;
};

export async function saveGDPSnapshot(gdp: AgentGDP): Promise<void> {
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_gdp_history").insert({
    total_revenue_usd:    gdp.total_revenue_usd,
    total_expenses_usd:   gdp.total_expenses_usd,
    total_net_income_usd: gdp.total_net_income_usd,
    attributed_agents:    gdp.attributed_agents,
    total_agents:         gdp.total_agents,
  });
}

export async function getGDPHistory(limit = 30): Promise<GDPSnapshot[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("agent_gdp_history")
    .select("*")
    .order("snapshotted_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as GDPSnapshot[];
}
