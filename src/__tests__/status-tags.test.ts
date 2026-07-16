// P0 status-tag derivation tests.
// The wallet/profile derivations are executable documentation of the SQL
// trigger contract in supabase/migrations/20260715000001_registry_status_tags.sql —
// if these change, the triggers must change with them.
//
// Run with: bun test src/__tests__/status-tags.test.ts

import { describe, expect, test } from "bun:test";
import {
  BOOKS_CACHE_TTL_MS,
  DATA_FRESHNESS_MS,
  deriveBooksStatus,
  deriveDataStatus,
  deriveProfileStatus,
  deriveWalletStatus,
} from "../lib/status-tags";
import type { AgentWallet, VerificationStatus } from "../app/registry/types";

const NOW = Date.parse("2026-07-15T12:00:00Z");

function iso(msAgo: number): string {
  return new Date(NOW - msAgo).toISOString();
}

function makeWallet(overrides: Partial<AgentWallet> = {}): AgentWallet {
  return {
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    label: "candidate wallet",
    ...overrides,
  };
}

// ── deriveBooksStatus ─────────────────────────────────────────────────────────

describe("deriveBooksStatus", () => {
  test("no eligible wallets → no_books (even with a cache row)", () => {
    expect(deriveBooksStatus(0, iso(1000), NOW)).toBe("no_books");
    expect(deriveBooksStatus(0, null, NOW)).toBe("no_books");
  });

  test("eligible wallets but no cache row → pending", () => {
    expect(deriveBooksStatus(2, null, NOW)).toBe("pending");
  });

  test("cache within TTL → live", () => {
    expect(deriveBooksStatus(1, iso(BOOKS_CACHE_TTL_MS - 1000), NOW)).toBe("live");
    expect(deriveBooksStatus(1, iso(0), NOW)).toBe("live");
  });

  test("cache just past TTL → stale", () => {
    expect(deriveBooksStatus(1, iso(BOOKS_CACHE_TTL_MS + 1000), NOW)).toBe("stale");
  });

  test("unparseable computed_at → pending", () => {
    expect(deriveBooksStatus(1, "not-a-date", NOW)).toBe("pending");
  });
});

// ── deriveDataStatus ──────────────────────────────────────────────────────────

describe("deriveDataStatus", () => {
  test("null / undefined last_checked → partial", () => {
    expect(deriveDataStatus(null, NOW)).toBe("partial");
    expect(deriveDataStatus(undefined, NOW)).toBe("partial");
  });

  test("unparseable last_checked → partial", () => {
    expect(deriveDataStatus("garbage", NOW)).toBe("partial");
  });

  test("checked 6 days ago → fresh", () => {
    expect(deriveDataStatus(iso(6 * 24 * 60 * 60 * 1000), NOW)).toBe("fresh");
  });

  test("checked 8 days ago → stale", () => {
    expect(deriveDataStatus(iso(8 * 24 * 60 * 60 * 1000), NOW)).toBe("stale");
  });

  test("threshold boundary: exactly the freshness window → fresh", () => {
    expect(deriveDataStatus(iso(DATA_FRESHNESS_MS), NOW)).toBe("fresh");
  });
});

// ── deriveWalletStatus (mirror of derive_wallet_status SQL) ───────────────────

describe("deriveWalletStatus", () => {
  test("no wallets → none", () => {
    expect(deriveWalletStatus([])).toBe("none");
  });

  test("any confirmed wallet → verified (beats manifest)", () => {
    expect(deriveWalletStatus([
      makeWallet({ confidence: "confirmed" }),
      makeWallet({ evidenceSource: "manifest" }),
    ])).toBe("verified");
  });

  test("manifest evidence without confirmation → declared", () => {
    expect(deriveWalletStatus([
      makeWallet({ evidenceSource: "manifest", confidence: "declared" }),
      makeWallet({ evidenceSource: "admin" }),
    ])).toBe("declared");
  });

  test("all wallets disqualified by classification → rejected", () => {
    expect(deriveWalletStatus([
      makeWallet({ evidenceSource: "admin", address_type: "token_contract", booksEligible: false }),
      makeWallet({ evidenceSource: "admin", address_type: "vault", booksEligible: false }),
    ])).toBe("rejected");
  });

  test("unclassified admin wallets → candidate (not rejected)", () => {
    expect(deriveWalletStatus([
      makeWallet({ evidenceSource: "admin", address_type: undefined }),
    ])).toBe("candidate");
  });

  test("eoa wallet without manifest → candidate", () => {
    expect(deriveWalletStatus([
      makeWallet({ evidenceSource: "admin", address_type: "eoa", booksEligible: false }),
    ])).toBe("candidate");
  });
});

// ── deriveProfileStatus (mirror of compute_profile_status SQL) ────────────────

describe("deriveProfileStatus", () => {
  const cases: [VerificationStatus | null, string][] = [
    ["Candidate", "candidate"],
    ["Awaiting Manifest", "candidate"],
    ["Needs Verification", "needs_verification"],
    ["Wallets Declared", "needs_verification"],
    ["Claimed", "needs_verification"],
    ["Verified", "verified"],
    ["Luca Managed", "verified"],
    ["ERC-8004 Indexed", "verified"],
    [null, "candidate"],
  ];

  for (const [input, expected] of cases) {
    test(`${input ?? "null"} → ${expected}`, () => {
      expect(deriveProfileStatus(input)).toBe(expected);
    });
  }
});
