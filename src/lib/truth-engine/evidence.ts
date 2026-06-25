import type { ParsedManifest } from "./manifest-validator";
import type { WalletGraphEntry } from "./wallet-graph";

export interface EvidencePacket {
  subject_type:     string;
  subject_slug:     string;
  claim:            string;
  status:           string;
  confidence:       string;
  evidence_summary: string;
  evidence_payload: Record<string, unknown>;
  source_type:      string;
  source_ref:       string | null;
}

export function buildManifestEvidencePacket(
  agentSlug: string,
  manifest: ParsedManifest,
  sourceUrl: string,
): EvidencePacket {
  return {
    subject_type:     "agent",
    subject_slug:     agentSlug,
    claim:            "wallet_manifest_declared",
    status:           "attributed",
    confidence:       "high",
    evidence_summary: `Agent declared ${manifest.wallets.length} wallet(s) via manifest at ${sourceUrl}`,
    evidence_payload: {
      manifest_version: manifest.version ?? null,
      wallet_count:     manifest.wallets.length,
      roles:            [...new Set(manifest.wallets.map((w) => w.role))],
      chains:           [...new Set(manifest.wallets.map((w) => w.chain))],
      source_url:       sourceUrl,
    },
    source_type: "manifest",
    source_ref:  sourceUrl,
  };
}

export function buildWalletClaimEvidencePacket(
  agentSlug: string,
  wallet: WalletGraphEntry,
  sourceUrl: string,
): EvidencePacket {
  return {
    subject_type:     "wallet",
    subject_slug:     `${agentSlug}:${wallet.address.toLowerCase()}`,
    claim:            `role:${wallet.role}`,
    status:           "attributed",
    confidence:       wallet.confidence,
    evidence_summary: `Wallet ${wallet.address} declared as ${wallet.role} on ${wallet.chain} via manifest`,
    evidence_payload: {
      address:        wallet.address,
      role:           wallet.role,
      chain:          wallet.chain,
      books_eligible: wallet.books_eligible,
      source_url:     sourceUrl,
    },
    source_type: "manifest",
    source_ref:  sourceUrl,
  };
}
