// Classification integrity tests — stablecoin matching is by contract address
// only. A spoofed token with the symbol "USDC" must never classify as revenue.
// Run with: bun test src/__tests__/revenue-classifier.test.ts

import { describe, expect, test } from "bun:test";
import { classifyTransaction, isStablecoin } from "@/lib/truth-engine/revenue-classifier";
import type { NormalizedTransaction } from "@/lib/truth-engine/chain-fetcher";

const REAL_USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const FAKE_USDC      = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const AGENT_WALLET   = "0x1111111111111111111111111111111111111111";
const RANDOM_SENDER  = "0x2222222222222222222222222222222222222222";

function tx(overrides: Partial<NormalizedTransaction>): NormalizedTransaction {
  return {
    txHash:      "0xabc",
    blockNumber: 1,
    timestamp:   "2026-07-21T00:00:00Z",
    direction:   "inbound",
    from:        RANDOM_SENDER,
    to:          AGENT_WALLET,
    assetSymbol: "USDC",
    assetAddress: REAL_USDC_BASE,
    rawValue:    "1000000",
    valueUsd:    100,
    isERC20:     true,
    chain:       "base",
    ...overrides,
  };
}

describe("isStablecoin — address-only matching", () => {
  test("real USDC contract on Base is a stablecoin", () => {
    expect(isStablecoin({ chain: "base", assetAddress: REAL_USDC_BASE })).toBe(true);
  });

  test("spoofed token named USDC with unknown contract is NOT a stablecoin", () => {
    expect(isStablecoin({ chain: "base", assetAddress: FAKE_USDC })).toBe(false);
  });

  test("missing asset address is never a stablecoin", () => {
    expect(isStablecoin({ chain: "base", assetAddress: undefined })).toBe(false);
  });

  test("real USDC address on the wrong chain does not match", () => {
    expect(isStablecoin({ chain: "ethereum", assetAddress: REAL_USDC_BASE })).toBe(false);
  });
});

describe("classifyTransaction — spoofed symbols cannot become revenue", () => {
  const own = new Set([AGENT_WALLET]);
  const registry = new Set([AGENT_WALLET]);

  test("inbound real USDC from unknown source → fee_received (medium)", () => {
    const e = classifyTransaction(tx({}), own, registry);
    expect(e.classification).toBe("fee_received");
    expect(e.confidence).toBe("medium");
  });

  test("inbound FAKE 'USDC' from unknown source → unknown, never fee_received", () => {
    const e = classifyTransaction(tx({ assetAddress: FAKE_USDC }), own, registry);
    expect(e.classification).toBe("unknown");
  });

  test("inbound FAKE 'USDT' with uppercase symbol tricks nothing", () => {
    const e = classifyTransaction(
      tx({ assetSymbol: "USDT", assetAddress: FAKE_USDC }),
      own, registry,
    );
    expect(e.classification).toBe("unknown");
  });

  test("outbound FAKE stablecoin is token_distribution, not expense", () => {
    const e = classifyTransaction(
      tx({ direction: "outbound", from: AGENT_WALLET, to: RANDOM_SENDER, assetAddress: FAKE_USDC }),
      own, registry,
    );
    expect(e.classification).toBe("token_distribution");
  });
});
