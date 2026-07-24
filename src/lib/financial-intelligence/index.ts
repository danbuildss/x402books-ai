import { createHash } from "node:crypto";

export type ActionType = "direct_payment" | "internal_transfer" | "swap" | "bridge" | "refund" | "owner_funding" | "loan" | "collateral" | "staking_reward" | "protocol_fee" | "operating_expense" | "unknown";
export type EvidenceGrade = "A" | "B" | "C" | "D" | "U";
export type RecognitionStatus = "not_revenue" | "unresolved" | "candidate" | "deferred" | "recognized" | "reversed";

export interface SourceEvent { id?: string; agentId?: string | null; agentSlug: string; walletAddress: string; chain: string; txHash: string; direction: "in" | "out"; counterparty: string; amountUsd: number; assetSymbol?: string; assetAddress?: string; observedAt: string; classification: string; reasonCodes?: string[]; metadata?: Record<string, unknown>; }
export interface EconomicAction { agentId?: string | null; agentSlug: string; walletAddress: string; chain: string; txHash: string; actionIndex: number; actionType: ActionType; counterparty?: string; grossAmountUsd: number; feeAmountUsd: number; occurredAt: string; reasonCodes: string[]; sourceEventIds: string[]; adapterVersion: string; reconstructionConfidence: "deterministic" | "high" | "medium" | "low" | "conflicting"; metadata: Record<string, unknown>; }
export interface CommercialEvidence { id: string; eventType: string; status: string; amountUsd: number; deliveredAt?: string | null; customerRef?: string | null; evidence: unknown[]; }
export interface RecognitionDecision { status: RecognitionStatus; recognizedAmountUsd: number; deferredAmountUsd: number; evidenceGrade: EvidenceGrade; journalType: string; reasonCodes: string[]; }
export interface JournalLine { accountCode: string; accountName: string; debitUsd: number; creditUsd: number; }
export interface JournalDraft { journalType: string; recognitionStatus: RecognitionStatus; evidenceGrade: EvidenceGrade; explanation: string; lines: JournalLine[]; }
export interface SnapshotMetrics { grossPaymentVolumeUsd: number; recognizedRevenueUsd: number; collectedRevenueUsd: number; directCostsUsd: number; grossProfitUsd: number; operatingExpensesUsd: number; operatingProfitUsd: number; otherIncomeUsd: number; unresolvedInflowsUsd: number; refundsUsd: number; anomalyCount: number; }

const actionMap: Record<string, ActionType> = { own_wallet_transfer: "internal_transfer", internal_transfer: "internal_transfer", dex_trade: "swap", swap: "swap", bridge: "bridge", refund: "refund", owner_funding: "owner_funding", loan: "loan", collateral: "collateral", staking_reward: "staking_reward", protocol_fee: "protocol_fee", expense: "operating_expense", revenue_candidate: "direct_payment", unresolved_inflow: "unknown" };
const nonRevenue = new Set<ActionType>(["internal_transfer", "swap", "bridge", "owner_funding", "loan", "collateral", "operating_expense"]);

function inferAction(events: SourceEvent[]): ActionType {
  const explicit = events.map((event) => actionMap[event.classification]).filter(Boolean);
  if (explicit.includes("internal_transfer")) return "internal_transfer";
  if (explicit.includes("bridge")) return "bridge";
  if (explicit.includes("swap") || (events.some((e) => e.direction === "in") && events.some((e) => e.direction === "out") && new Set(events.map((e) => e.assetAddress ?? e.assetSymbol)).size > 1)) return "swap";
  if (explicit.includes("refund")) return "refund";
  return explicit[0] ?? (events.length === 1 && events[0].direction === "in" ? "direct_payment" : "unknown");
}

