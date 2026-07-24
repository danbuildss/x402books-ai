import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { CommercialEvidence, EconomicAction, JournalDraft, SnapshotMetrics, SourceEvent } from "./financial-intelligence";

const db = () => getSupabaseAdminClient();
const number = (value: unknown) => Number(value ?? 0);

export async function loadSourceEvents(slug: string, start?: string, end?: string): Promise<SourceEvent[]> {
  let query = db().from("revenue_classification_events").select("*").eq("agent_slug", slug).order("observed_at");
  if (start) query = query.gte("observed_at", start);
  if (end) query = query.lte("observed_at", end);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), agentId: row.agent_id as string | null, agentSlug: String(row.agent_slug), walletAddress: String(row.wallet_address), chain: String(row.chain), txHash: String(row.tx_hash), direction: row.direction as "in" | "out", counterparty: String(row.counterparty ?? ""), amountUsd: number(row.amount_usd), assetSymbol: row.asset_symbol as string | undefined, assetAddress: row.asset_address as string | undefined, observedAt: String(row.observed_at), classification: String(row.classification), reasonCodes: Array.isArray(row.reason_codes) ? row.reason_codes as string[] : [], metadata: {} }));
}

export async function upsertAction(action: EconomicAction) {
  const { data, error } = await db().from("economic_actions").upsert({ agent_id: action.agentId, agent_slug: action.agentSlug, wallet_address: action.walletAddress, chain: action.chain, tx_hash: action.txHash, action_index: action.actionIndex, action_type: action.actionType, counterparty: action.counterparty, gross_amount_usd: action.grossAmountUsd, fee_amount_usd: action.feeAmountUsd, occurred_at: action.occurredAt, reconstruction_confidence: action.reconstructionConfidence, reason_codes: action.reasonCodes, source_event_ids: action.sourceEventIds, adapter_version: action.adapterVersion, metadata: action.metadata }, { onConflict: "chain,tx_hash,agent_slug,action_index" }).select("*").single();
  if (error) throw error;
  return data;
}

export async function commercialForAction(actionId: string): Promise<CommercialEvidence | null> {
  const { data, error } = await db().from("payment_allocations").select("commercial_events(*)").eq("action_id", actionId).limit(1).maybeSingle();
  if (error) throw error;
  const commercial = (data as { commercial_events?: Record<string, unknown> } | null)?.commercial_events;
  if (!commercial) return null;
  return { id: String(commercial.id), eventType: String(commercial.event_type), status: String(commercial.status), amountUsd: number(commercial.amount_usd), deliveredAt: commercial.delivered_at as string | null, customerRef: commercial.customer_ref as string | null, evidence: Array.isArray(commercial.evidence) ? commercial.evidence : [] };
}

export async function hasJournal(actionId: string, journalType: string): Promise<boolean> {
  const { data, error } = await db().from("financial_journals").select("id").eq("action_id", actionId).eq("journal_type", journalType).neq("status", "reversed").limit(1).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function postJournal(slug: string, agentId: string | null, actionId: string, occurredAt: string, journal: JournalDraft) {
  if (await hasJournal(actionId, journal.journalType)) return null;
  const { data, error } = await db().from("financial_journals").insert({ agent_id: agentId, agent_slug: slug, action_id: actionId, journal_type: journal.journalType, recognition_status: journal.recognitionStatus, recognition_date: occurredAt.slice(0, 10), evidence_grade: journal.evidenceGrade, status: "posted", explanation: journal.explanation, posted_at: new Date().toISOString() }).select("id").single();
  if (error) throw error;
  const lines = journal.lines.map((line, index) => ({ journal_id: data.id, line_index: index, account_code: line.accountCode, account_name: line.accountName, debit_usd: line.debitUsd, credit_usd: line.creditUsd }));
  const lineResult = await db().from("financial_journal_lines").insert(lines);
  if (lineResult.error) throw lineResult.error;
  const balanceResult = await db().rpc("assert_financial_journal_balanced", { target_journal: data.id });
  if (balanceResult.error) throw balanceResult.error;
  return data.id;
}

export async function saveAnomalies(slug: string, agentId: string | null, actionId: string, anomalies: Array<{ anomalyType: string; severity: string; score: number; reasonCodes: string[] }>) {
  for (const anomaly of anomalies) {
    const exists = await db().from("financial_anomalies").select("id").eq("action_id", actionId).eq("anomaly_type", anomaly.anomalyType).limit(1).maybeSingle();
    if (exists.error) throw exists.error;
    if (exists.data) continue;
    const result = await db().from("financial_anomalies").insert({ agent_id: agentId, agent_slug: slug, action_id: actionId, anomaly_type: anomaly.anomalyType, severity: anomaly.severity, score: anomaly.score, reason_codes: anomaly.reasonCodes });
    if (result.error) throw result.error;
  }
}

export async function saveSnapshot(input: { agentId: string | null; agentSlug: string; periodStart: string; periodEnd: string; metrics: SnapshotMetrics; evidenceCoverage: number; dataCompleteness: number; integrityHash: string; publish: boolean }) {
  const { data, error } = await db().from("financial_snapshots").upsert({ agent_id: input.agentId, agent_slug: input.agentSlug, period_start: input.periodStart, period_end: input.periodEnd, metrics: input.metrics, evidence_coverage: input.evidenceCoverage, data_completeness: input.dataCompleteness, integrity_hash: input.integrityHash, status: input.publish ? "published" : "preliminary", published_at: input.publish ? new Date().toISOString() : null, policy_versions: { recognition: "zetta-cash-v1", actions: "canonical-action.v1", anomalies: "anomaly-v1" } }, { onConflict: "agent_slug,period_start,period_end,integrity_hash" }).select("*").single();
  if (error) throw error;
  return data;
}

export async function latestPublishedSnapshot(slug: string) {
  const { data, error } = await db().from("financial_snapshots").select("*").eq("agent_slug", slug).eq("status", "published").order("period_end", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
