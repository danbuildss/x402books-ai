// P3/P4 books presenter. Pure functions — no React, no I/O.
//
// Every P4 display value is DERIVED here from the existing AgentBooks shape
// (no type/pipeline changes, so stale agent_books_cache rows stay valid).
// This module owns the honesty invariants:
//   - no fake zeros: a value that isn't tracked/computable is {notTracked}
//     or null and renders "—"/"not tracked" — never "$0.00"
//   - unknown stays unknown: unclassified activity is surfaced as unknown,
//     not folded into another bucket
//   - token activity is never presented as operating revenue: the
//     agent-token tier stays its own line

import type { AgentBooks, AgentBooksUnattributed } from "@/lib/agent-books";
import type { Agent, AgentWallet } from "@/app/registry/types";
import { BOOKS_STATUS_META } from "@/app/registry/filters";

type Books = AgentBooks | AgentBooksUnattributed;

// ── Buckets ───────────────────────────────────────────────────────────────────

// {value,txCount} means "we computed this" (a genuine 0 is allowed);
// {notTracked} means "no data source exists / nothing mapped" → render
// "not tracked", never $0.
export type Bucket = { value: number; txCount: number } | { notTracked: true };

export function isTracked(b: Bucket): b is { value: number; txCount: number } {
  return !("notTracked" in b);
}

export type ExpenseBuckets = {
  inference: Bucket;
  provider: Bucket;
  gas: Bucket; // always notTracked — no ledger category emits gas today
  external: Bucket;
  unknown: Bucket;
};

export type RevenueBuckets = {
  settlement: number;
  agentToken: number; // NEVER summed into operating/settlement in the UI
  quarantined: number;
  unknown: number;
};

// LedgerCategory → spec bucket. Revenue-side and non-operating categories
// (internal/bridge/dex) are deliberately excluded from expense buckets.
const EXPENSE_BUCKET_BY_CATEGORY: Record<string, keyof Omit<ExpenseBuckets, "gas">> = {
  inference_purchase: "inference",
  api_call: "inference",
  api_cost: "inference",
  compute: "inference",
  provider_spend: "provider",
  fallback_provider_spend: "provider",
  agent_service: "external",
  subscription: "external",
  data_access: "external",
  refund: "external",
  unknown: "unknown",
  unknown_agent_activity: "unknown",
};

export function mapExpenseCategories(
  rows: AgentBooks["breakdown"]["expenses_by_category"],
): ExpenseBuckets {
  const sums: Record<keyof Omit<ExpenseBuckets, "gas">, { value: number; txCount: number } | null> = {
    inference: null,
    provider: null,
    external: null,
    unknown: null,
  };

  for (const row of rows) {
    const bucket = EXPENSE_BUCKET_BY_CATEGORY[row.category];
    if (!bucket) continue; // revenue-side or non-operating category
    const cur = sums[bucket] ?? { value: 0, txCount: 0 };
    cur.value += row.total_usd;
    cur.txCount += row.tx_count;
    sums[bucket] = cur;
  }

  return {
    inference: sums.inference ?? { notTracked: true },
    provider: sums.provider ?? { notTracked: true },
    gas: { notTracked: true },
    external: sums.external ?? { notTracked: true },
    unknown: sums.unknown ?? { notTracked: true },
  };
}

export function deriveUnknownInflows(books: AgentBooks): number {
  const { operating_revenue_usd, settlement_revenue_usd, agent_token_revenue_usd } =
    books.classification;
  return Math.max(0, operating_revenue_usd - settlement_revenue_usd - agent_token_revenue_usd);
}

export function buildRevenueBuckets(books: AgentBooks): RevenueBuckets {
  return {
    settlement: books.classification.settlement_revenue_usd,
    agentToken: books.classification.agent_token_revenue_usd,
    quarantined: books.classification.quarantined_inflows_usd,
    unknown: deriveUnknownInflows(books),
  };
}

// ── Wallet source / role display mapping ──────────────────────────────────────
// Spec vocabulary: manifest | admin | inferred | candidate.
// Stored evidence_source vocabulary: manifest | luca | admin (nullable).

export type WalletSource = "manifest" | "admin" | "inferred" | "candidate";
export type WalletRole = "treasury" | "deployer" | "operator" | "unknown";

