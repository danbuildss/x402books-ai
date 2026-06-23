// Attribution Health — per-agent and platform-wide attribution metrics.
//
// Attribution is the foundation of everything: revenue, GDP, confidence.
//
// Tier definitions (strict):
//   manifest_attributed — agent has ≥1 manifest-declared, books-eligible wallet
//                         (evidenceSource=manifest, address_type not contract)
//   discovered          — agent has wallets but ALL are admin/inferred/contract;
//                         no books can be produced
//   unattributed        — agent has no wallets at all
//
// "Attributed" in public metrics ONLY counts manifest_attributed.
// Discovered agents do NOT inflate attributed count.

import { getRegistryAgents } from "@/lib/registry-db";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { Agent, AgentWallet } from "@/app/registry/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ManifestStatus = "manifest" | "admin" | "inferred" | "none";
export type AttributionConfidence = "high" | "medium" | "low" | "unattributed";
export type AttributionTier =
  | "manifest_attributed"  // ≥1 manifest+books-eligible wallet → can produce books
  | "discovered"           // has wallets but none are manifest+books-eligible
  | "unattributed";        // no wallets at all

export type WalletAttributionRow = {
  address: string;
  label: string;
  role: string | null;
  chain: string | null;
  evidence_source: string | null;
  address_type: string | null;
  attribution: "manifest" | "discovered" | "unknown";
  is_books_eligible: boolean;
  ineligibility_reason: string | null;
};

export type AgentAttributionHealth = {
  slug: string;
  name: string;
  ecosystem: string;
  manifest_status: ManifestStatus;
  attribution_tier: AttributionTier;
  wallet_count: number;
  books_eligible_wallet_count: number;
  wallets_with_roles: number;
  role_coverage_pct: number;
  has_revenue_wallet: boolean;
  has_treasury_wallet: boolean;
  confidence: AttributionConfidence;
  wallet_detail: WalletAttributionRow[];
};

