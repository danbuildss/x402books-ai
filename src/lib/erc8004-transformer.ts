import type { Agent } from "@/app/registry/types";
import type { Erc8004RawAgent } from "./erc8004-client";

export type Erc8004TransformResult = {
  agent: Omit<Partial<Agent>, "erc8004MetadataUri"> & {
    name: string;
    ecosystem: "Base";
    verificationStatus: "ERC-8004 Indexed" | "Awaiting Manifest";
    erc8004AgentId: string;
    erc8004MetadataUri: string | null;
  };
  wallets: Array<{
    address: string;
    label: string;
    role: string;
    chain: "base";
    confidence: string;
    evidenceSource: "erc8004";
    address_type: "unknown";
    notes: string;
  }>;
  manifestUri: string | null;
  warnings: string[];
};

function extractHandle(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1].replace(/^@/, "");
  } catch {
    // not a valid URL
  }
  return null;
}

const GITHUB_RE = /https?:\/\/(github|gitlawb)\.com\/[^/\s]+\/[^/\s]+/i;

export function transformErc8004Agent(raw: Erc8004RawAgent): Erc8004TransformResult {
  const warnings: string[] = [];
  const { agentId, metadata, metadataUri, agentWallet, metadataError } = raw;

  if (!metadata) {
    warnings.push(metadataError ? `Metadata fetch failed: ${metadataError}` : "No metadata URI");
  }

  const name = metadata?.name?.trim() || `ERC-8004 Agent #${agentId}`;
  if (!metadata?.name) warnings.push("No name in metadata — using fallback");

  const services = metadata?.services ?? [];

  let xHandle: string | undefined;
  const xService = services.find((s) => s.type === "x" || s.type === "twitter");
  if (xService?.url) {
    const handle = extractHandle(xService.url);
    if (handle) xHandle = handle;
  }

  let website: string | null = null;
  const webService = services.find((s) => s.type === "web" || s.type === "website");
  if (webService?.url) website = webService.url;

  let manifestUri: string | null = null;
  for (const svc of services) {
    if (svc.url && GITHUB_RE.test(svc.url)) {
      manifestUri = svc.url;
      break;
    }
  }

  const wallets: Erc8004TransformResult["wallets"] = [];
  if (agentWallet) {
    wallets.push({
      address: agentWallet,
      label: "candidate wallet",
      role: "operator",
      chain: "base",
      confidence: "declared",
      evidenceSource: "erc8004",
      address_type: "unknown",
      notes: "EIP-712 signed wallet from ERC-8004 getAgentWallet — classify separately",
    });
  } else {
    warnings.push("No agentWallet set on contract");
  }

  return {
    agent: {
      name,
      ecosystem: "Base",
      verificationStatus: "Awaiting Manifest",
      evidenceSources: ["ERC-8004"],
      erc8004AgentId: agentId,
      erc8004MetadataUri: metadataUri,
      ...(xHandle ? { xHandle } : {}),
      ...(website ? { website } : {}),
    },
    wallets,
    manifestUri,
    warnings,
  };
}
