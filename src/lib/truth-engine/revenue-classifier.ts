// Deterministic revenue classifier. Pure function — no DB calls, no side effects.
// Rules applied in strict priority order. Unknown is a valid and expected output.
// Conservative by design: never auto-upgrades ambiguous activity to revenue.

import type { NormalizedTransaction } from "./chain-fetcher";

export type Classification =
  | "settlement_revenue"
  | "fee_received"
  | "inference_spend"
  | "treasury_movement"
  | "token_distribution"
  | "external_expense"
  | "unknown";

export interface ClassifiedEvent {
  txHash:                string;
  chain:                 string;
  observed_at:           string;
  direction:             "inbound" | "outbound";
  assetSymbol:           string;
  rawValue:              string;
  valueUsd?:             number;
  from:                  string;
  to:                    string;
  isERC20:               boolean;
  classification:        Classification;
  classification_reason: string;
  confidence:            "high" | "medium" | "low";
}

// ── Known stablecoin contract addresses (lowercase) ───────────────────────────
// Inbound stablecoin → fee_received (medium confidence), not automatic revenue.

const STABLECOINS_BY_CHAIN: Record<string, Set<string>> = {
  base: new Set([
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC native
    "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", // USDbC bridged
    "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI
  ]),
  ethereum: new Set([
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  ]),
  arbitrum: new Set([
    "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", // USDC.e
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC native
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", // USDT
  ]),
  optimism: new Set([
    "0x7f5c764cbc14f9669b88837ca1490cca17c31607", // USDC.e
    "0x0b2c639c533813f4aa9d7837caf62653d097ff85", // USDC native
    "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58", // USDT
  ]),
  polygon: new Set([
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC.e
    "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC native
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
  ]),
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Stablecoin matching is by CONTRACT ADDRESS ONLY. Symbol matching was removed:
// anyone can deploy a token named "USDC", and a symbol match would let spoofed
// tokens classify as fee_received and inflate revenue. A transfer with no
// assetAddress (native ETH) or an unrecognized address is never a stablecoin.
export function isStablecoin(tx: Pick<NormalizedTransaction, "chain" | "assetAddress">): boolean {
  if (!tx.assetAddress) return false;
  return STABLECOINS_BY_CHAIN[tx.chain]?.has(tx.assetAddress.toLowerCase()) ?? false;
}

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyTransaction(
  tx:                      NormalizedTransaction,
  ownWallets:              Set<string>,    // agent's own declared addresses (lowercase)
  registryWallets:         Set<string>,    // all manifest-declared addresses across all agents
  knownInferenceContracts: Set<string> = new Set(),
): ClassifiedEvent {
  const from = tx.from.toLowerCase();
  const to   = tx.to.toLowerCase();

  const base: Omit<ClassifiedEvent, "classification" | "classification_reason" | "confidence"> = {
    txHash:      tx.txHash,
    chain:       tx.chain,
    observed_at: tx.timestamp,
    direction:   tx.direction,
    assetSymbol: tx.assetSymbol,
    rawValue:    tx.rawValue,
    valueUsd:    tx.valueUsd,
    from,
    to,
    isERC20:     tx.isERC20,
  };

  const result = (
    classification:        Classification,
    classification_reason: string,
    confidence:            "high" | "medium" | "low",
  ): ClassifiedEvent => ({ ...base, classification, classification_reason, confidence });

  // ── Hard skip: zero address ───────────────────────────────────────────────
  if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
    return result("unknown", "Zero address involved — mint or burn, not operational", "low");
  }

  // ── Rule 1: Own-wallet transfer (highest priority, both sides declared) ───
  if (ownWallets.has(from) && ownWallets.has(to)) {
    return result("treasury_movement", "Transfer between agent's own declared wallets", "high");
  }

  // ── Outbound rules ────────────────────────────────────────────────────────
  if (tx.direction === "outbound") {
    if (knownInferenceContracts.has(to)) {
      return result("inference_spend", "Payment to known inference/service contract", "high");
    }
    // Outbound non-stablecoin ERC-20 = token distribution, not expense
    if (tx.isERC20 && !isStablecoin(tx)) {
      return result("token_distribution", "Outbound non-stablecoin ERC-20 — token distribution, not revenue", "medium");
    }
    // Outbound to a wallet declared by another agent
    if (registryWallets.has(to)) {
      return result("inference_spend", "Outbound stablecoin/ETH to another manifest-declared wallet", "medium");
    }
    return result("external_expense", "Outbound to unknown/unregistered address", "low");
  }

  // ── Inbound rules ─────────────────────────────────────────────────────────
  // Inbound from own wallet (Rule 1 catches both-own; this catches single-side edge case)
  if (ownWallets.has(from)) {
    return result("treasury_movement", "Inbound from agent's own declared wallet", "high");
  }
  // Inbound from another registered agent's wallet = settlement revenue
  if (registryWallets.has(from)) {
    return result("settlement_revenue", "Inbound from another manifest-declared agent wallet", "high");
  }
  // Inbound stablecoin from unknown source
  if (isStablecoin(tx)) {
    return result("fee_received", "Inbound stablecoin from unknown source — possible service fee", "medium");
  }
  // Everything else
  return result("unknown", "No reliable classification signal", "low");
}

// ── Evidence upgrade logic ────────────────────────────────────────────────────

export type EvidenceStatus = "speculative" | "inferred" | "attributed" | "observed" | "verified";

const EVIDENCE_ORDER: EvidenceStatus[] = [
  "speculative", "inferred", "attributed", "observed", "verified",
];

export function evidenceRank(status: string): number {
  const idx = EVIDENCE_ORDER.indexOf(status as EvidenceStatus);
  return idx === -1 ? 0 : idx;
}

export function computeEvidenceUpgrade(
  currentStatus:   string,
  events:          ClassifiedEvent[],
  registryWallets: Set<string>,
): EvidenceStatus | null {
  // Only meaningful events count (not unknown or pure token_distribution)
  const meaningful = events.filter(
    (e) => e.classification !== "unknown" && e.classification !== "token_distribution",
  );
  if (meaningful.length === 0) return null;

  // Verified: strong evidence required
  const settlementFromRegistry = events.some(
    (e) => e.classification === "settlement_revenue" && registryWallets.has(e.from),
  );
  const distinctFeeCounterparties = new Set(
    events.filter((e) => e.classification === "fee_received").map((e) => e.from),
  ).size;

  const target: EvidenceStatus =
    settlementFromRegistry || distinctFeeCounterparties >= 3 ? "verified" : "observed";

  return evidenceRank(target) > evidenceRank(currentStatus) ? target : null;
}
