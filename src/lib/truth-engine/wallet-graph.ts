import type { ParsedManifest } from "./manifest-validator";

const BOOKS_ELIGIBLE_ROLES = new Set(["treasury", "revenue", "fee", "operator"]);

export interface WalletGraphEntry {
  address:         string;
  chain:           string;
  role:            string;
  claim_status:    "declared";
  evidence_status: "attributed";
  books_eligible:  boolean;
  confidence:      "high";
  source_type:     "manifest";
  source_ref:      string;
  label?:          string;
  notes?:          string;
}

export interface WalletRoleGraph {
  agent_slug: string;
  wallets:    WalletGraphEntry[];
}

export function normalizeWalletGraph(
  manifest: ParsedManifest,
  source_ref = ".agent/wallets.json",
): WalletRoleGraph {
  const agent_slug = manifest.agent.toLowerCase().replace(/\s+/g, "-");

  return {
    agent_slug,
    wallets: manifest.wallets.map((w) => ({
      address:         w.address,
      chain:           w.chain,
      role:            w.role,
      claim_status:    "declared",
      evidence_status: "attributed",
      books_eligible:  BOOKS_ELIGIBLE_ROLES.has(w.role),
      confidence:      "high",
      source_type:     "manifest",
      source_ref,
      label:           w.label,
      notes:           w.notes,
    })),
  };
}
