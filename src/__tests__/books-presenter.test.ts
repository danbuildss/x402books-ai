// Books presenter tests — P3/P4 honesty invariants.
// no fake zeros · unknown stays unknown · token revenue ≠ operating revenue.
//
// Run with: bun test src/__tests__/books-presenter.test.ts

import { describe, expect, test } from "bun:test";
import {
  buildBooksMetrics,
  buildDataQuality,
  buildOperatorVerdict,
  buildProfileMetrics,
  buildRevenueBuckets,
  deriveUnknownInflows,
  isTracked,
  mapExpenseCategories,
  walletRoleLabel,
  walletSourceLabel,
} from "../lib/books-presenter";
import type { AgentBooks, AgentBooksUnattributed } from "../lib/agent-books";
import type { AgentWallet, VerificationStatus, WalletStatus, BooksStatus, DataStatus } from "../app/registry/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function expenseRow(category: string, total = 10, txs = 2) {
  return { category, label: category, total_usd: total, tx_count: txs };
}

function makeBooks(overrides: Partial<AgentBooks> = {}): AgentBooks {
  return {
    agent: { slug: "test", name: "Test", ecosystem: "BANKR" },
    attributed: true,
    period: "30d",
    wallets: { declared: 2, analyzed: 2, roles: ["treasury"] },
    financials: {
      revenue_usd: 100,
      gross_inflow_usd: 130,
      expenses_usd: 40,
      net_income_usd: 60,
      treasury_balance_usd: 500,
      runway_months: 12,
      margin_pct: 60,
      tx_count: 25,
    },
    classification: {
      operating_revenue_usd: 100,
      settlement_revenue_usd: 70,
      agent_token_revenue_usd: 20,
      quarantined_inflows_usd: 30,
      bridge_excluded_expense_usd: 0,
      dex_excluded_usd: 0,
      quarantined_events: [],
    },
    confidence: { revenue: "high", expenses: "high", treasury: "high", overall: "high", flags: [] },
    breakdown: { revenue_by_source: [], expenses_by_category: [], top_counterparties: [] },
    attribution: { source: "manifest", confidence: "high", internal_transfers_removed: 3 },
    luca_summary: "Test summary.",
    generated_at: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

const UNATTRIBUTED: AgentBooksUnattributed = {
  agent: { slug: "test", name: "Test", ecosystem: "BANKR" },
  attributed: false,
  reason: "no_manifest_wallets",
};

function makeQualityAgent(overrides: Partial<{
  walletStatus: WalletStatus; booksStatus: BooksStatus; dataStatus: DataStatus;
  verificationStatus: VerificationStatus; wallets: AgentWallet[];
}> = {}) {
  return {
    walletStatus: "declared" as WalletStatus,
    booksStatus: "live" as BooksStatus,
    dataStatus: "fresh" as DataStatus,
    verificationStatus: "Verified" as VerificationStatus,
    wallets: [
      { address: "0x1", label: "treasury", evidenceSource: "manifest" } as AgentWallet,
    ],
    ...overrides,
  };
}

// ── Expense bucket mapping ────────────────────────────────────────────────────

describe("mapExpenseCategories", () => {
  test("maps every category to its spec bucket", () => {
    const buckets = mapExpenseCategories([
      expenseRow("inference_purchase", 10),
      expenseRow("api_call", 5),
      expenseRow("api_cost", 1),
      expenseRow("compute", 2),
      expenseRow("provider_spend", 20),
      expenseRow("fallback_provider_spend", 4),
      expenseRow("agent_service", 7),
      expenseRow("subscription", 3),
      expenseRow("unknown", 9),
      expenseRow("unknown_agent_activity", 1),
    ]);
    expect(isTracked(buckets.inference) && buckets.inference.value).toBe(18);
    expect(isTracked(buckets.provider) && buckets.provider.value).toBe(24);
    expect(isTracked(buckets.external) && buckets.external.value).toBe(10);
    expect(isTracked(buckets.unknown) && buckets.unknown.value).toBe(10);
  });

  test("gas is ALWAYS notTracked (no ledger category exists)", () => {
    const buckets = mapExpenseCategories([expenseRow("inference_purchase")]);
    expect(isTracked(buckets.gas)).toBe(false);
  });

  test("no fake zeros: unmapped bucket is notTracked, genuine 0 row is tracked", () => {
    const none = mapExpenseCategories([]);
    expect(isTracked(none.inference)).toBe(false);
    expect(isTracked(none.unknown)).toBe(false);

    const zero = mapExpenseCategories([expenseRow("provider_spend", 0, 1)]);
    expect(isTracked(zero.provider)).toBe(true);
    expect(isTracked(zero.provider) && zero.provider.value).toBe(0);
  });

  test("revenue-side and non-operating categories are excluded", () => {
    const buckets = mapExpenseCategories([
      expenseRow("income", 99),
      expenseRow("agent_revenue", 99),
      expenseRow("inference_sale", 99),
      expenseRow("internal_transfer", 99),
      expenseRow("bridge_transfer", 99),
      expenseRow("dex_swap", 99),
    ]);
    expect(isTracked(buckets.inference)).toBe(false);
    expect(isTracked(buckets.provider)).toBe(false);
    expect(isTracked(buckets.external)).toBe(false);
    expect(isTracked(buckets.unknown)).toBe(false);
  });
});

// ── Wallet source / role mapping ──────────────────────────────────────────────

describe("walletSourceLabel", () => {
  const cases: [string | null | undefined, string][] = [
    ["manifest", "manifest"],
    ["admin", "admin"],
    ["luca", "inferred"],
    [null, "candidate"],
    [undefined, "candidate"],
    ["something_else", "candidate"],
    ["Manifest", "manifest"],
  ];
  for (const [input, expected] of cases) {
    test(`${String(input)} → ${expected}`, () => {
      expect(walletSourceLabel(input)).toBe(expected as ReturnType<typeof walletSourceLabel>);
    });
  }
});

describe("walletRoleLabel", () => {
  test("treasury/deployer/operator pass through; fee/null/other → unknown", () => {
    expect(walletRoleLabel("treasury")).toBe("treasury");
    expect(walletRoleLabel("deployer")).toBe("deployer");
    expect(walletRoleLabel("operator")).toBe("operator");
    expect(walletRoleLabel("fee")).toBe("unknown");
    expect(walletRoleLabel(null)).toBe("unknown");
    expect(walletRoleLabel("random")).toBe("unknown");
  });
});

// ── Unknown inflows ───────────────────────────────────────────────────────────

describe("deriveUnknownInflows", () => {
  test("operating − settlement − agentToken", () => {
    expect(deriveUnknownInflows(makeBooks())).toBe(10); // 100 - 70 - 20
  });

  test("exact zero when fully classified", () => {
    const books = makeBooks();
    books.classification.settlement_revenue_usd = 80;
    expect(deriveUnknownInflows(books)).toBe(0);
  });

  test("clamps negative to 0 (tiers can overlap-count)", () => {
    const books = makeBooks();
    books.classification.settlement_revenue_usd = 90;
    books.classification.agent_token_revenue_usd = 30;
    expect(deriveUnknownInflows(books)).toBe(0);
  });
});

describe("buildRevenueBuckets keeps token revenue separate", () => {
  test("agentToken is its own bucket, never summed into settlement", () => {
    const buckets = buildRevenueBuckets(makeBooks());
    expect(buckets.settlement).toBe(70);
    expect(buckets.agentToken).toBe(20);
    expect(buckets.quarantined).toBe(30);
    expect(buckets.unknown).toBe(10);
  });
});

// ── Data quality / next action table ─────────────────────────────────────────

describe("buildDataQuality nextAction table", () => {
  test("unattributed + not_scannable", () => {
    const dq = buildDataQuality(makeQualityAgent(), {
      ...UNATTRIBUTED,
      reason: "wallets_declared_not_scannable",
    });
    expect(dq.nextAction).toContain("operational wallets");
  });

  test("unattributed + under_review", () => {
    const dq = buildDataQuality(makeQualityAgent(), {
      ...UNATTRIBUTED,
      reason: "financials_under_review",
    });
    expect(dq.nextAction).toContain("Awaiting team confirmation");
  });

  test("unattributed default → submit manifest; missing lists attribution", () => {
    const dq = buildDataQuality(makeQualityAgent({ wallets: [] }), UNATTRIBUTED);
    expect(dq.nextAction).toContain("Submit a wallet manifest");
    expect(dq.missing.some((m) => m.includes("Wallet attribution"))).toBe(true);
    expect(dq.lastIndexed).toBeNull();
    expect(dq.walletAttribution).toBe("None on file");
  });

  test("low confidence or quarantined → review flagged inflows", () => {
    const books = makeBooks();
    books.confidence.overall = "low";
    expect(buildDataQuality(makeQualityAgent(), books).nextAction).toContain("Review flagged inflows");
  });

  test("stale books → refresh queued", () => {
    const books = makeBooks();
    books.classification.quarantined_inflows_usd = 0;
    expect(
      buildDataQuality(makeQualityAgent({ booksStatus: "stale" }), books).nextAction,
    ).toContain("stale");
  });

  test("attributed but unverified → claim", () => {
    const books = makeBooks();
    books.classification.quarantined_inflows_usd = 0;
    expect(
      buildDataQuality(makeQualityAgent({ verificationStatus: "Candidate" }), books).nextAction,
    ).toContain("Claim this profile");
  });

  test("verified + fresh + high → none needed", () => {
    const books = makeBooks();
    books.classification.quarantined_inflows_usd = 0;
    expect(buildDataQuality(makeQualityAgent(), books).nextAction).toContain("None");
  });

  test("missing[] includes treasury/runway when null and always gas", () => {
    const books = makeBooks();
    books.financials.treasury_balance_usd = null;
    books.financials.runway_months = null;
    const dq = buildDataQuality(makeQualityAgent(), books);
    expect(dq.missing.some((m) => m.includes("Treasury balance"))).toBe(true);
    expect(dq.missing.some((m) => m.includes("Runway"))).toBe(true);
    expect(dq.missing.some((m) => m.includes("Gas"))).toBe(true);
  });
});

// ── Metrics null-honesty ──────────────────────────────────────────────────────

describe("metrics honesty", () => {
  test("unattributed profile metrics are all null with a note — never 0", () => {
    const m = buildProfileMetrics(UNATTRIBUTED);
    expect(m.revenue30d.value).toBeNull();
    expect(m.expenses30d.value).toBeNull();
    expect(m.netPosition.value).toBeNull();
    expect(m.treasuryBalance.value).toBeNull();
    expect(m.revenue30d.note).toBeTruthy();
    expect(m.confidence).toBe("n/a");
  });

  test("null treasury/runway stay null on books metrics (not 0)", () => {
    const books = makeBooks();
    books.financials.treasury_balance_usd = null;
    books.financials.runway_months = null;
    const m = buildBooksMetrics(books);
    expect(m.treasuryBalance.value).toBeNull();
    expect(m.runwayMonths.value).toBeNull();
    expect(m.treasuryBalance.note).toBeTruthy();
  });

  test("books metrics carry unknown activity and quarantine explicitly", () => {
    const m = buildBooksMetrics(makeBooks());
    expect(m.unknownActivity.value).toBe(10);
    expect(m.quarantinedInflows.value).toBe(30);
    expect(m.lastUpdated).toBe("2026-07-16T00:00:00.000Z");
  });
});

// ── Operator verdict ──────────────────────────────────────────────────────────

describe("buildOperatorVerdict", () => {
  test("attributed: knows summary, token revenue called out as NOT operating", () => {
    const v = buildOperatorVerdict(makeBooks(), makeQualityAgent());
    expect(v.whatWeKnow[0]).toBe("Test summary.");
    expect(v.whatWeKnow.some((k) => k.includes("not operating revenue"))).toBe(true);
    expect(v.confidence).toContain("high");
  });

  test("unattributed: honest minimal knowledge + manifest next action", () => {
    const v = buildOperatorVerdict(UNATTRIBUTED, makeQualityAgent({ wallets: [] }));
    expect(v.whatWeKnow[0]).toContain("no wallets on file");
    expect(v.confidence).toContain("n/a");
    expect(v.nextAction).toContain("Submit a wallet manifest");
  });
});
