import type { WalletRoleGraph } from "./wallet-graph";

const ELIGIBLE_ROLES = new Set(["treasury", "revenue", "fee", "operator"]);

export interface EligibilityEntry {
  address:    string;
  role:       string;
  chain:      string;
  reason:     string;
  confidence: string;
}

export interface BooksEligibilitySnapshot {
  agent_slug:         string;
  period_label:       string;
  wallet_count:       number;
  eligible_wallets:   EligibilityEntry[];
  ineligible_wallets: EligibilityEntry[];
  reasons:            string[];
  confidence_summary: Record<string, number>;
}

export function assessBooksEligibility(
  graph: WalletRoleGraph,
  period_label: string,
): BooksEligibilitySnapshot {
  const eligible:   EligibilityEntry[] = [];
  const ineligible: EligibilityEntry[] = [];
  const confidenceCounts: Record<string, number> = {};

  for (const w of graph.wallets) {
    const conf = w.confidence ?? "medium";
    confidenceCounts[conf] = (confidenceCounts[conf] ?? 0) + 1;

    const entry: EligibilityEntry = {
      address:    w.address,
      role:       w.role,
      chain:      w.chain,
      reason:     ELIGIBLE_ROLES.has(w.role)
        ? "Declared wallet role is books-eligible"
        : "Role is not books-eligible under current Zetta rules",
      confidence: conf,
    };

    if (ELIGIBLE_ROLES.has(w.role)) {
      eligible.push(entry);
    } else {
      ineligible.push(entry);
    }
  }

  const reasons: string[] = [];
  if (eligible.length > 0) {
    reasons.push(`${eligible.length} wallet(s) eligible via declared manifest role`);
  }
  if (ineligible.length > 0) {
    reasons.push(`${ineligible.length} wallet(s) excluded — role not in books-eligible set`);
  }

  return {
    agent_slug:         graph.agent_slug,
    period_label,
    wallet_count:       graph.wallets.length,
    eligible_wallets:   eligible,
    ineligible_wallets: ineligible,
    reasons,
    confidence_summary: confidenceCounts,
  };
}
