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
  gdp_json?: AgentGDP | null;
};

const DB_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — matches books cache

export async function saveGDPSnapshot(gdp: AgentGDP): Promise<void> {
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_gdp_history").insert({
    total_revenue_usd:    gdp.total_revenue_usd,
    total_expenses_usd:   gdp.total_expenses_usd,
    total_net_income_usd: gdp.total_net_income_usd,
    attributed_agents:    gdp.attributed_agents,
    total_agents:         gdp.total_agents,
    gdp_json:             gdp,
  });
}

export async function getRecentGDPSnapshot(): Promise<AgentGDP | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const sb = getSupabaseAdminClient();
  const cutoff = new Date(Date.now() - DB_CACHE_TTL_MS).toISOString();
  const { data } = await sb
    .from("agent_gdp_history")
    .select("gdp_json, snapshotted_at")
    .not("gdp_json", "is", null)
    .gte("snapshotted_at", cutoff)
    .order("snapshotted_at", { ascending: false })
    .limit(1)
    .single();
  if (!data?.gdp_json) return null;
  return data.gdp_json as AgentGDP;
}

export async function getGDPHistory(limit = 30): Promise<GDPSnapshot[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("agent_gdp_history")
    .select("id, total_revenue_usd, total_expenses_usd, total_net_income_usd, attributed_agents, total_agents, snapshotted_at")
    .order("snapshotted_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as GDPSnapshot[];
}
