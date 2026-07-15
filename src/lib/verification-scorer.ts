// Automated verification scoring (0–100).
// Replaces manual badge assignment with a deterministic, auditable score.
//
// Score components:
//   Manifest completeness  (0–30)
//   Wallet coverage        (0–25)
//   Financial activity     (0–20)
//   Registry metadata      (0–15)
//   Ecosystem signal       (0–10)

import type { Agent } from "@/app/registry/types";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";

// Everything the scorer reads is public data — accept the structural subset
// so both Agent and PublicAgent (registry list rows) can be scored.
export type ScorableAgent = Pick<
  Agent,
  "name" | "ecosystem" | "xHandle" | "website" | "tokenAddress" | "wallets" | "verificationStatus"
>;

export interface VerificationScore {
  total: number;           // 0–100
  breakdown: {
    manifest:    number;   // 0–30
    wallets:     number;   // 0–25
    activity:    number;   // 0–20
    metadata:    number;   // 0–15
    ecosystem:   number;   // 0–10
  };
  tier: VerificationTier;
  signals: string[];       // human-readable explanations
}

export type VerificationTier =
  | "unverified"      // 0–24
  | "basic"           // 25–49
  | "verified"        // 50–74
  | "fully_verified"; // 75–100

export function scoreAgent(
  agent: ScorableAgent,
  hasBooks: boolean,
  txCount?: number,
): VerificationScore {
  const signals: string[] = [];
  let manifest = 0;
  let wallets = 0;
  let activity = 0;
  let metadata = 0;
  let ecosystem = 0;

  // ── Manifest completeness (0–30) ─────────────────────────────────────────
  const hasWallets = (agent.wallets ?? []).length > 0;
  if (hasWallets) {
    manifest += 15;
    signals.push("Wallets manifest declared.");
  }

  const booksEligible = (agent.wallets ?? []).filter(
    (w) => isBooksEligibleWallet(w, agent.tokenAddress).eligible,
  );
  if (booksEligible.length > 0) {
    manifest += 10;
    signals.push(`${booksEligible.length} books-eligible wallet(s).`);
  }

  // Wallet role diversity: treasury plus a flow role declared.
  // Canonical role vocabulary is treasury | fee | deployer | operator
  // (types.ts AgentWallet); legacy names kept so no existing score drops.
  const roles = new Set((agent.wallets ?? []).map((w) => (w.role ?? "").toLowerCase()));
  const hasTreasury = roles.has("treasury") || roles.has("payment_receiver");
  const hasFlowRole =
    roles.has("fee") ||
    roles.has("operator") ||
    roles.has("revenue") ||
    roles.has("expense") ||
    roles.has("fee_recipient");
  if (hasTreasury && hasFlowRole) {
    manifest += 5;
    signals.push("Multiple wallet roles declared.");
  }

  // ── Wallet coverage (0–25) ────────────────────────────────────────────────
  const walletCount = (agent.wallets ?? []).length;
  if (walletCount >= 1) wallets += 10;
  if (walletCount >= 2) wallets += 8;
  if (walletCount >= 4) wallets += 7;

  // ── Financial activity (0–20) ─────────────────────────────────────────────
  if (hasBooks) {
    activity += 15;
    signals.push("Attributed books available.");
  }
  if ((txCount ?? 0) > 10) {
    activity += 3;
  }
  if ((txCount ?? 0) > 100) {
    activity += 2;
  }

  // ── Registry metadata (0–15) ──────────────────────────────────────────────
  if (agent.name)        metadata += 3;
  if (agent.website)     metadata += 4;
  if (agent.tokenAddress) {
    metadata += 5;
    signals.push("Token address declared.");
  }
  if (agent.xHandle)     metadata += 3;

  // ── Ecosystem signal (0–10) ───────────────────────────────────────────────
  if (agent.ecosystem) {
    ecosystem += 5;
    signals.push(`Ecosystem: ${agent.ecosystem}.`);
  }
  if (agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed") {
    ecosystem += 5;
    signals.push("Manual verification confirmed.");
  }

  const total = Math.min(100, manifest + wallets + activity + metadata + ecosystem);

  return {
    total,
    breakdown: { manifest, wallets, activity, metadata, ecosystem },
    tier: scoreTier(total),
    signals,
  };
}

function scoreTier(score: number): VerificationTier {
  if (score >= 75) return "fully_verified";
  if (score >= 50) return "verified";
  if (score >= 25) return "basic";
  return "unverified";
}

export const TIER_LABELS: Record<VerificationTier, string> = {
  unverified:     "Unverified",
  basic:          "Basic",
  verified:       "Verified",
  fully_verified: "Fully Verified",
};

export const TIER_BADGE_CLASS: Record<VerificationTier, string> = {
  unverified:     "badge-gray",
  basic:          "badge-blue",
  verified:       "badge-green",
  fully_verified: "badge-accent",
};
