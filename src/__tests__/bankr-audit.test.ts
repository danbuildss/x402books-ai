// Bankr data-audit derivation tests — P1.
// Pure-helper coverage: the "—" ticker sentinel, strict-vs-stored metadata
// delta, duplicate grouping, and the books-bucket sum invariant.
//
// Run with: bun test src/__tests__/bankr-audit.test.ts

import { describe, expect, test } from "bun:test";
import {
  buildAuditRow,
  buildCounts,
  buildDuplicateGroups,
  isMetadataCompleteStrict,
  isMissingTicker,
} from "../lib/bankr-audit";
import type { Agent, AgentWallet } from "../app/registry/types";

function makeWallet(overrides: Partial<AgentWallet> = {}): AgentWallet {
  return {
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    label: "candidate wallet",
    ...overrides,
  };
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    name: "Test Agent",
    slug: "test-agent",
    symbol: "$TEST",
    ecosystem: "BANKR",
    xHandle: "@test",
    website: "https://test.xyz",
    bankrProfile: null,
    tokenAddress: "0x1111111111111111111111111111111111111111",
    wallets: [],
    verificationStatus: "Candidate",
    evidenceSources: [],
    treasuryHealth: "Pending",
    outreachStatus: null,
    focusStatus: null,
    bankrPriority: null,
    metadataStatus: null,
    walletStatus: "none",
    profileStatus: "candidate",
    booksStatus: "no_books",
    dataStatus: "partial",
    lastChecked: null,
    adminNotes: null,
    priority: 50,
    ...overrides,
  };
}

// ── Ticker sentinel ───────────────────────────────────────────────────────────

describe("isMissingTicker", () => {
  test("null symbol in DB arrives as the '—' placeholder — treated as missing", () => {
    expect(isMissingTicker(makeAgent({ symbol: "—" }))).toBe(true);
  });

  test("empty string → missing; real ticker → present", () => {
    expect(isMissingTicker(makeAgent({ symbol: "" }))).toBe(true);
    expect(isMissingTicker(makeAgent({ symbol: "$BNKR" }))).toBe(false);
  });
});

// ── Strict metadata vs stored tag ─────────────────────────────────────────────

describe("isMetadataCompleteStrict", () => {
  test("all four fields present → complete", () => {
    expect(isMetadataCompleteStrict(makeAgent())).toBe(true);
  });

  test("missing tokenAddress → incomplete even when DB metadata_status is 'complete'", () => {
    const agent = makeAgent({ tokenAddress: null, metadataStatus: "complete" });
    expect(isMetadataCompleteStrict(agent)).toBe(false);
  });

  test("'—' ticker → incomplete", () => {
    expect(isMetadataCompleteStrict(makeAgent({ symbol: "—" }))).toBe(false);
  });
});

// ── Duplicate grouping ────────────────────────────────────────────────────────

describe("buildDuplicateGroups", () => {
  test("shared token address (case-insensitive) groups two agents", () => {
    const groups = buildDuplicateGroups([
      makeAgent({ slug: "a", tokenAddress: "0xAAAA000000000000000000000000000000000001" }),
      makeAgent({ slug: "b", tokenAddress: "0xaaaa000000000000000000000000000000000001" }),
    ]);
    const tokenGroups = groups.filter((g) => g.type === "token_address");
    expect(tokenGroups.length).toBe(1);
    expect(tokenGroups[0].agent_slugs.sort()).toEqual(["a", "b"]);
  });

  test("shared x handle is @- and case-insensitive, and flags cross-ecosystem", () => {
    const groups = buildDuplicateGroups([
      makeAgent({ slug: "a", xHandle: "@Foo", tokenAddress: null }),
      makeAgent({ slug: "b", xHandle: "foo", tokenAddress: null, ecosystem: "AEON" }),
    ]);
    const handleGroups = groups.filter((g) => g.type === "x_handle");
    expect(handleGroups.length).toBe(1);
    expect(handleGroups[0].cross_ecosystem).toBe(true);
  });

  test("shared wallet address across agents groups; distinct addresses do not", () => {
    const shared = makeWallet({ address: "0xDDDD000000000000000000000000000000000001" });
    const groups = buildDuplicateGroups([
      makeAgent({ slug: "a", tokenAddress: null, xHandle: "", wallets: [shared] }),
      makeAgent({
        slug: "b",
        tokenAddress: null,
        xHandle: "",
        wallets: [makeWallet({ address: shared.address.toLowerCase() })],
      }),
      makeAgent({
        slug: "c",
        tokenAddress: null,
        xHandle: "",
        wallets: [makeWallet({ address: "0xEEEE000000000000000000000000000000000002" })],
      }),
    ]);
    const walletGroups = groups.filter((g) => g.type === "wallet_address");
    expect(walletGroups.length).toBe(1);
    expect(walletGroups[0].agent_slugs.sort()).toEqual(["a", "b"]);
  });

  test("the same wallet listed twice on ONE agent is not a duplicate group", () => {
    const w = makeWallet();
    const groups = buildDuplicateGroups([
      makeAgent({ slug: "a", tokenAddress: null, xHandle: "", wallets: [w, { ...w }] }),
    ]);
    expect(groups.filter((g) => g.type === "wallet_address").length).toBe(0);
  });
});

// ── Counts invariant ──────────────────────────────────────────────────────────

describe("buildCounts", () => {
  test("five books buckets always sum to the total", () => {
    const agents = (
      ["no_books", "pending", "live", "stale", "error", "live"] as const
    ).map((bs, i) => makeAgent({ slug: `agent-${i}`, booksStatus: bs }));
    const rows = agents.map((a) => buildAuditRow(a, {}, {}));
    const c = buildCounts(rows);
    expect(c.live_books + c.stale_books + c.no_books + c.books_pending + c.books_error).toBe(
      c.total_bankr_agents_indexed,
    );
    expect(c.live_books).toBe(2);
  });

  test("missing_ticker counts the '—' sentinel", () => {
    const rows = [
      makeAgent({ slug: "a", symbol: "—" }),
      makeAgent({ slug: "b", symbol: "$OK" }),
    ].map((a) => buildAuditRow(a, {}, {}));
    expect(buildCounts(rows).missing_ticker).toBe(1);
  });
});

// ── Row derivation ────────────────────────────────────────────────────────────

describe("buildAuditRow", () => {
  test("manifest status falls back to not_submitted; eligible wallets drive books_eligible", () => {
    const agent = makeAgent({
      wallets: [
        makeWallet({ evidenceSource: "manifest", booksEligible: true }),
        makeWallet({ address: "0x2222000000000000000000000000000000000002", evidenceSource: "admin" }),
      ],
    });
    const row = buildAuditRow(agent, {}, {});
    expect(row.manifest_status).toBe("not_submitted");
    expect(row.manifest_wallet_count).toBe(1);
    expect(row.eligible_wallet_count).toBe(1);
    expect(row.books_eligible).toBe(true);
    expect(row.wallet_sources.sort()).toEqual(["admin", "manifest"]);
  });

  test("duplicate reasons flow through from the group map", () => {
    const row = buildAuditRow(makeAgent(), {}, { "test-agent": ["token_address", "x_handle"] });
    expect(row.is_duplicate).toBe(true);
    expect(row.duplicate_reasons).toEqual(["token_address", "x_handle"]);
  });
});
