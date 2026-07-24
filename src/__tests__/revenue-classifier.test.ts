import { describe, expect, test } from "bun:test";
import { classifyTransaction, computeEvidenceUpgrade, isStablecoin } from "@/lib/truth-engine/revenue-classifier";
import type { NormalizedTransaction } from "@/lib/truth-engine/chain-fetcher";

const REAL_USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const FAKE_USDC = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const AGENT_WALLET = "0x1111111111111111111111111111111111111111";
const RANDOM_SENDER = "0x2222222222222222222222222222222222222222";
const OTHER_AGENT = "0x3333333333333333333333333333333333333333";

function tx(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    txHash: "0xabc", blockNumber: 1, timestamp: "2026-07-21T00:00:00Z",
    direction: "inbound", from: RANDOM_SENDER, to: AGENT_WALLET,
    assetSymbol: "USDC", assetAddress: REAL_USDC_BASE, rawValue: "1000000",
    valueUsd: 100, isERC20: true, chain: "base", ...overrides,
  };
}

const own = new Set([AGENT_WALLET]);
const registry = new Set([AGENT_WALLET, OTHER_AGENT]);

describe("stablecoin address integrity", () => {
  test("matches the real chain-specific contract", () => expect(isStablecoin({ chain: "base", assetAddress: REAL_USDC_BASE })).toBe(true));
  test("rejects spoofed symbols and missing addresses", () => {
    expect(isStablecoin({ chain: "base", assetAddress: FAKE_USDC })).toBe(false);
    expect(isStablecoin({ chain: "base", assetAddress: undefined })).toBe(false);
  });
});

describe("conservative inbound classification", () => {
  test("unknown stablecoin inflow remains unresolved", () => {
    const event = classifyTransaction(tx(), own, registry);
    expect(event.classification).toBe("unresolved_inflow");
    expect(event.recognition_status).toBe("unresolved");
    expect(event.evidence_basis).toBe("onchain_only");
  });
  test("another registered wallet creates a candidate, never recognized revenue", () => {
    const event = classifyTransaction(tx({ from: OTHER_AGENT }), own, registry);
    expect(event.classification).toBe("revenue_candidate");
    expect(event.recognition_status).toBe("candidate");
    expect(event.confidence).toBe("medium");
  });
  test("fake USDC cannot become an inflow candidate", () => expect(classifyTransaction(tx({ assetAddress: FAKE_USDC }), own, registry).classification).toBe("unknown"));
  test("own-wallet transfer is never revenue", () => {
    const event = classifyTransaction(tx({ from: AGENT_WALLET }), own, registry);
    expect(event.classification).toBe("treasury_movement");
    expect(event.recognition_status).toBe("not_revenue");
  });
});

describe("evidence upgrade ceiling", () => {
  test("many inflows can prove observation but never verification", () => {
    const events = [RANDOM_SENDER, OTHER_AGENT, "0x4444444444444444444444444444444444444444"].map((from) => classifyTransaction(tx({ from }), own, registry));
    expect(computeEvidenceUpgrade("attributed", events, registry)).toBe("observed");
    expect(computeEvidenceUpgrade("observed", events, registry)).toBeNull();
  });
});
