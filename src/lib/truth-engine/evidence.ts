import type { ParsedManifest } from "./manifest-validator";
import type { WalletGraphEntry } from "./wallet-graph";

export interface EvidencePacket {
  subject_type: string;
  subject_slug: string;
  claim: string;
  status: string;
  confidence: string;
  evidence_summary: string;
  evidence_payload: Record<string, unknown>;
  source_type: string;
  source_ref: string | null;
}

export function buildManifestEvidencePacket(
  agentSlug: string,
  manifest: ParsedManifest,
  sourceUrl: string,
): EvidencePacket {
  return {
    subject_type: "agent",
    subject_slug: agentSlug,
    claim: "wallet_manifest_declared",
    status: "attributed",
    confidence: "high",
    evidence_summary: `A repository manifest declares ${manifest.wallets.length} wallet(s) for this agent; publication does not prove wallet control`,
    evidence_payload: {
      manifest_agent_id: manifest.agent_id ?? null,
      manifest_version: manifest.version ?? null,
      wallet_count: manifest.wallets.length,
      roles: [...new Set(manifest.wallets.map((w) => w.role))],
      chains: [...new Set(manifest.wallets.map((w) => w.chain))],
      source_url: sourceUrl,
      proves_control: false,
      proves_revenue: false,
    },
    source_type: "manifest",
    source_ref: sourceUrl,
  };
}

export function buildWalletClaimEvidencePacket(
  agentSlug: string,
  wallet: WalletGraphEntry,
  sourceUrl: string,
): EvidencePacket {
  return {
    subject_type: "wallet",
    subject_slug: `${agentSlug}:${wallet.address.toLowerCase()}`,
    claim: `role:${wallet.role}`,
    status: wallet.evidence_status,
    confidence: wallet.confidence,
    evidence_summary: `Wallet declared as ${wallet.role} on ${wallet.chain}; control status is ${wallet.control_status}`,
    evidence_payload: {
      address: wallet.address,
      role: wallet.role,
      chain: wallet.chain,
      status: wallet.status,
      claim_source: wallet.claim_source,
      control_proof: wallet.control_proof,
      control_status: wallet.control_status,
      valid_from: wallet.valid_from ?? null,
      valid_until: wallet.valid_until ?? null,
      revoked_at: wallet.revoked_at ?? null,
      books_eligible: wallet.books_eligible,
      source_url: sourceUrl,
      proves_revenue: false,
    },
    source_type: "manifest",
    source_ref: sourceUrl,
  };
}
