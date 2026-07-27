// P0 status-tag derivation. Pure functions — no DB calls, no side effects.
//
// booksStatus and dataStatus are computed here at read time because they
// depend on wall-clock age; storing them would make them stale the moment
// they were written. walletStatus and profileStatus are trigger-owned in
// Postgres (migration 20260715000001) — the TS mirrors below exist for the
// static-data fallback path and as executable documentation of the SQL
// contract (covered by src/__tests__/status-tags.test.ts).

import type {
  AgentWallet,
  BooksStatus,
  DataStatus,
  ProfileStatus,
  VerificationStatus,
  WalletStatus,
} from "@/app/registry/types";

// Matches the agent_books_cache refresh cadence (see refresh-books cron).
// agent-books.ts consumes this constant so the two can't drift.
export const BOOKS_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

// last_checked older than this is considered stale.
export const DATA_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;

// Mirrors the eligible set in compute_books_eligible() (20260706000002).
const ELIGIBLE_ADDRESS_TYPES = new Set(["eoa", "treasury_contract", "smart_account"]);

export function deriveBooksStatus(
  eligibleWalletCount: number,
  computedAt: string | null,
  now: number = Date.now(),
): BooksStatus {
  // "error" is reserved: the cache is only written on success today.
  if (eligibleWalletCount === 0) return "no_books";
  if (!computedAt) return "pending";
  const age = now - new Date(computedAt).getTime();
  if (Number.isNaN(age)) return "pending";
  return age <= BOOKS_CACHE_TTL_MS ? "live" : "stale";
}

export function deriveDataStatus(
  lastChecked: string | null | undefined,
  now: number = Date.now(),
  hasActiveFailure = false,
): DataStatus {
  // An unresolved pipeline failure wins over freshness (P5). The failure
  // signal is passed in from getRegistryAgents (a read of pipeline_failures) —
  // this stays a pure function.
  if (hasActiveFailure) return "failed";
  if (!lastChecked) return "partial";
  const age = now - new Date(lastChecked).getTime();
  if (Number.isNaN(age)) return "partial";
  return age <= DATA_FRESHNESS_MS ? "fresh" : "stale";
}

// TS mirror of derive_wallet_status() — keep the precedence in sync.
export function deriveWalletStatus(wallets: AgentWallet[]): WalletStatus {
  if (wallets.length === 0) return "none";
  if (wallets.some((w) => (w.confidence ?? "").toLowerCase() === "confirmed")) return "verified";
  if (wallets.some((w) => (w.evidenceSource ?? "").toLowerCase() === "manifest")) return "declared";
  const allDisqualified = wallets.every(
    (w) =>
      !w.booksEligible &&
      w.address_type != null &&
      !ELIGIBLE_ADDRESS_TYPES.has(w.address_type.toLowerCase()),
  );
  if (allDisqualified) return "rejected";
  return "candidate";
}

// TS mirror of compute_profile_status() — keep the mapping in sync.
export function deriveProfileStatus(
  verificationStatus: VerificationStatus | null | undefined,
): ProfileStatus {
  switch (verificationStatus) {
    case "Verified":
    case "Luca Managed":
    case "ERC-8004 Indexed":
      return "verified";
    case "Needs Verification":
    case "Wallets Declared":
    case "Claimed":
      return "needs_verification";
    default:
      return "candidate";
  }
}
