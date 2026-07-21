// P2 registry terminal — filter views and status display copy.
// Pure module (no React, no I/O) so predicates and copy maps are unit-testable.
// Copy rules come from the sprint spec: each label's tooltip explains the
// status in plain language so a reader understands an agent in ~5 seconds.

import type {
  BooksStatus,
  DataStatus,
  ProfileStatus,
  PublicAgent,
  WalletStatus,
} from "./types";

// ── Filter views ──────────────────────────────────────────────────────────────

export type RegistryView =
  | "all"
  | "verified"
  | "needs_verification"
  | "no_manifest"
  | "live_books"
  | "stale";

// Labels for the chip row. "all" is rendered as "All Bankr Agents" under the
// scope lock and "All Agents" otherwise — the client handles that swap.
export const REGISTRY_VIEWS: { value: RegistryView; label: string }[] = [
  { value: "all", label: "All Agents" },
  { value: "verified", label: "Verified" },
  { value: "needs_verification", label: "Needs Verification" },
  { value: "no_manifest", label: "No Manifest" },
  { value: "live_books", label: "Live Books" },
  { value: "stale", label: "Stale Data" },
];

export function isRegistryView(v: string): v is RegistryView {
  return REGISTRY_VIEWS.some((view) => view.value === v);
}

type FilterableAgent = Pick<
  PublicAgent,
  "profileStatus" | "walletStatus" | "booksStatus" | "dataStatus"
>;

export function matchesView(a: FilterableAgent, view: RegistryView): boolean {
  switch (view) {
    case "all":
      return true;
    case "verified":
      return a.profileStatus === "verified";
    case "needs_verification":
      return a.profileStatus === "needs_verification";
    case "no_manifest":
      // No manifest-declared wallet yet: nothing on file, or only candidates.
      return a.walletStatus === "none" || a.walletStatus === "candidate";
    case "live_books":
      return a.booksStatus === "live";
    case "stale":
      return a.dataStatus === "stale" || a.booksStatus === "stale";
  }
}

// ── Status display copy (spec copy rules as labels + tooltips) ────────────────

export type StatusMeta = { label: string; tip: string; color: string };

export const PROFILE_STATUS_META: Record<ProfileStatus, StatusMeta> = {
  candidate: {
    label: "Candidate",
    tip: "Discovered from public data — not yet verified.",
    color: "var(--muted)",
  },
  needs_verification: {
    label: "Needs Verification",
    tip: "Profile exists but wallet proof is incomplete.",
    color: "#F97316",
  },
  verified: {
    label: "Verified",
    tip: "Strong evidence — verified wallet proof on file.",
    color: "#6DB874",
  },
};

export const BOOKS_STATUS_META: Record<BooksStatus, StatusMeta> = {
  no_books: {
    label: "No Books",
    tip: "No manifest-declared books-eligible wallet.",
    color: "var(--muted)",
  },
  pending: {
    label: "Pending",
    tip: "Eligible wallet declared — books not generated yet.",
    color: "#5B8FA8",
  },
  live: {
    label: "Live",
    tip: "Books generated from eligible wallets (fresh within 4h).",
    color: "#6DB874",
  },
  stale: {
    label: "Stale",
    tip: "Books cache older than 4h — data may be out of date.",
    color: "#F97316",
  },
  error: {
    label: "Error",
    tip: "Books generation failed on the last indexing run.",
    color: "#ef4444",
  },
};

export const WALLET_STATUS_META: Record<WalletStatus, StatusMeta> = {
  none: {
    label: "No wallets",
    tip: "No wallet addresses on file.",
    color: "var(--muted)",
  },
  candidate: {
    label: "Candidate",
    tip: "Wallets found from public data — unconfirmed.",
    color: "var(--muted)",
  },
  declared: {
    label: "Declared",
    tip: "Wallets declared via manifest — awaiting proof.",
    color: "#5B8FA8",
  },
  verified: {
    label: "Verified",
    tip: "Wallet ownership confirmed.",
    color: "#6DB874",
  },
  rejected: {
    label: "Rejected",
    tip: "All known addresses disqualified (contracts / token addresses).",
    color: "#ef4444",
  },
};

// Last Updated cell color by data freshness.
export const DATA_STATUS_COLOR: Record<DataStatus, string> = {
  fresh: "var(--muted)",
  stale: "#F97316",
  partial: "var(--muted)",
  failed: "#ef4444",
};
