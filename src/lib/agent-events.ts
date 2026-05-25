import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentEventType =
  | "inference_purchase"
  | "inference_sale"
  | "provider_spend"
  | "fallback_provider_spend"
  | "api_cost"
  | "agent_revenue"
  | "unknown_agent_activity";

export type AgentEventDirection = "inflow" | "outflow";

export interface AgentEconomicEvent {
  id?: string;
  agentName: string;
  walletAddress?: string | null;
  eventType: AgentEventType;
  provider?: string | null;
  amountUsd?: number | null;
  token?: string;
  direction?: AgentEventDirection | null;
  txHash?: string | null;
  metadata?: Record<string, unknown> | null;
  ts?: string;
}

export interface AgentEventRow {
  id: string;
  agent_name: string;
  wallet_address: string | null;
  event_type: AgentEventType;
  provider: string | null;
  amount_usd: number | null;
  token: string | null;
  direction: AgentEventDirection | null;
  tx_hash: string | null;
  metadata: Record<string, unknown> | null;
  ts: string;
  created_at: string;
}

export interface AgentEconomicSummary {
  agentName: string;
  periodDays: number;
  inferenceCost: number;        // inference_purchase + fallback_provider_spend
  inferenceRevenue: number;     // inference_sale + agent_revenue
  providerSpend: number;        // provider_spend
  apiCost: number;              // api_cost
  totalOutflow: number;
  totalInflow: number;
  netPosition: number;          // inflow - outflow
  eventCount: number;
  topProvider: string | null;
  primaryCostCenter: string | null;
}

export const EVENT_LABELS: Record<AgentEventType, string> = {
  inference_purchase:      "Inference Purchase",
  inference_sale:          "Inference Sale",
  provider_spend:          "Provider Spend",
  fallback_provider_spend: "Fallback Provider",
  api_cost:                "API Cost",
  agent_revenue:           "Agent Revenue",
  unknown_agent_activity:  "Unknown Activity",
};

// ── Row mapper ────────────────────────────────────────────────────────────────

function rowToEvent(row: AgentEventRow): AgentEconomicEvent {
  return {
    id:            row.id,
    agentName:     row.agent_name,
    walletAddress: row.wallet_address,
    eventType:     row.event_type,
    provider:      row.provider,
    amountUsd:     row.amount_usd,
    token:         row.token ?? "USDC",
    direction:     row.direction,
    txHash:        row.tx_hash,
    metadata:      row.metadata,
    ts:            row.ts,
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function logAgentEvent(
  event: AgentEconomicEvent,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();

  const { data, error } = await sb
    .from("agent_economic_events")
    .insert({
      agent_name:     event.agentName,
      wallet_address: event.walletAddress ?? null,
      event_type:     event.eventType,
      provider:       event.provider ?? null,
      amount_usd:     event.amountUsd ?? null,
      token:          event.token ?? "USDC",
      direction:      event.direction ?? null,
      tx_hash:        event.txHash ?? null,
      metadata:       event.metadata ?? null,
      ts:             event.ts ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAgentEvents(
  agentName: string,
  days = 7,
  limit = 200,
): Promise<AgentEconomicEvent[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await sb
    .from("agent_economic_events")
    .select("*")
    .eq("agent_name", agentName)
    .gte("ts", since)
    .order("ts", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => rowToEvent(r as AgentEventRow));
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

export function summarizeEvents(
  agentName: string,
  events: AgentEconomicEvent[],
  periodDays: number,
): AgentEconomicSummary {
  let inferenceCost = 0;
  let inferenceRevenue = 0;
  let providerSpend = 0;
  let apiCost = 0;
  let totalOutflow = 0;
  let totalInflow = 0;

  const providerCounts: Record<string, number> = {};
  const costCenters: Record<string, number> = {};

  for (const e of events) {
    const amt = e.amountUsd ?? 0;

    if (e.provider) {
      providerCounts[e.provider] = (providerCounts[e.provider] ?? 0) + 1;
    }

    switch (e.eventType) {
      case "inference_purchase":
      case "fallback_provider_spend":
        inferenceCost += amt;
        totalOutflow += amt;
        costCenters[e.eventType] = (costCenters[e.eventType] ?? 0) + amt;
        break;
      case "inference_sale":
      case "agent_revenue":
        inferenceRevenue += amt;
        totalInflow += amt;
        break;
      case "provider_spend":
        providerSpend += amt;
        totalOutflow += amt;
        costCenters["provider_spend"] = (costCenters["provider_spend"] ?? 0) + amt;
        break;
      case "api_cost":
        apiCost += amt;
        totalOutflow += amt;
        costCenters["api_cost"] = (costCenters["api_cost"] ?? 0) + amt;
        break;
      default:
        if (e.direction === "outflow") totalOutflow += amt;
        else if (e.direction === "inflow") totalInflow += amt;
    }
  }

  const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const primaryCostCenter = Object.entries(costCenters).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    agentName,
    periodDays,
    inferenceCost:    round(inferenceCost),
    inferenceRevenue: round(inferenceRevenue),
    providerSpend:    round(providerSpend),
    apiCost:          round(apiCost),
    totalOutflow:     round(totalOutflow),
    totalInflow:      round(totalInflow),
    netPosition:      round(totalInflow - totalOutflow),
    eventCount:       events.length,
    topProvider,
    primaryCostCenter: primaryCostCenter ? EVENT_LABELS[primaryCostCenter as AgentEventType] ?? primaryCostCenter : null,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
