import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentEventType =
  | "inference_purchase"
  | "inference_sale"
  | "provider_spend"
  | "fallback_provider_spend"
  | "api_cost"
  | "agent_revenue"
  | "wallet_inflow"
  | "wallet_outflow"
  | "unknown_agent_activity";

export type AgentEventDirection = "inflow" | "outflow" | "neutral";

export interface AgentEconomicEvent {
  id?:           string;
  agentId:       string;
  agentName?:    string | null;
  walletAddress?: string | null;
  eventType:     AgentEventType;
  provider?:     string | null;
  amount?:       number | null;
  token?:        string;
  direction?:    AgentEventDirection | null;
  txHash?:       string | null;
  metadata?:     Record<string, unknown> | null;
  timestamp?:    string;
}

export interface AgentEconomicSummary {
  agentId:               string;
  agentName:             string | null;
  periodDays:            number;
  totalInferenceSpend:   number;
  totalInferenceRevenue: number;
  providerSpend:         number;
  fallbackProviderSpend: number;
  apiCosts:              number;
  walletInflows:         number;
  walletOutflows:        number;
  netAgentPosition:      number;
  topProvider:           string | null;
  fallbackUsageCount:    number;
  eventCount:            number;
  lucaVerdict:           string;
}

export const EVENT_LABELS: Record<AgentEventType, string> = {
  inference_purchase:      "Inference Purchase",
  inference_sale:          "Inference Sale",
  provider_spend:          "Provider Spend",
  fallback_provider_spend: "Fallback Provider",
  api_cost:                "API Cost",
  agent_revenue:           "Agent Revenue",
  wallet_inflow:           "Wallet Inflow",
  wallet_outflow:          "Wallet Outflow",
  unknown_agent_activity:  "Unknown Activity",
};

// ── DB row ────────────────────────────────────────────────────────────────────

interface AgentEventRow {
  id:             string;
  agent_id:       string;
  agent_name:     string | null;
  wallet_address: string | null;
  event_type:     string;
  provider:       string | null;
  amount:         number | null;
  token:          string | null;
  direction:      string | null;
  tx_hash:        string | null;
  metadata:       Record<string, unknown> | null;
  timestamp:      string;
  created_at:     string;
}

