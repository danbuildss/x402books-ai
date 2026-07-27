// P5 — pipeline observability. Records where the Bankr data pipeline fails
// so failures are queryable by admin instead of vanishing into empty states.
//
// Golden rule: logging must NEVER break the pipeline. Every write here guards
// on Supabase env and swallows its own errors (console.error only) — a failure
// to log a failure must not itself throw.

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";

// The 10 pipeline stages, in order. Single source of truth — the DB CHECK
// constraint (20260717000001) mirrors this exactly, and the admin API/tests
// import it.
export const PIPELINE_STAGES = [
  "agent_indexed",
  "metadata_complete",
  "wallet_declared",
  "wallet_eligible",
  "transactions_fetched",
  "transactions_normalized",
  "transactions_classified",
  "books_generated",
  "profile_updated",
  "luca_report_generated",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type PipelineFailureRow = {
  id: string;
  agent_slug: string | null;
  agent_name: string | null;
  wallet_address: string | null;
  chain: string | null;
  provider: string | null;
  stage: PipelineStage;
  error: string | null;
  last_successful_run: string | null;
  records_fetched: number;
  records_written: number;
  retry_count: number;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

export type LogPipelineFailureParams = {
  stage: PipelineStage;
  agentSlug?: string | null;
  agentName?: string | null;
  walletAddress?: string | null;
  chain?: string | null;
  provider?: string | null;
  error: string;
  lastSuccessfulRun?: string | null;
  recordsFetched?: number;
  recordsWritten?: number;
  retryCount?: number;
};

/**
 * Record a pipeline-stage failure. Fire-and-forget: never throws, so callers
 * can `await logPipelineFailure(...)` inside a catch without risk.
 */
export async function logPipelineFailure(params: LogPipelineFailureParams): Promise<void> {
  if (!hasSupabaseAdminEnv()) {
    console.error(`[pipeline-failure:${params.stage}] ${params.error} (not persisted — no Supabase env)`);
    return;
  }
  try {
    const sb = getSupabaseAdminClient();
    const { error } = await sb.from("pipeline_failures").insert({
      stage: params.stage,
      agent_slug: params.agentSlug ?? null,
      agent_name: params.agentName ?? null,
      wallet_address: params.walletAddress ?? null,
      chain: params.chain ?? null,
      provider: params.provider ?? null,
      error: params.error.slice(0, 2000),
      last_successful_run: params.lastSuccessfulRun ?? null,
      records_fetched: params.recordsFetched ?? 0,
      records_written: params.recordsWritten ?? 0,
      retry_count: params.retryCount ?? 0,
    });
    if (error) throw error;
  } catch (err) {
    // A failure to log a failure is itself non-fatal.
    console.error("[pipeline-observability] logPipelineFailure insert failed:", err);
  }
}

/**
 * Mark an agent successfully indexed: stamp last_indexed_at (freshness) and
 * resolve any open failures for it (success clears the failed state). Never throws.
 */
export async function markAgentIndexed(agentSlug: string, agentName?: string): Promise<void> {
  if (!hasSupabaseAdminEnv()) return;
  try {
    const sb = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Stamp freshness on the agent (match by slug or name — registry_agents is
    // keyed by name, but the pipeline works in slugs).
    if (agentName) {
      await sb.from("registry_agents").update({ last_indexed_at: now }).eq("name", agentName);
    }

    // Clear open failures for this agent.
    await sb
      .from("pipeline_failures")
      .update({ resolved: true, resolved_at: now })
      .eq("agent_slug", agentSlug)
      .eq("resolved", false);
  } catch (err) {
    console.error("[pipeline-observability] markAgentIndexed failed:", err);
  }
}

/**
 * Slugs with at least one unresolved failure — used by getRegistryAgents to
 * overlay data_status = "failed". Returns an empty set on any error (non-fatal).
 */
export async function getActiveFailureSlugs(): Promise<Set<string>> {
  if (!hasSupabaseAdminEnv()) return new Set();
  try {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("pipeline_failures")
      .select("agent_slug")
      .eq("resolved", false)
      .not("agent_slug", "is", null);
    if (error) throw error;
    return new Set((data ?? []).map((r) => (r as { agent_slug: string }).agent_slug));
  } catch (err) {
    console.error("[pipeline-observability] getActiveFailureSlugs failed:", err);
    return new Set();
  }
}

export type FailureFilters = {
  stage?: PipelineStage;
  resolved?: boolean;
  agentSlug?: string;
  limit?: number;
};

export async function getRecentFailures(filters: FailureFilters = {}): Promise<PipelineFailureRow[]> {
  if (!hasSupabaseAdminEnv()) return [];
  try {
    const sb = getSupabaseAdminClient();
    let q = sb
      .from("pipeline_failures")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 200);
    if (filters.stage) q = q.eq("stage", filters.stage);
    if (filters.resolved !== undefined) q = q.eq("resolved", filters.resolved);
    if (filters.agentSlug) q = q.eq("agent_slug", filters.agentSlug);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PipelineFailureRow[];
  } catch (err) {
    console.error("[pipeline-observability] getRecentFailures failed:", err);
    return [];
  }
}

export function isPipelineStage(v: string): v is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(v);
}
