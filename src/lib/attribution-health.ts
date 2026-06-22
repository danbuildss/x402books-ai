// Attribution Health — per-agent and platform-wide attribution metrics.
//
// Attribution is the foundation of everything: revenue, GDP, confidence.
// These metrics track how well the registry is doing at the identity layer.

import { getRegistryAgents } from "@/lib/registry-db";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { Agent } from "@/app/registry/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ManifestStatus = "manifest" | "admin" | "inferred" | "none";
export type AttributionConfidence = "high" | "medium" | "low" | "unattributed";

export type AgentAttributionHealth = {
  slug: string;
  name: string;
  ecosystem: string;
  manifest_status: ManifestStatus;
  wallet_count: number;
  wallets_with_roles: number;
  role_coverage_pct: number;
  has_revenue_wallet: boolean;
  has_treasury_wallet: boolean;
  confidence: AttributionConfidence;
};

export type AttributionMetrics = {
  total_agents: number;
  attributed_agents: number;       // any wallets declared
  manifest_agents: number;         // at least 1 manifest-sourced wallet
  attribution_coverage_pct: number; // attributed / total
  manifest_coverage_pct: number;   // manifest / total
  total_wallets: number;
  wallets_with_roles: number;
  role_coverage_pct: number;
  status_breakdown: {
    manifest: number;
    admin_attributed: number;
    inferred: number;
    none: number;
  };
  agents: AgentAttributionHealth[];
  generated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const REVENUE_ROLES = new Set(["fee", "operator", "revenue", "payment_receiver"]);
const TREASURY_ROLES = new Set(["treasury"]);

function walletManifestStatus(agent: Agent): ManifestStatus {
  const wallets = agent.wallets ?? [];
  if (wallets.length === 0) return "none";
  const sources = wallets.map((w) => (w.evidenceSource ?? "").toLowerCase());
  if (sources.some((s) => s === "manifest")) return "manifest";
  if (sources.some((s) => s === "admin" || s === "luca")) return "admin";
  return "inferred";
}

function scoreConfidence(
  status: ManifestStatus,
  hasRevenue: boolean,
  hasTreasury: boolean,
  walletCount: number,
): AttributionConfidence {
  if (status === "none") return "unattributed";
  if (status === "manifest" && hasRevenue && hasTreasury) return "high";
  if (status === "manifest" || (status === "admin" && walletCount >= 2)) return "medium";
  return "low";
}

function buildAgentHealth(agent: Agent): AgentAttributionHealth {
  const wallets = agent.wallets ?? [];
  const slug = toSlug(agent.name);
  const status = walletManifestStatus(agent);

  const walletCount = wallets.length;
  const walletsWithRoles = wallets.filter((w) => {
    const role = (w.role ?? "").toLowerCase();
    return role !== "" && role !== "unknown";
  }).length;
  const roleCoveragePct = walletCount > 0 ? Math.round((walletsWithRoles / walletCount) * 100) : 0;
  const hasRevenueWallet = wallets.some((w) => REVENUE_ROLES.has((w.role ?? "").toLowerCase()));
  const hasTreasuryWallet = wallets.some((w) => TREASURY_ROLES.has((w.role ?? "").toLowerCase()));
  const confidence = scoreConfidence(status, hasRevenueWallet, hasTreasuryWallet, walletCount);

  return {
    slug,
    name: agent.name,
    ecosystem: agent.ecosystem,
    manifest_status: status,
    wallet_count: walletCount,
    wallets_with_roles: walletsWithRoles,
    role_coverage_pct: roleCoveragePct,
    has_revenue_wallet: hasRevenueWallet,
    has_treasury_wallet: hasTreasuryWallet,
    confidence,
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
  const attributedAgents = agentHealths.filter((h) => h.manifest_status !== "none").length;
  const manifestAgents = agentHealths.filter((h) => h.manifest_status === "manifest").length;
  const totalWallets = agentHealths.reduce((s, h) => s + h.wallet_count, 0);
  const walletsWithRoles = agentHealths.reduce((s, h) => s + h.wallets_with_roles, 0);

  const data: AttributionMetrics = {
    total_agents: totalAgents,
    attributed_agents: attributedAgents,
    manifest_agents: manifestAgents,
    attribution_coverage_pct: totalAgents > 0 ? Math.round((attributedAgents / totalAgents) * 100) : 0,
    manifest_coverage_pct: totalAgents > 0 ? Math.round((manifestAgents / totalAgents) * 100) : 0,
    total_wallets: totalWallets,
    wallets_with_roles: walletsWithRoles,
    role_coverage_pct: totalWallets > 0 ? Math.round((walletsWithRoles / totalWallets) * 100) : 0,
    status_breakdown: {
      manifest: agentHealths.filter((h) => h.manifest_status === "manifest").length,
      admin_attributed: agentHealths.filter((h) => h.manifest_status === "admin").length,
      inferred: agentHealths.filter((h) => h.manifest_status === "inferred").length,
      none: agentHealths.filter((h) => h.manifest_status === "none").length,
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