export function reconstructEconomicActions(events: SourceEvent[]): EconomicAction[] {
  const groups = new Map<string, SourceEvent[]>();
  for (const event of events) {
    const key = `${event.agentSlug}:${event.chain}:${event.txHash}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()].map((group) => {
    const actionType = inferAction(group);
    const inbound = group.filter((e) => e.direction === "in").reduce((sum, e) => sum + e.amountUsd, 0);
    const outbound = group.filter((e) => e.direction === "out").reduce((sum, e) => sum + e.amountUsd, 0);
    const first = group[0];
    return { agentId: first.agentId, agentSlug: first.agentSlug, walletAddress: first.walletAddress, chain: first.chain, txHash: first.txHash, actionIndex: 0, actionType, counterparty: first.counterparty, grossAmountUsd: Math.max(inbound, outbound), feeAmountUsd: Number(first.metadata?.feeAmountUsd ?? 0), occurredAt: first.observedAt, reasonCodes: [...new Set([`action:${actionType}`, ...group.flatMap((e) => e.reasonCodes ?? [])])], sourceEventIds: group.flatMap((e) => e.id ? [e.id] : []), adapterVersion: "canonical-action.v1", reconstructionConfidence: actionType === "unknown" ? "low" : "deterministic", metadata: { transferCount: group.length, inboundUsd: inbound, outboundUsd: outbound } };
  });
}

export function decideRecognition(action: EconomicAction, commercial?: CommercialEvidence | null): RecognitionDecision {
  if (nonRevenue.has(action.actionType)) return { status: "not_revenue", recognizedAmountUsd: 0, deferredAmountUsd: 0, evidenceGrade: "U", journalType: action.actionType, reasonCodes: [`excluded:${action.actionType}`] };
  if (action.actionType === "refund") return { status: "reversed", recognizedAmountUsd: -action.grossAmountUsd, deferredAmountUsd: 0, evidenceGrade: commercial ? "B" : "C", journalType: "refund", reasonCodes: ["refund:linked-reversal"] };
  if (["staking_reward", "protocol_fee"].includes(action.actionType)) return { status: "recognized", recognizedAmountUsd: action.grossAmountUsd, deferredAmountUsd: 0, evidenceGrade: "B", journalType: "other_income", reasonCodes: ["protocol:evidence"] };
  if (!commercial) return { status: action.actionType === "direct_payment" ? "candidate" : "unresolved", recognizedAmountUsd: 0, deferredAmountUsd: 0, evidenceGrade: "C", journalType: "unresolved_inflow", reasonCodes: ["missing:commercial-evidence"] };
  if (!commercial.customerRef) return { status: "candidate", recognizedAmountUsd: 0, deferredAmountUsd: 0, evidenceGrade: "C", journalType: "revenue_candidate", reasonCodes: ["missing:independent-customer"] };
  const delivered = Boolean(commercial.deliveredAt) || ["delivered", "completed", "accepted"].includes(commercial.status);
  if (!delivered) return { status: "deferred", recognizedAmountUsd: 0, deferredAmountUsd: action.grossAmountUsd, evidenceGrade: "B", journalType: "deferred_revenue", reasonCodes: ["payment:received", "delivery:pending"] };
  const amount = Math.min(action.grossAmountUsd, commercial.amountUsd || action.grossAmountUsd);
  return { status: "recognized", recognizedAmountUsd: amount, deferredAmountUsd: 0, evidenceGrade: commercial.evidence.length ? "A" : "B", journalType: "service_revenue", reasonCodes: ["customer:identified", "delivery:complete", "settlement:observed"] };
}

export function assertBalanced(lines: JournalLine[]): void {
  const debit = lines.reduce((sum, line) => sum + line.debitUsd, 0);
  const credit = lines.reduce((sum, line) => sum + line.creditUsd, 0);
  if (Math.abs(debit - credit) > 0.000001 || debit <= 0) throw new Error(`unbalanced journal: debit=${debit} credit=${credit}`);
}

export function buildJournal(action: EconomicAction, decision: RecognitionDecision): JournalDraft | null {
  const amount = Math.abs(decision.recognizedAmountUsd || decision.deferredAmountUsd || action.grossAmountUsd);
  if (["unresolved", "candidate", "not_revenue"].includes(decision.status) || amount <= 0) return null;
  let lines: JournalLine[];
  if (decision.status === "recognized") lines = [{ accountCode: "1000", accountName: "Cash and stablecoins", debitUsd: amount, creditUsd: 0 }, { accountCode: decision.journalType === "other_income" ? "4900" : "4000", accountName: decision.journalType === "other_income" ? "Other income" : "Operating revenue", debitUsd: 0, creditUsd: amount }];
  else if (decision.status === "deferred") lines = [{ accountCode: "1000", accountName: "Cash and stablecoins", debitUsd: amount, creditUsd: 0 }, { accountCode: "2200", accountName: "Deferred revenue", debitUsd: 0, creditUsd: amount }];
  else if (decision.status === "reversed") lines = [{ accountCode: "4050", accountName: "Refunds and allowances", debitUsd: amount, creditUsd: 0 }, { accountCode: "1000", accountName: "Cash and stablecoins", debitUsd: 0, creditUsd: amount }];
  else return null;
  assertBalanced(lines);
  return { journalType: decision.journalType, recognitionStatus: decision.status, evidenceGrade: decision.evidenceGrade, explanation: decision.reasonCodes.join(", "), lines };
}

export interface Anomaly { anomalyType: string; severity: "low" | "medium" | "high" | "critical"; score: number; reasonCodes: string[]; }
export function detectAnomalies(action: EconomicAction, relatedWallets: Set<string>): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (action.counterparty && relatedWallets.has(action.counterparty.toLowerCase()) && action.actionType === "direct_payment") anomalies.push({ anomalyType: "related_party_payment", severity: "high", score: 0.9, reasonCodes: ["counterparty:related-wallet"] });
  if (action.actionType === "unknown" && action.grossAmountUsd >= 10_000) anomalies.push({ anomalyType: "material_unresolved_flow", severity: "high", score: 0.8, reasonCodes: ["amount:material", "classification:unknown"] });
  if (action.actionType === "refund") anomalies.push({ anomalyType: "refund_review", severity: "medium", score: 0.5, reasonCodes: ["revenue:possible-reversal"] });
  return anomalies;
}

export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function snapshotIntegrityHash(input: { agentSlug: string; periodStart: string; periodEnd: string; metrics: SnapshotMetrics; manifestDigest?: string | null; policyVersions: Record<string, string>; }): string { return createHash("sha256").update(canonicalize(input)).digest("hex"); }
export function emptyMetrics(): SnapshotMetrics { return { grossPaymentVolumeUsd: 0, recognizedRevenueUsd: 0, collectedRevenueUsd: 0, directCostsUsd: 0, grossProfitUsd: 0, operatingExpensesUsd: 0, operatingProfitUsd: 0, otherIncomeUsd: 0, unresolvedInflowsUsd: 0, refundsUsd: 0, anomalyCount: 0 }; }
