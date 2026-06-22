// Revenue Classification v2 — exclusion registries.
//
// These address lists prevent known non-operating flows from polluting
// agent revenue and expense figures. Updated as new protocols emerge.
//
// Sources:
//   Bridge contracts — official deployment addresses from each protocol's docs
//   DEX routers     — official router/aggregator addresses on Base
//   Grant programs  — known ecosystem grant distribution addresses

// ── Bridge contracts (Base) ───────────────────────────────────────────────────
// Outbound bridge transfers are not operating expenses.
// Inbound bridge receipts are not operating revenue.

export const BRIDGE_CONTRACTS = new Set([
  // Across Protocol
  "0x09aea4b2242abc8bb4bb78d537a67a245a7bec64",
  // Stargate Finance
  "0x45f1a95a4d3f3836523f5c83673c797f4d4d263b",
  // Hop Protocol
  "0x3666f603cc164936c1b87e207f36beba4ac5f18a",
  // Optimism Bridge / Standard Bridge
  "0x4200000000000000000000000000000000000010",
  // Base Bridge (native L1→L2)
  "0x49048044d57e1c92a77f79988d21fa8faf74e97e",
  "0x3154cf16ccdb4c6d922629664174b904d80f2c35",
  // Superbridge / Relay
  "0x3a23f943181408eac424116af7b7790c94cb97a5",
  // Wormhole Token Bridge
  "0x8d2de8d2f73f1f4cab472ac9a881c9b123c79627",
  // deBridge
  "0x43de2d77bf8027e25dbd179b491e8d64f38398aa",
]);

// ── DEX routers & aggregators (Base) ─────────────────────────────────────────
// Token swaps via routers are not revenue or expenses.
// This supplements the txHash dual-direction check in agent-books.ts.

export const DEX_ROUTERS = new Set([
  // Uniswap v3 — Universal Router
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
  // Uniswap v3 — SwapRouter02
  "0x2626664c2603336e57b271c5c0b26f421741e481",
  // Aerodrome Finance
  "0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43",
  // Velodrome
  "0xa132dab612db5cb9fc9ac426a0cc215a3423f9c9",
  // 1inch v5 Aggregator
  "0x1111111254eeb25477b68fb85ed929f73a960582",
  // 1inch v6 Aggregator
  "0x111111125421ca6dc452d289314280a0f8842a65",
  // Odos Router v2
  "0x19ceead7105607cd444f5ad10dd51356b95839b3",
  // Paraswap v6
  "0x6a000f20005980200259b80c5102003040001068",
  // Matcha / 0x Protocol
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  // BaseSwap
  "0x327df1e6de05895d2ab08513aadd9313fe505d86",
  // PancakeSwap v3 Router
  "0x1b81d678ffb9c0263b24a97847620c99d213eb14",
]);

// ── Known grant / ecosystem program addresses ─────────────────────────────────
// Inflows from these addresses are tagged as "grant" not operating revenue.
// Conservative list — add only confirmed addresses.

export const KNOWN_GRANT_ADDRESSES = new Set([
  // Base Grants (Coinbase ecosystem)
  "0x3304e22ddaa22bcdc5fca2269b418046ae7b566a",
  // Optimism Foundation RetroPGF
  "0x2501c477d0a35545a387aa4a3eee4292a9a8b3f0",
  // Virtuals Protocol treasury
  "0x2d2cd62e6a1ed48b41de2698bf3e5e9c31f15878",
]);

// ── Capital injection thresholds ──────────────────────────────────────────────

// Single inflow above this USD value from an unknown counterparty is flagged
// as a suspected capital injection, removed from operating revenue, and placed
// in quarantined_inflows for admin review.
export const CAPITAL_INJECTION_THRESHOLD_USD = 10_000;

// If a counterparty has sent this many or more prior transactions, the inflow
// is NOT flagged (it's a known business relationship).
export const KNOWN_COUNTERPARTY_MIN_INTERACTIONS = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isBridgeContract(address: string): boolean {
  return BRIDGE_CONTRACTS.has(address.toLowerCase());
}

export function isDexRouter(address: string): boolean {
  return DEX_ROUTERS.has(address.toLowerCase());
}

export function isKnownGrantAddress(address: string): boolean {
  return KNOWN_GRANT_ADDRESSES.has(address.toLowerCase());
}

export type QuarantineReason =
  | "capital_injection"   // large single inflow from unknown counterparty
  | "grant_program"       // inflow from known grant/ecosystem address
  | "bridge_receipt"      // inbound bridge transfer
  | "token_distribution"  // non-stablecoin inflow with no prior relationship
  | "unknown_large_inflow"; // > threshold, can't classify further

export function getQuarantineReason(
  address: string,
  usdValue: number,
  priorInteractions: number,
  isStablecoin: boolean,
): QuarantineReason | null {
  if (isKnownGrantAddress(address)) return "grant_program";
  if (isBridgeContract(address)) return "bridge_receipt";
  // $0-value non-stablecoins are always token distributions — junk tokens
  // sent by airdrop bots regardless of how many prior interactions exist.
  if (!isStablecoin && usdValue === 0) return "token_distribution";
  if (!isStablecoin && priorInteractions < KNOWN_COUNTERPARTY_MIN_INTERACTIONS) {
    return "token_distribution";
  }
  if (
    usdValue >= CAPITAL_INJECTION_THRESHOLD_USD &&
    priorInteractions < KNOWN_COUNTERPARTY_MIN_INTERACTIONS
  ) {
    return "capital_injection";
  }
  return null;
}
