// Registry terminal filter tests — P2.
// Covers every RegistryView predicate branch and asserts the status meta
// maps stay exhaustive against the type-level const arrays.
//
// Run with: bun test src/__tests__/registry-filters.test.ts

import { describe, expect, test } from "bun:test";
import {
  BOOKS_STATUS_META,
  PROFILE_STATUS_META,
  REGISTRY_VIEWS,
  WALLET_STATUS_META,
  isRegistryView,
  matchesView,
  type RegistryView,
} from "../app/registry/filters";
import {
  BOOKS_STATUSES,
  PROFILE_STATUSES,
  WALLET_STATUSES,
  type BooksStatus,
  type DataStatus,
  type ProfileStatus,
  type WalletStatus,
} from "../app/registry/types";

function agent(overrides: Partial<{
  profileStatus: ProfileStatus;
  walletStatus: WalletStatus;
  booksStatus: BooksStatus;
  dataStatus: DataStatus;
}> = {}) {
  return {
    profileStatus: "candidate" as ProfileStatus,
    walletStatus: "none" as WalletStatus,
    booksStatus: "no_books" as BooksStatus,
    dataStatus: "fresh" as DataStatus,
    ...overrides,
  };
}

describe("matchesView", () => {
  test("all matches everything", () => {
    expect(matchesView(agent(), "all")).toBe(true);
    expect(matchesView(agent({ profileStatus: "verified", booksStatus: "live" }), "all")).toBe(true);
  });

  test("verified / needs_verification key off profileStatus", () => {
    expect(matchesView(agent({ profileStatus: "verified" }), "verified")).toBe(true);
    expect(matchesView(agent({ profileStatus: "candidate" }), "verified")).toBe(false);
    expect(matchesView(agent({ profileStatus: "needs_verification" }), "needs_verification")).toBe(true);
    expect(matchesView(agent({ profileStatus: "verified" }), "needs_verification")).toBe(false);
  });

  test("no_manifest matches walletStatus none AND candidate, not declared", () => {
    expect(matchesView(agent({ walletStatus: "none" }), "no_manifest")).toBe(true);
    expect(matchesView(agent({ walletStatus: "candidate" }), "no_manifest")).toBe(true);
    expect(matchesView(agent({ walletStatus: "declared" }), "no_manifest")).toBe(false);
    expect(matchesView(agent({ walletStatus: "verified" }), "no_manifest")).toBe(false);
  });

  test("live_books requires booksStatus live exactly", () => {
    expect(matchesView(agent({ booksStatus: "live" }), "live_books")).toBe(true);
    expect(matchesView(agent({ booksStatus: "stale" }), "live_books")).toBe(false);
    expect(matchesView(agent({ booksStatus: "pending" }), "live_books")).toBe(false);
  });

  test("stale matches via dataStatus alone, booksStatus alone, or both", () => {
    expect(matchesView(agent({ dataStatus: "stale" }), "stale")).toBe(true);
    expect(matchesView(agent({ booksStatus: "stale" }), "stale")).toBe(true);
    expect(matchesView(agent({ dataStatus: "stale", booksStatus: "stale" }), "stale")).toBe(true);
    expect(matchesView(agent({ dataStatus: "fresh", booksStatus: "live" }), "stale")).toBe(false);
    expect(matchesView(agent({ dataStatus: "partial" }), "stale")).toBe(false);
  });
});

describe("isRegistryView", () => {
  test("accepts every declared view, rejects junk", () => {
    for (const v of REGISTRY_VIEWS) {
      expect(isRegistryView(v.value)).toBe(true);
    }
    expect(isRegistryView("bogus")).toBe(false);
    expect(isRegistryView("")).toBe(false);
  });

  test("declared views are unique", () => {
    const values = REGISTRY_VIEWS.map((v) => v.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("status meta maps are exhaustive with non-empty copy", () => {
  test("PROFILE_STATUS_META covers PROFILE_STATUSES", () => {
    for (const s of PROFILE_STATUSES) {
      expect(PROFILE_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(PROFILE_STATUS_META[s].tip.length).toBeGreaterThan(0);
    }
  });

  test("BOOKS_STATUS_META covers BOOKS_STATUSES", () => {
    for (const s of BOOKS_STATUSES) {
      expect(BOOKS_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(BOOKS_STATUS_META[s].tip.length).toBeGreaterThan(0);
    }
  });

  test("WALLET_STATUS_META covers WALLET_STATUSES", () => {
    for (const s of WALLET_STATUSES) {
      expect(WALLET_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(WALLET_STATUS_META[s].tip.length).toBeGreaterThan(0);
    }
  });
});

// Exhaustiveness guard: if a new RegistryView is added without a predicate,
// matchesView's switch stops compiling; this documents the runtime contract.
describe("every view has a working predicate", () => {
  const fixtures: Record<RegistryView, Parameters<typeof matchesView>[0]> = {
    all: agent(),
    verified: agent({ profileStatus: "verified" }),
    needs_verification: agent({ profileStatus: "needs_verification" }),
    no_manifest: agent({ walletStatus: "none" }),
    live_books: agent({ booksStatus: "live" }),
    stale: agent({ dataStatus: "stale" }),
  };
  for (const { value } of REGISTRY_VIEWS) {
    test(`${value} matches its own fixture`, () => {
      expect(matchesView(fixtures[value], value)).toBe(true);
    });
  }
});