export function walletSourceLabel(evidenceSource?: string | null): WalletSource {
  switch ((evidenceSource ?? "").toLowerCase()) {
    case "manifest":
      return "manifest";
    case "admin":
      return "admin";
    case "luca":
      return "inferred";
    default:
      return "candidate";
  }
}

export function walletRoleLabel(role?: string | null): WalletRole {
  switch ((role ?? "").toLowerCase()) {
    case "treasury":
      return "treasury";
    case "deployer":
      return "deployer";
    case "operator":
      return "operator";
    default:
      return "unknown"; // incl. "fee" and unclassified — spec groups only these four
  }
}

// ── Metrics (null-honest) ─────────────────────────────────────────────────────

export type Metric = { value: number | null; note?: string };

export type ProfileMetrics = {
  revenue30d: Metric;
  expenses30d: Metric;
  netPosition: Metric;
  treasuryBalance: Metric;
  booksStatus: string; // label from BOOKS_STATUS_META
  confidence: string; // auto BooksConfidence; human label rendered separately
};

export type BooksMetrics = {
  revenue: Metric;
  expenses: Metric;
  netFlow: Metric;
  treasuryBalance: Metric;
  runwayMonths: Metric;
  walletsUsed: Metric;
  txCount: Metric;
  classificationConfidence: string;
  quarantinedInflows: Metric;
  unknownActivity: Metric;
  lastUpdated: string | null;
};

function unattributedNote(books: AgentBooksUnattributed): string {
  switch (books.reason) {
    case "wallets_declared_not_scannable":
      return "Declared addresses could not be scanned as operational wallets";
    case "financials_under_review":
      return "Financials under review";
    default:
      return "No attributed wallets — books not generated";
  }
}

export function buildProfileMetrics(books: Books, booksStatusLabel?: string): ProfileMetrics {
  if (!books.attributed) {
    const note = unattributedNote(books);
    const na: Metric = { value: null, note };
    return {
      revenue30d: na,
      expenses30d: na,
      netPosition: na,
      treasuryBalance: na,
      booksStatus: booksStatusLabel ?? BOOKS_STATUS_META.no_books.label,
      confidence: "n/a",
    };
  }
  const f = books.financials;
  return {
    revenue30d: { value: f.revenue_usd },
    expenses30d: { value: f.expenses_usd },
    netPosition: { value: f.net_income_usd },
    treasuryBalance:
      f.treasury_balance_usd == null
        ? { value: null, note: "No stablecoin balance detected in treasury wallets" }
        : { value: f.treasury_balance_usd },
    booksStatus: booksStatusLabel ?? BOOKS_STATUS_META.live.label,
    confidence: books.confidence.overall,
  };
}

export function buildBooksMetrics(books: AgentBooks): BooksMetrics {
  const f = books.financials;
  return {
    revenue: { value: f.revenue_usd },
    expenses: { value: f.expenses_usd },
    netFlow: { value: f.net_income_usd },
    treasuryBalance:
      f.treasury_balance_usd == null
        ? { value: null, note: "No stablecoin balance detected" }
        : { value: f.treasury_balance_usd },
    runwayMonths:
      f.runway_months == null
        ? { value: null, note: "Needs a treasury balance to compute" }
        : { value: f.runway_months },
    walletsUsed: { value: books.wallets.analyzed },
    txCount: { value: f.tx_count },
    classificationConfidence: books.confidence.overall,
    quarantinedInflows: { value: books.classification.quarantined_inflows_usd },
    unknownActivity: { value: deriveUnknownInflows(books) },
    lastUpdated: books.generated_at,
  };
}

// ── Data quality (P3 item 10 — rendered on EVERY profile) ────────────────────

export type DataQuality = {
  walletAttribution: string;
  booksStatus: string;
  lastIndexed: string | null;
  dataFreshness: "fresh" | "stale" | "unknown";
  missing: string[]; // explicit — never hidden
  nextAction: string;
};

type QualityAgent = Pick<
  Agent,
  "walletStatus" | "booksStatus" | "dataStatus" | "verificationStatus" | "wallets"
>;

