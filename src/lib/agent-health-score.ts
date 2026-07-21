// Agent financial health score — 0–100 composite.
//
// Components (weights sum to 100):
//   wallet_coverage   30pts — has declared wallets
//   verification      35pts — verification tier (Verified/Luca Managed = full, down to Candidate = 0)
//   evidence          20pts — evidence sources attached
//   activity          15pts — treasury health / on-chain activity
//
// This is a transparency and identity score, not a revenue or wealth score.
// A low score means "we don't have enough information", not "this agent is failing."

import type { PublicAgent, Agent } from "@/app/registry/types";

export type HealthScoreBreakdown = {
  total: number;
  wallet_coverage:  number;
  verification:     number;
  evidence:         number;
  activity:         number;
  grade: "A" | "B" | "C" | "D" | "F";
};

type ScoredAgent = Pick<
  Agent | PublicAgent,
  "wallets" | "verificationStatus" | "evidenceSources"
> & { treasuryHealth?: string };

export function agentHealthScore(agent: ScoredAgent): HealthScoreBreakdown {
  const wallets = agent.wallets ?? [];

  // Wallet coverage — 30 pts
  let wallet_coverage = 0;
  if (wallets.length >= 3) wallet_coverage = 30;
  else if (wallets.length === 2) wallet_coverage = 22;
  else if (wallets.length === 1) wallet_coverage = 14;

  // Verification tier — 35 pts
  const verif = agent.verificationStatus;
  let verification = 0;
  if (verif === "Verified" || verif === "Luca Managed") verification = 35;
  else if (verif === "ERC-8004 Indexed")                verification = 28;
  else if (verif === "Claimed")                         verification = 22;
  else if (verif === "Wallets Declared")                verification = 14;
  else if (verif === "Needs Verification")              verification = 7;

  // Evidence sources — 20 pts
  const evCount = (agent.evidenceSources ?? []).length;
  let evidence = 0;
  if (evCount >= 3)      evidence = 20;
  else if (evCount === 2) evidence = 14;
  else if (evCount === 1) evidence = 8;

  // Activity / treasury health — 15 pts
  let activity = 0;
  const th = (agent as Agent).treasuryHealth;
  if (th === "Active")       activity = 15;
  else if (th === "Stable")  activity = 12;
  else if (th === "Pending") activity = 6;
  else if (th === "Unverified" || !th) activity = 3;

  const total = Math.min(100, wallet_coverage + verification + evidence + activity);

  const grade: HealthScoreBreakdown["grade"] =
    total >= 85 ? "A" :
    total >= 70 ? "B" :
    total >= 50 ? "C" :
    total >= 30 ? "D" : "F";

  return { total, wallet_coverage, verification, evidence, activity, grade };
}

export function gradeColor(grade: string): string {
  return grade === "A" ? "#4AE8A0" :
         grade === "B" ? "#4AE8A0" :
         grade === "C" ? "#F4B942" :
         grade === "D" ? "#F4B942" : "#F46060";
}
