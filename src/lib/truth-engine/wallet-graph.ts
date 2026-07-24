import type { ParsedManifest, WalletStatus, ClaimSource, ControlProof } from "./manifest-validator";
import { toSlug } from "@/lib/slug";
import { BOOKS_ELIGIBLE_ROLES } from "./books-eligibility";

export interface WalletGraphEntry {
  address: string;
  chain: string;
  role: string;
  claim_status: "declared" | "revoked" | "inactive";
  evidence_status: "attributed" | "verified";
  control_status: "unverified" | "operator_attested" | "cryptographically_verified" | "contract_verified";
  claim_source: ClaimSource;
  control_proof: ControlProof;
  valid_from?: string;
  valid_until?: string;
  status: WalletStatus;
  claimed_at?: string;
  verified_at?: string;
  revoked_at?: string;
  revocation_reason?: string;
  books_eligible: boolean;
  confidence: "high" | "medium";
  source_type: "manifest";
  source_ref: string;
  label?: string;
  notes?: string;
}

export interface WalletRoleGraph {
  agent_slug: string;
  manifest_agent_id?: string;
  wallets: WalletGraphEntry[];
}

function controlStatus(proof: ControlProof): WalletGraphEntry["control_status"] {
  if (proof === "eip712" || proof === "solana_signature") return "cryptographically_verified";
  if (proof === "eip1271" || proof === "onchain_registry") return "contract_verified";
  if (proof === "operator_attestation") return "operator_attested";
  return "unverified";
}

export function normalizeWalletGraph(
  manifest: ParsedManifest,
  source_ref = ".agent/wallets.json",
): WalletRoleGraph {
  const agent_slug = toSlug(manifest.agent);

  return {
    agent_slug,
    manifest_agent_id: manifest.agent_id,
    wallets: manifest.wallets.map((w) => {
      const proof = w.control_proof ?? "none";
      const status = w.status ?? "active";
      const control = controlStatus(proof);
      const evidence = control === "cryptographically_verified" || control === "contract_verified" ? "verified" : "attributed";
      return {
        address: w.chain === "solana" ? w.address : w.address.toLowerCase(),
        chain: w.chain,
        role: w.role,
        claim_status: status === "revoked" ? "revoked" : status === "inactive" ? "inactive" : "declared",
        evidence_status: evidence,
        control_status: control,
        claim_source: w.claim_source ?? "repository_manifest",
        control_proof: proof,
        valid_from: w.valid_from,
        valid_until: w.valid_until,
        status,
        claimed_at: w.claimed_at,
        verified_at: w.verified_at,
        revoked_at: w.revoked_at,
        revocation_reason: w.revocation_reason,
        books_eligible: status === "active" && BOOKS_ELIGIBLE_ROLES.has(w.role),
        confidence: evidence === "verified" ? "high" : "medium",
        source_type: "manifest",
        source_ref,
        label: w.label,
        notes: w.notes,
      };
    }),
  };
}