function describeWalletAttribution(agent: QualityAgent): string {
  const manifestCount = agent.wallets.filter(
    (w: AgentWallet) => walletSourceLabel(w.evidenceSource) === "manifest",
  ).length;
  if (agent.wallets.length === 0) return "None on file";
  if (manifestCount > 0) {
    return `Manifest (${manifestCount} wallet${manifestCount === 1 ? "" : "s"})`;
  }
  return `${agent.wallets.length} candidate wallet${agent.wallets.length === 1 ? "" : "s"} — no manifest`;
}

export function buildDataQuality(agent: QualityAgent, books: Books): DataQuality {
  const missing: string[] = [];
  let nextAction: string;

  if (!books.attributed) {
    missing.push("Wallet attribution (no books-eligible manifest wallet)");
    missing.push("Agent books (require attribution)");
    if (books.reason === "wallets_declared_not_scannable") {
      nextAction = "Verify declared addresses are operational wallets on Base, not token contracts.";
    } else if (books.reason === "financials_under_review") {
      nextAction = "Awaiting team confirmation of attribution and classification.";
    } else {
      nextAction = "Submit a wallet manifest (.agent/wallets.json) to generate books.";
    }
  } else {
    if (books.financials.treasury_balance_usd == null) missing.push("Treasury balance");
    if (books.financials.runway_months == null) missing.push("Runway (needs treasury balance)");
    if (books.classification.quarantined_inflows_usd > 0) {
      missing.push(
        `${books.classification.quarantined_events.length} inflow(s) quarantined pending classification`,
      );
    }
    const unknown = deriveUnknownInflows(books);
    if (unknown > 0) missing.push(`$${unknown.toFixed(2)} of inflows unclassified`);

    if (books.confidence.overall === "low" || books.classification.quarantined_inflows_usd > 0) {
      nextAction = "Review flagged inflows and confirm counterparties.";
    } else if (agent.booksStatus === "stale") {
      nextAction = "Books cache is stale — a refresh is queued on the next indexing run.";
    } else if (agent.verificationStatus !== "Verified") {
      nextAction = "Claim this profile to verify wallet ownership.";
    } else {
      nextAction = "None — books are current and verified.";
    }
  }

  // Honest constants
  missing.push("Gas costs (not tracked on-chain today)");

  return {
    walletAttribution: describeWalletAttribution(agent),
    booksStatus: BOOKS_STATUS_META[agent.booksStatus].label,
    lastIndexed: books.attributed ? books.generated_at : null,
    dataFreshness:
      agent.dataStatus === "fresh" ? "fresh" : agent.dataStatus === "stale" ? "stale" : "unknown",
    missing,
    nextAction,
  };
}

// ── Operator verdict (P3 item 5 / P4 Luca Verdict) ───────────────────────────

export type OperatorVerdict = {
  whatWeKnow: string[];
  missing: string[];
  confidence: string;
  nextAction: string;
};

export function buildOperatorVerdict(books: Books, agent: QualityAgent): OperatorVerdict {
  const dq = buildDataQuality(agent, books);

  if (!books.attributed) {
    const know: string[] = [];
    if (agent.wallets.length > 0) {
      know.push(`${agent.wallets.length} candidate wallet(s) on file — not yet attributable.`);
    } else {
      know.push("Indexed from public data — no wallets on file yet.");
    }
    return {
      whatWeKnow: know,
      missing: dq.missing,
      confidence: "n/a — no attributed books",
      nextAction: dq.nextAction,
    };
  }

  const know: string[] = [books.luca_summary];
  if (books.classification.settlement_revenue_usd > 0) {
    know.push(
      `$${books.classification.settlement_revenue_usd.toFixed(2)} settlement revenue from known counterparties (highest-confidence tier).`,
    );
  }
  if (books.classification.agent_token_revenue_usd > 0) {
    know.push(
      `$${books.classification.agent_token_revenue_usd.toFixed(2)} agent-token inflows — tracked separately, not operating revenue.`,
    );
  }
  if (books.attribution.internal_transfers_removed > 0) {
    know.push(
      `${books.attribution.internal_transfers_removed} internal transfer(s) excluded from revenue and expenses.`,
    );
  }

  return {
    whatWeKnow: know,
    missing: dq.missing,
    confidence: `${books.confidence.overall} (auto)${books.confidence.flags.length ? ` — ${books.confidence.flags.length} flag(s)` : ""}`,
    nextAction: dq.nextAction,
  };
}
