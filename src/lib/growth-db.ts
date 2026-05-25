import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export type DailyMetric = {
  date: string;
  wallet_scans: number;
  reports_generated: number;
  api_calls: number;
  unique_wallets: number;
  luca_interactions: number;
  registry_submissions: number;
  verified_agents: number;
  failed_scans: number;
  endpoint_calls: number;
};

export type TopWallet = { wallet: string; count: number };

export type RegistryEvent = {
  event_type: string;
  agent_name: string | null;
  update_type: string | null;
  created_at: string;
};

export type FailedScan = {
  wallet: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function client() {
  return getSupabaseAdminClient();
}

export async function getTodayMetrics(): Promise<DailyMetric | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client()
    .from("daily_metrics")
    .select("*")
    .eq("date", today)
    .single();
  if (error) return null;
  return (data as DailyMetric) ?? null;
}

export async function get7DayMetrics(): Promise<DailyMetric[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const { data, error } = await client()
    .from("daily_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(7);
  if (error) return [];
  return (data as DailyMetric[]) ?? [];
}

export async function getTopScannedWallets(days = 7, limit = 10): Promise<TopWallet[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await client()
    .from("growth_events")
    .select("wallet")
    .eq("event_type", "scan")
    .not("wallet", "is", null)
    .gte("created_at", since);
  if (error || !data) return [];
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.wallet) counts[row.wallet] = (counts[row.wallet] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([wallet, count]) => ({ wallet, count }));
}

export async function getRecentFailedScans(limit = 10): Promise<FailedScan[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const { data, error } = await client()
    .from("growth_events")
    .select("wallet, metadata, created_at")
    .eq("event_type", "scan_failed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as FailedScan[]) ?? [];
}

export async function getRecentRegistryEvents(limit = 20): Promise<RegistryEvent[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const { data, error } = await client()
    .from("registry_events")
    .select("event_type, agent_name, update_type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as RegistryEvent[]) ?? [];
}
