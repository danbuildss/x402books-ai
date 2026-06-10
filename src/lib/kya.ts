// KYA (Know Your Agent) trust assessment.
//
// Computes a trust decision from registry data: should a counterparty
// trust this agent with money? Output is advisory — the caller decides.
//
// Two numbers matter and they are not the same:
//   trust_score — how good the agent looks based on what we know
//   confidence  — how much we actually know
// A high score with low confidence means "looks fine, thin evidence".

import type { Agent, VerificationStatus } from "@/app/registry/types";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Recommendation = "ALLOW" | "REVIEW" | "BLOCK";

export type KyaAssessment = {
  trust_score: number;
  confidence: number;
  verification_status: VerificationStatus;
  risk_level: RiskLevel;
  recommendation: Recommendation;
  key_drivers: string[];
};

const TIER: Record<VerificationStatus, number> = {
  "Candidate": 0,
  "Needs Verification": 1,
  "Wallets Declared": 2,
  "Claimed": 3,
  "Verified": 4,
  "Luca Managed": 5,
};

// Base trust contribution per verification tier. "Needs Verification" scores
// below Candidate because it is a flagged state, not a neutral one.
const TIER_BASE: Record<VerificationStatus, number> = {
  "Candidate": 10,
  "Needs Verification": 5,
  "Wallets Declared": 35,
  "Claimed": 50,
  "Verified": 65,
  "Luca Managed": 70,
};

export function computeKya(
  agent: Agent,
  opts: { hasToolDecisions?: boolean } = {},
): KyaAssessment {
  const status = agent.verificationStatus;
  const tier = TIER[status];
  const wallets = agent.wallets ?? [];
  const roles = new Set(
    wallets.map((w) => w.role ?? "unknown").filter((r) => r !== "unknown"),
  );

  // ── trust_score ───────────────────────────────────────────────────────────
  let score = TIER_BASE[status];
  score += Math.min(roles.size * 4, 12); // distinct declared roles
  if (agent.treasuryHealth === "Healthy") score += 8;
  else if (agent.treasuryHealth === "Stable") score += 6;
  else if (agent.treasuryHealth === "Watch") score += 2;
  if (agent.financialActivityScore !== null) {
    score += Math.round(agent.financialActivityScore / 10); // 0–10
  }
  const trust_score = Math.max(0, Math.min(100, score));

  // ── confidence ────────────────────────────────────────────────────────────
  let confidence = 0;
  if (wallets.length > 0) confidence += 25;                 // manifest declared
  if (tier >= TIER["Claimed"]) confidence += 15;            // ownership proof
  if (agent.financialActivityScore !== null) confidence += 15; // Luca reviewed
  if (agent.lastChecked) {
    const ageDays = (Date.now() - new Date(agent.lastChecked).getTime()) / 86_400_000;
    if (ageDays <= 30) confidence += 10;                    // fresh data
  }
  if ((agent.evidenceSources ?? []).length >= 2) confidence += 10;
  if (agent.adminNotes) confidence += 10;                   // verdict on record
  if (opts.hasToolDecisions) confidence += 15;              // behavioral data
  confidence = Math.min(100, confidence);

  // ── risk_level ────────────────────────────────────────────────────────────
  let risk_level: RiskLevel;
  if (
    agent.treasuryHealth === "At Risk" ||
    (tier <= TIER["Needs Verification"] && wallets.length === 0)
  ) {
    risk_level = "HIGH";
  } else if (
    tier >= TIER["Claimed"] ||
    (tier === TIER["Wallets Declared"] &&
      (agent.treasuryHealth === "Healthy" || agent.treasuryHealth === "Stable"))
  ) {
    risk_level = "LOW";
  } else {
    risk_level = "MEDIUM";
  }

  // ── recommendation ────────────────────────────────────────────────────────
  // BLOCK is reserved for explicit negative signals, never for mere absence
  // of data — absence is REVIEW.
  let recommendation: Recommendation;
  if (agent.treasuryHealth === "At Risk" && tier <= TIER["Needs Verification"]) {
    recommendation = "BLOCK";
  } else if (status === "Needs Verification") {
    recommendation = "REVIEW";
  } else if (
    tier >= TIER["Verified"] ||
    (tier >= TIER["Wallets Declared"] && risk_level === "LOW" && confidence >= 50)
  ) {
    recommendation = "ALLOW";
  } else {
    recommendation = "REVIEW";
  }

  // ── key_drivers (max 4, real data only) ───────────────────────────────────
  const drivers: string[] = [];

  if (roles.size > 0) {
    drivers.push(`${[...roles].sort().join(" + ")} wallet roles declared via manifest`);
  } else if (wallets.length > 0) {
    drivers.push(`${wallets.length} wallet(s) declared, roles unverified`);
  } else {
    drivers.push("No wallets declared");
  }

  if (tier >= TIER["Luca Managed"]) drivers.push("Finances actively monitored by Luca");
  else if (tier >= TIER["Verified"]) drivers.push("Verified by Luca review");
  else if (tier >= TIER["Claimed"]) drivers.push("Profile claimed by team, wallet matched");
  else if (status === "Needs Verification") drivers.push("Flagged: needs verification");
  else if (tier <= TIER["Candidate"]) drivers.push("No ownership proof on record");

  if (agent.treasuryHealth !== "Pending") {
    drivers.push(`Treasury health: ${agent.treasuryHealth}`);
  }

  if (opts.hasToolDecisions) {
    drivers.push("Tool decision history indexed, no anomalies flagged");
  } else if (agent.financialActivityScore !== null) {
    drivers.push(`Financial activity score ${agent.financialActivityScore}/100`);
  }

  return {
    trust_score,
    confidence,
    verification_status: status,
    risk_level,
    recommendation,
    key_drivers: drivers.slice(0, 4),
  };
}
