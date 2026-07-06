// Books eligibility invariant tests — P0-3
// Covers all branches of isBooksEligibleWallet and validates that the
// TypeScript logic agrees with the documented DB trigger invariants.
//
// Run with: bun test src/__tests__/wallet-eligibility.test.ts

import { describe, expect, test } from "bun:test";
import { isBooksEligibleWallet, BOOKS_ELIGIBLE_ADDRESS_TYPES } from "../lib/wallet-eligibility";
import type { AgentWallet } from "../app/registry/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWallet(overrides: Partial<AgentWallet> = {}): AgentWallet {
  return {
    address:        "0xabcdef1234567890abcdef1234567890abcdef12",
    label:          "Treasury",
    role:           "treasury",
    address_type:   "eoa",
    evidenceSource: "manifest",
    ...overrides,
  } as AgentWallet;
}

// ── BOOKS_ELIGIBLE_ADDRESS_TYPES set ─────────────────────────────────────────

describe("BOOKS_ELIGIBLE_ADDRESS_TYPES", () => {
  test("includes eoa, treasury_contract, smart_account", () => {
    expect(BOOKS_ELIGIBLE_ADDRESS_TYPES.has("eoa")).toBe(true);
    expect(BOOKS_ELIGIBLE_ADDRESS_TYPES.has("treasury_contract")).toBe(true);
    expect(BOOKS_ELIGIBLE_ADDRESS_TYPES.has("smart_account")).toBe(true);
  });

  test("excludes token_contract and unknown types", () => {
    expect(BOOKS_ELIGIBLE_ADDRESS_TYPES.has("token_contract")).toBe(false);
    expect(BOOKS_ELIGIBLE_ADDRESS_TYPES.has("unknown")).toBe(false);
    expect(BOOKS_ELIGIBLE_ADDRESS_TYPES.has("")).toBe(false);
  });
});

// ── Invariant 1: No manifest = no books ──────────────────────────────────────

describe("invariant: no manifest = no books", () => {
  test("rejects wallet with evidenceSource = 'observed'", () => {
    const w = makeWallet({ evidenceSource: "observed" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("evidenceSource=observed");
  });

  test("rejects wallet with evidenceSource = 'claimed'", () => {
    const w = makeWallet({ evidenceSource: "claimed" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("evidenceSource=claimed");
  });

  test("rejects wallet with empty evidenceSource", () => {
    const w = makeWallet({ evidenceSource: "" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("evidenceSource=empty");
  });

  test("rejects wallet with null evidenceSource", () => {
    const w = makeWallet({ evidenceSource: null as unknown as string });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
  });

  test("rejects wallet with undefined evidenceSource", () => {
    const w = makeWallet({ evidenceSource: undefined as unknown as string });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
  });
});

// ── Invariant 2: address_type must be eoa / treasury_contract / smart_account ─

describe("invariant: ineligible address_type = no books", () => {
  test("rejects token_contract address_type", () => {
    const w = makeWallet({ address_type: "token_contract" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("address_type=token_contract");
  });

  test("rejects unknown address_type", () => {
    const w = makeWallet({ address_type: "unknown" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
  });

  test("rejects empty address_type", () => {
    const w = makeWallet({ address_type: "" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("address_type=unknown");
  });
});

// ── Invariant 3: token contract address match ─────────────────────────────────

describe("invariant: token contract wallets are never books-eligible", () => {
  const TOKEN = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";

  test("rejects wallet whose address matches the agent token contract (exact)", () => {
    const w = makeWallet({ address: TOKEN });
    const result = isBooksEligibleWallet(w, TOKEN);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("token contract");
  });

  test("rejects case-insensitive address match", () => {
    const w = makeWallet({ address: TOKEN.toUpperCase() });
    const result = isBooksEligibleWallet(w, TOKEN.toLowerCase());
    expect(result.eligible).toBe(false);
  });

  test("does NOT reject unrelated wallet when token address is set", () => {
    const w = makeWallet({ address: "0x1111111111111111111111111111111111111111" });
    const result = isBooksEligibleWallet(w, TOKEN);
    expect(result.eligible).toBe(true);
  });

  test("does NOT reject when no token address provided", () => {
    const w = makeWallet({ address: TOKEN });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
  });
});

// ── Invariant 4: role token_contract / token ──────────────────────────────────

describe("invariant: token roles are never books-eligible", () => {
  test("rejects role = token_contract", () => {
    const w = makeWallet({ role: "token_contract" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("role=token_contract");
  });

  test("rejects role = token", () => {
    const w = makeWallet({ role: "token" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("role=token");
  });

  test("accepts role = treasury", () => {
    const w = makeWallet({ role: "treasury" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
  });

  test("accepts role = operator", () => {
    const w = makeWallet({ role: "operator" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("happy path: valid manifest wallet is books-eligible", () => {
  test("eoa + manifest → eligible", () => {
    const w = makeWallet({ address_type: "eoa", evidenceSource: "manifest", role: "treasury" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeNull();
  });

  test("treasury_contract + manifest → eligible", () => {
    const w = makeWallet({ address_type: "treasury_contract", evidenceSource: "manifest" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeNull();
  });

  test("smart_account + manifest → eligible", () => {
    const w = makeWallet({ address_type: "smart_account", evidenceSource: "manifest" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeNull();
  });

  test("evidenceSource case-insensitive: MANIFEST → eligible", () => {
    const w = makeWallet({ evidenceSource: "MANIFEST" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
  });

  test("address_type case-insensitive: EOA → eligible", () => {
    const w = makeWallet({ address_type: "EOA" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(true);
  });
});

// ── Priority ordering ─────────────────────────────────────────────────────────
// evidenceSource check must fire before address_type check

describe("check ordering: evidenceSource checked before address_type", () => {
  test("no-manifest wallet with eligible address_type still returns evidenceSource rejection", () => {
    const w = makeWallet({ evidenceSource: "observed", address_type: "eoa" });
    const result = isBooksEligibleWallet(w);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("evidenceSource");
  });
});
