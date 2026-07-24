// Deterministic financial-activity classifier. Pure function — no DB calls.
// On-chain movement proves settlement, not commercial purpose or earned revenue.

import type { NormalizedTransaction } from "./chain-fetcher";

export type Classification =
  | "revenue_candidate"
  | "unresolved_inflow"
  | "inference_spend"
  | "treasury_movement"
  | "token_distribution"
  | "external_expense"
  | "unknown";

export interface ClassifiedEvent {
  txHash: string;
  chain: string;
  observed_at: string;
  direction: "inbound" | "outbound";
  assetSymbol: string;
  rawValue: string;
  valueUsd?: number;
  from: string;
  to: string;
  isERC20: boolean;
  classification: Classification;
  classification_reason: string;
  confidence: "high" | "medium" | "low";
  recognition_status: "not_revenue" | "unresolved" | "candidate";
  evidence_basis: "onchain_only";
}

const STABLECOINS_BY_CHAIN: Record<string, Set<string>> = {
  base: new Set([
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca",
    "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
  ]),
  ethereum: new Set([
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "0x6b175474e89094c44da98b954eedeac495271d0f",
  ]),
  arbitrum: new Set([
    "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  ]),
  optimism: new Set([
    "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    "0x94b008aa00579c1307b0ef2c499ab98a8ce58e58",
  ]),
  polygon: new Set([
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  ]),
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isStablecoin(tx: Pick<NormalizedTransaction, "chain" | "assetAddress">): boolean {
  if (!tx.assetAddress) return false;
  return STABLECOINS_BY_CHAIN[tx.chain]?.has(tx.assetAddress.toLowerCase()) ?? false;
}

export function classifyTransaction(
  tx: NormalizedTransaction,
  ownWallets: Set<string>,
  registryWallets: Set<string>,
  knownInferenceContracts: Set<string> = new Set(),
): ClassifiedEvent {
  const from = tx.from.toLowerCase();
  const to = tx.to.toLowerCase();
  const base = {
    txHash: tx.txHash,
    chain: tx.chain,
    observed_at: tx.timestamp,
    direction: tx.direction,
    assetSymbol: tx.assetSymbol,
    rawValue: tx.rawValue,
    valueUsd: tx.valueUsd,
    from,
    to,
    isERC20: tx.isERC20,
    evidence_basis: "onchain_only" as const,
  };
  const result = (
    classification: Classification,
    classification_reason: string,
    confidence: "high" | "medium" | "low",
    recognition_status: ClassifiedEvent["recognition_status"],
  ): ClassifiedEvent => ({ ...base, classification, classification_reason, confidence, recognition_status });

  if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
    return result("unknown", "Zero address involved — mint or burn, not operating revenue", "low", "not_revenue");
  }
  if (ownWallets.has(from) && ownWallets.has(to)) {
    return result("treasury_movement", "Transfer between wallets declared for the same agent", "high", "not_revenue");
  }
  if (tx.direction === "outbound") {
    if (knownInferenceContracts.has(to)) return result("inference_spend", "Payment to a known inference or service contract", "high", "not_revenue");
    if (tx.isERC20 && !isStablecoin(tx)) return result("token_distribution", "Outbound non-stablecoin token movement", "medium", "not_revenue");
    if (registryWallets.has(to)) return result("inference_spend", "Outbound payment to another manifest-declared wallet; commercial purpose is unproven", "medium", "not_revenue");
    return result("external_expense", "Outbound value to an unregistered address; expense purpose is unresolved", "low", "not_revenue");
  }
  if (ownWallets.has(from)) {
    return result("treasury_movement", "Inbound value from a wallet declared for the same agent", "high", "not_revenue");
  }
  if (registryWallets.has(from)) {
    return result("revenue_candidate", "Inbound from another manifest-declared wallet; attribution is known but commercial purpose and delivery are unproven", "medium", "candidate");
  }
  if (isStablecoin(tx)) {
    return result("unresolved_inflow", "Inbound stablecoin settlement with no linked commercial or delivery evidence", "high", "unresolved");
  }
  return result("unknown", "No reliable economic-purpose signal", "low", "unresolved");
}

export type EvidenceStatus = "speculative" | "inferred" | "attributed" | "observed" | "verified";
const EVIDENCE_ORDER: EvidenceStatus[] = ["speculative", "inferred", "attributed", "observed", "verified"];

export function evidenceRank(status: string): number {
  const idx = EVIDENCE_ORDER.indexOf(status as EvidenceStatus);
  return idx === -1 ? 0 : idx;
}

export function computeEvidenceUpgrade(
  currentStatus: string,
  events: ClassifiedEvent[],
  _registryWallets: Set<string>,
): EvidenceStatus | null {
  const observed = events.some((event) =>
    event.classification !== "unknown" && event.classification !== "token_distribution",
  );
  if (!observed) return null;

  // Wallet activity can prove observation only. Verified revenue requires a
  // separate commercial event, delivery proof, allocation, and recognition decision.
  const target: EvidenceStatus = "observed";
  return evidenceRank(target) > evidenceRank(currentStatus) ? target : null;
}
