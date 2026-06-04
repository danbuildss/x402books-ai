import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InferenceEvent {
  id?:          string;
  agentId:      string;
  provider:     string;
  model?:       string | null;
  requestType?: string | null;
  costUsd?:     number | null;
  latencyMs?:   number | null;
  status:       string;
  createdAt?:   string;
}

export interface ProviderStat {
  provider:     string;
  totalCost:    number;
  requestCount: number;
}

export interface InferenceSummary {
  agentId:           string;
  periodDays:        number;
  totalCostUsd:      number;
  requestCount:      number;
  providersUsed:     string[];
  primaryProvider:   string | null;
  avgCostPerRequest: number;
  providerBreakdown: ProviderStat[];
}

export interface MonthlyStatement {
  agentId:        string;
  month:          string;
  inferenceSpend: number;
  requestCount:   number;
  netPosition:    number;
  topProvider:    string | null;
  verdict:        string;
}

// ── DB row ────────────────────────────────────────────────────────────────────

interface InferenceEventRow {
  id:           string;
  agent_id:     string;
  provider:     string;
  model:        string | null;
  request_type: string | null;
  cost_usd:     number | null;
  latency_ms:   number | null;
  status:       string;
  created_at:   string;
}

function rowToEvent(r: InferenceEventRow): InferenceEvent {
  return {
    id:          r.id,
    agentId:     r.agent_id,
    provider:    r.provider,
    model:       r.model,
    requestType: r.request_type,
    costUsd:     r.cost_usd,
    latencyMs:   r.latency_ms,
    status:      r.status,
    createdAt:   r.created_at,
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function logInferenceEvent(
  event: Omit<InferenceEvent, "id" | "createdAt">,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();

  const { data, error } = await sb
    .from("inference_events")
    .insert({
      agent_id:     event.agentId,
      provider:     event.provider,
      model:        event.model ?? null,
      request_type: event.requestType ?? null,
      cost_usd:     event.costUsd ?? null,
      latency_ms:   event.latencyMs ?? null,
      status:       event.status ?? "success",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getInferenceEvents(
  agentId: string,
  days = 30,
  limit = 500,
): Promise<InferenceEvent[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await sb
    .from("inference_events")
    .select("*")
    .eq("agent_id", agentId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => rowToEvent(r as InferenceEventRow));
}

// ── Summarize ─────────────────────────────────────────────────────────────────

export function summarizeInferenceEvents(
  agentId: string,
  events: InferenceEvent[],
  periodDays: number,
): InferenceSummary {
  let totalCost = 0;
  const providerMap: Record<string, { cost: number; count: number }> = {};

  for (const e of events) {
    const cost = e.costUsd ?? 0;
    totalCost += cost;

    if (!providerMap[e.provider]) providerMap[e.provider] = { cost: 0, count: 0 };
    providerMap[e.provider].cost  += cost;
    providerMap[e.provider].count += 1;
  }

  const providerBreakdown: ProviderStat[] = Object.entries(providerMap)
    .map(([provider, s]) => ({ provider, totalCost: r(s.cost), requestCount: s.count }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const primaryProvider = providerBreakdown[0]?.provider ?? null;
  const providersUsed   = providerBreakdown.map((p) => p.provider);
  const avgCost         = events.length > 0 ? r(totalCost / events.length) : 0;

  return {
    agentId,
    periodDays,
    totalCostUsd:      r(totalCost),
    requestCount:      events.length,
    providersUsed,
    primaryProvider,
    avgCostPerRequest: avgCost,
    providerBreakdown,
  };
}

// ── Monthly Statement ─────────────────────────────────────────────────────────

export function generateMonthlyStatement(
  agentId: string,
  summary: InferenceSummary,
  month: string,
): MonthlyStatement {
  const spend = summary.totalCostUsd;

  let verdict: string;
  if (summary.requestCount === 0) {
    verdict = "No inference activity recorded this period.";
  } else if (spend === 0) {
    verdict = `${summary.requestCount} request${summary.requestCount === 1 ? "" : "s"} processed. No cost data recorded — cost tracking may not be active.`;
  } else if (spend < 1) {
    verdict = `Operating normally. ${summary.requestCount} request${summary.requestCount === 1 ? "" : "s"} processed. Inference spend minimal.`;
  } else if (spend < 10) {
    verdict = `Operating normally. Inference spend within expected range for an active agent.`;
  } else if (spend < 50) {
    verdict = `Active agent. Inference spend is significant — monitor provider concentration.`;
  } else {
    verdict = `High inference activity. Operational costs are elevated. Review provider mix and request volume.`;
  }

  return {
    agentId,
    month,
    inferenceSpend: spend,
    requestCount:   summary.requestCount,
    netPosition:    r(0 - spend),
    topProvider:    summary.primaryProvider,
    verdict,
  };
}

function r(n: number) { return Math.round(n * 10_000) / 10_000; }
