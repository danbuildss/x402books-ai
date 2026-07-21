import type { WalletRoleGraph } from "./wallet-graph";

// Books eligibility for truth-engine wallet graphs.
//
// This must stay in lockstep with src/lib/wallet-eligibility.ts (which gates
// the books pipeline) and the registry_agent_wallets books_eligible DB trigger.
// The shared doctrine, expressed here in role terms because manifest-declared
// graphs are the only input:
//   - only manifest-declared wallets are eligible (graphs are manifest-only by
//     construction: source_type is always "manifest")
//   - token contracts are never books-eligible
//   - only operational roles produce books
export const BOOKS_ELIGIBLE_ROLES = new Set([
  "treasury", "revenue", "fee", "fee_recipient", "operator",
]);

export const BOOKS_INELIGIBLE_ROLES = new Set([
  "token_contract", "token", "smart_contract", "token_bound_account",
]);

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

    const role = (w.role ?? "").toLowerCase();
    const fromManifest = (w.source_type ?? "") === "manifest";

    let reason: string;
    let ok = false;
    if (!fromManifest) {
      reason = "Not manifest-declared — only manifest wallets produce books";
    } else if (BOOKS_INELIGIBLE_ROLES.has(role)) {
      reason = `role=${role} — token/contract roles are never books-eligible`;
    } else if (BOOKS_ELIGIBLE_ROLES.has(role)) {
      reason = "Declared wallet role is books-eligible";
      ok = true;
    } else {
      reason = "Role is not books-eligible under current Zetta rules";
    }

    const entry: EligibilityEntry = {
      address:    w.address,
      role:       w.role,
      chain:      w.chain,
      reason,
      confidence: conf,
    };

    (ok ? eligible : ineligible).push(entry);
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