export type AttributionMetrics = {
  total_agents: number;
  // Strict: only agents with manifest-declared books-eligible wallets
  manifest_attributed_agents: number;
  // Legacy alias — equals manifest_attributed_agents (DO NOT include discovered)
  attributed_agents: number;
  // Agents with wallets that are all admin/inferred/contracts — no books eligible
  discovered_agents: number;
  // Agents with no wallets at all
  unattributed_agents: number;
  manifest_agents: number;
  attribution_coverage_pct: number; // manifest_attributed / total
  manifest_coverage_pct: number;
  total_wallets: number;
  books_eligible_wallets: number;
  contract_wallets: number;
  discovered_wallets: number;
  wallets_with_roles: number;
  role_coverage_pct: number;
  status_breakdown: {
    manifest: number;
    admin_attributed: number;
    inferred: number;
    none: number;
  };
  tier_breakdown: {
    manifest_attributed: number;
    discovered: number;
    unattributed: number;
  };
  agents: AgentAttributionHealth[];
  generated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const REVENUE_ROLES = new Set(["fee", "operator", "revenue", "payment_receiver"]);
const TREASURY_ROLES = new Set(["treasury"]);
const CONTRACT_TYPES = new Set([
  "token_contract",
  "smart_contract",
  "proxy_contract",
  "vault",
]);

function isBooksEligible(w: AgentWallet, agentTokenAddress: string | null): {
  eligible: boolean;
  reason: string | null;
} {
  const src = (w.evidenceSource ?? "").toLowerCase();
  const atype = (w.address_type ?? "").toLowerCase();
  const role = (w.role ?? "").toLowerCase();

  if (src !== "manifest") {
    return { eligible: false, reason: `evidenceSource=${src || "empty"} — only manifest wallets produce books` };
  }
  if (agentTokenAddress && w.address.toLowerCase() === agentTokenAddress.toLowerCase()) {
    return { eligible: false, reason: "address matches agent token contract" };
  }
  if (CONTRACT_TYPES.has(atype)) {
    return { eligible: false, reason: `address_type=${atype} — contracts are not operator wallets` };
  }
  if (role === "token_contract" || role === "token") {
    return { eligible: false, reason: `role=${role} — not an operator wallet` };
  }
  return { eligible: true, reason: null };
}

function walletManifestStatus(agent: Agent): ManifestStatus {
  const wallets = agent.wallets ?? [];
  if (wallets.length === 0) return "none";
  const sources = wallets.map((w) => (w.evidenceSource ?? "").toLowerCase());
  if (sources.some((s) => s === "manifest")) return "manifest";
  if (sources.some((s) => s === "admin" || s === "luca")) return "admin";
  return "inferred";
}

function scoreConfidence(
  tier: AttributionTier,
  hasRevenue: boolean,
  hasTreasury: boolean,
  booksEligibleCount: number,
): AttributionConfidence {
  if (tier !== "manifest_attributed") return "unattributed";
  if (hasRevenue && hasTreasury) return "high";
  if (booksEligibleCount >= 1) return "medium";
  return "low";
}

function buildWalletDetail(agent: Agent): WalletAttributionRow[] {
  return (agent.wallets ?? []).map((w) => {
    const src = (w.evidenceSource ?? "").toLowerCase();
    const attribution: WalletAttributionRow["attribution"] =
      src === "manifest" ? "manifest" :
      src === "admin" || src === "luca" || src === "inferred" ? "discovered" :
      "unknown";

    const { eligible, reason } = isBooksEligible(w, agent.tokenAddress);

    return {
      address: w.address,
      label: w.label ?? "unknown role",
      role: w.role ?? null,
      chain: w.chain ?? null,
      evidence_source: w.evidenceSource ?? null,
      address_type: w.address_type ?? null,
      attribution,
      is_books_eligible: eligible,
      ineligibility_reason: reason,
    };
  });
}

function buildAgentHealth(agent: Agent): AgentAttributionHealth {
  const wallets = agent.wallets ?? [];
  const slug = toSlug(agent.name);
  const manifestStatus = walletManifestStatus(agent);
  const walletDetail = buildWalletDetail(agent);

  const booksEligibleWallets = walletDetail.filter((w) => w.is_books_eligible);
  const booksEligibleCount = booksEligibleWallets.length;

  const attributionTier: AttributionTier =
    booksEligibleCount > 0 ? "manifest_attributed" :
    wallets.length > 0 ? "discovered" :
    "unattributed";

  const walletCount = wallets.length;
  const walletsWithRoles = wallets.filter((w) => {
    const role = (w.role ?? "").toLowerCase();
    return role !== "" && role !== "unknown";
  }).length;
  const roleCoveragePct = walletCount > 0 ? Math.round((walletsWithRoles / walletCount) * 100) : 0;

  // Revenue/treasury checks only on books-eligible wallets
  const hasRevenueWallet = booksEligibleWallets.some((w) =>
    REVENUE_ROLES.has((w.role ?? "").toLowerCase()),
  );
  const hasTreasuryWallet = booksEligibleWallets.some((w) =>
    TREASURY_ROLES.has((w.role ?? "").toLowerCase()),
  );

  const confidence = scoreConfidence(attributionTier, hasRevenueWallet, hasTreasuryWallet, booksEligibleCount);

  return {
    slug,
    name: agent.name,
    ecosystem: agent.ecosystem,
    manifest_status: manifestStatus,
    attribution_tier: attributionTier,
    wallet_count: walletCount,
    books_eligible_wallet_count: booksEligibleCount,
    wallets_with_roles: walletsWithRoles,
    role_coverage_pct: roleCoveragePct,
    has_revenue_wallet: hasRevenueWallet,
    has_treasury_wallet: hasTreasuryWallet,
    confidence,
    wallet_detail: walletDetail,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const ATTR_CACHE_TTL = 15 * 60 * 1000;
let _cache: { data: AttributionMetrics; expires: number } | null = null;

export async function getAttributionMetrics(): Promise<AttributionMetrics> {
  if (_cache && _cache.expires > Date.now()) return _cache.data;

  const { agents } = await getRegistryAgents();
  const agentHealths = agents.map(buildAgentHealth);

  const totalAgents = agents.length;
  const manifestAttributedAgents = agentHealths.filter((h) => h.attribution_tier === "manifest_attributed").length;
  const discoveredAgents = agentHealths.filter((h) => h.attribution_tier === "discovered").length;
  const unattributedAgents = agentHealths.filter((h) => h.attribution_tier === "unattributed").length;
  const manifestAgents = agentHealths.filter((h) => h.manifest_status === "manifest").length;
  const totalWallets = agentHealths.reduce((s, h) => s + h.wallet_count, 0);
  const booksEligibleWallets = agentHealths.reduce((s, h) => s + h.books_eligible_wallet_count, 0);
  const walletsWithRoles = agentHealths.reduce((s, h) => s + h.wallets_with_roles, 0);

  const allWalletDetails = agentHealths.flatMap((h) => h.wallet_detail);
  const contractWallets = allWalletDetails.filter((w) =>
    CONTRACT_TYPES.has((w.address_type ?? "").toLowerCase()),
  ).length;
  const discoveredWallets = allWalletDetails.filter((w) => w.attribution === "discovered").length;

  const data: AttributionMetrics = {
    total_agents: totalAgents,
    manifest_attributed_agents: manifestAttributedAgents,
    attributed_agents: manifestAttributedAgents, // strict alias — only manifest
    discovered_agents: discoveredAgents,
    unattributed_agents: unattributedAgents,
    manifest_agents: manifestAgents,
    attribution_coverage_pct: totalAgents > 0 ? Math.round((manifestAttributedAgents / totalAgents) * 100) : 0,
    manifest_coverage_pct: totalAgents > 0 ? Math.round((manifestAgents / totalAgents) * 100) : 0,
    total_wallets: totalWallets,
    books_eligible_wallets: booksEligibleWallets,
    contract_wallets: contractWallets,
    discovered_wallets: discoveredWallets,
    wallets_with_roles: walletsWithRoles,
    role_coverage_pct: totalWallets > 0 ? Math.round((walletsWithRoles / totalWallets) * 100) : 0,
    status_breakdown: {
      manifest: agentHealths.filter((h) => h.manifest_status === "manifest").length,
      admin_attributed: agentHealths.filter((h) => h.manifest_status === "admin").length,
      inferred: agentHealths.filter((h) => h.manifest_status === "inferred").length,
      none: agentHealths.filter((h) => h.manifest_status === "none").length,
    },
    tier_breakdown: {
      manifest_attributed: manifestAttributedAgents,
      discovered: discoveredAgents,
      unattributed: unattributedAgents,
    },
    agents: agentHealths,
    generated_at: new Date().toISOString(),
  };

  _cache = { data, expires: Date.now() + ATTR_CACHE_TTL };
  return data;
}

export function invalidateAttributionCache() {
  _cache = null;
}