function rowToEvent(r: AgentEventRow): AgentEconomicEvent {
  return {
    id:            r.id,
    agentId:       r.agent_id,
    agentName:     r.agent_name,
    walletAddress: r.wallet_address,
    eventType:     r.event_type as AgentEventType,
    provider:      r.provider,
    amount:        r.amount,
    token:         r.token ?? "USDC",
    direction:     r.direction as AgentEventDirection | null,
    txHash:        r.tx_hash,
    metadata:      r.metadata,
    timestamp:     r.timestamp,
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
      agent_id:       event.agentId,
      agent_name:     event.agentName ?? null,
      wallet_address: event.walletAddress ?? null,
      event_type:     event.eventType,
      provider:       event.provider ?? null,
      amount:         event.amount ?? null,
      token:          event.token ?? "USDC",
      direction:      event.direction ?? null,
      tx_hash:        event.txHash ?? null,
      metadata:       event.metadata ?? null,
      timestamp:      event.timestamp ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAgentEvents(
  agentId: string,
  days = 7,
  limit = 500,
): Promise<AgentEconomicEvent[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await sb
    .from("agent_economic_events")
    .select("*")
    .eq("agent_id", agentId)
    .gte("timestamp", since)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => rowToEvent(r as AgentEventRow));
}

// ── Summarize ─────────────────────────────────────────────────────────────────

export function summarizeEvents(
  agentId: string,
  events: AgentEconomicEvent[],
  periodDays: number,
): AgentEconomicSummary {
  let inferencePurchase   = 0;
  let inferenceSale       = 0;
  let providerSpend       = 0;
  let fallbackSpend       = 0;
  let apiCosts            = 0;
  let agentRevenue        = 0;
  let walletInflows       = 0;
  let walletOutflows      = 0;
  let fallbackUsageCount  = 0;
  let agentName: string | null = null;

  const providerCounts: Record<string, number> = {};

  for (const e of events) {
    const amt = e.amount ?? 0;
    if (e.agentName && !agentName) agentName = e.agentName;
    if (e.provider) providerCounts[e.provider] = (providerCounts[e.provider] ?? 0) + 1;

    switch (e.eventType) {
      case "inference_purchase":   inferencePurchase += amt; break;
      case "inference_sale":       inferenceSale     += amt; break;
      case "provider_spend":       providerSpend     += amt; break;
      case "fallback_provider_spend":
        fallbackSpend += amt;
        fallbackUsageCount++;
        break;
      case "api_cost":             apiCosts      += amt; break;
      case "agent_revenue":        agentRevenue  += amt; break;
      case "wallet_inflow":        walletInflows += amt; break;
      case "wallet_outflow":       walletOutflows += amt; break;
    }
  }

  const totalInferenceSpend   = r(inferencePurchase + fallbackSpend);
  const totalInferenceRevenue = r(inferenceSale + agentRevenue);
  const totalInflow           = r(totalInferenceRevenue + walletInflows);
  const totalOutflow          = r(totalInferenceSpend + providerSpend + apiCosts + walletOutflows);
  const netAgentPosition      = r(totalInflow - totalOutflow);
  const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    agentId,
    agentName,
    periodDays,
    totalInferenceSpend,
    totalInferenceRevenue,
    providerSpend:        r(providerSpend),
    fallbackProviderSpend: r(fallbackSpend),
    apiCosts:             r(apiCosts),
    walletInflows:        r(walletInflows),
    walletOutflows:       r(walletOutflows),
    netAgentPosition,
    topProvider,
    fallbackUsageCount,
    eventCount:           events.length,
    lucaVerdict:          buildVerdict({ agentId, agentName, totalInferenceSpend, totalInferenceRevenue, netAgentPosition, topProvider, fallbackUsageCount, apiCosts }),
  };
}

function buildVerdict(s: {
  agentId: string;
  agentName: string | null;
  totalInferenceSpend: number;
  totalInferenceRevenue: number;
  netAgentPosition: number;
  topProvider: string | null;
  fallbackUsageCount: number;
  apiCosts: number;
}): string {
  const name = s.agentName ?? s.agentId;

  if (s.totalInferenceSpend === 0 && s.totalInferenceRevenue === 0) {
    return `${name} has no recorded economic activity. Agent may be dormant or not yet connected to event tracking.`;
  }

  const spendPart    = s.totalInferenceSpend > 0    ? `spent $${s.totalInferenceSpend.toFixed(2)} on inference` : null;
  const revenuePart  = s.totalInferenceRevenue > 0  ? `earned $${s.totalInferenceRevenue.toFixed(2)} from marketplace calls` : null;
  const providerPart = s.topProvider                ? `Primary provider: ${s.topProvider}.` : "";
  const fallbackPart = s.fallbackUsageCount > 0     ? `Fallback provider used ${s.fallbackUsageCount} time${s.fallbackUsageCount === 1 ? "" : "s"}.` : "";
  const apiPart      = s.apiCosts > 0               ? `API costs: $${s.apiCosts.toFixed(2)}.` : "";

  const activity = [spendPart, revenuePart].filter(Boolean).join(" and ");

  const position =
    s.netAgentPosition > 0.01 ? `Net position: positive (+$${s.netAgentPosition.toFixed(2)}). Verdict: operationally active, financially sustainable for now.` :
    s.netAgentPosition < -0.01 ? `Net position: negative ($${s.netAgentPosition.toFixed(2)}). Verdict: operationally active, running at a deficit — monitor closely.` :
    "Net position: balanced. Verdict: operationally active, financially neutral.";

  return [activity ? `${name} ${activity} this period.` : "", providerPart, fallbackPart, apiPart, position]
    .filter(Boolean).join(" ").trim();
}

function r(n: number) { return Math.round(n * 100) / 100; }
