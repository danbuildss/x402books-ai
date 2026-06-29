import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";

export type ResearchReport = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: "weekly" | "monthly" | "quarterly";
  summary: string;
  body: string;
  agent_gdp_usd: number | null;
  attributed_agents: number | null;
  period_label: string | null;
  published_at: string;
};

export async function listReports(limit = 20): Promise<ResearchReport[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("research_reports")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ResearchReport[];
}

export async function getLatestReport(): Promise<ResearchReport | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("research_reports")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as ResearchReport | null;
}

export async function getReportBySlug(slug: string): Promise<ResearchReport | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("research_reports")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data ?? null) as ResearchReport | null;
}

export async function saveReport(
  report: Omit<ResearchReport, "id" | "published_at">,
  opts: { upsert?: boolean } = {},
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();

  if (opts.upsert) {
    // force=true: overwrite existing row by slug — idempotent, no 500 on rerun
    const { data, error } = await sb
      .from("research_reports")
      .upsert(report, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: (data as { id: string }).id };
  }

  const { data, error } = await sb
    .from("research_reports")
    .insert(report)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}
