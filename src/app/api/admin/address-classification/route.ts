// GET /api/admin/address-classification
//
// Classifies every wallet address in the registry and returns a migration report.
// Separates attribution (manifest wallets) from discovery (admin/inferred wallets).
//
// Report includes:
//   - total_agents, attributed_agents, discovered_only_agents, unattributed_agents
//   - total_addresses, eoa_count, token_contract_count, smart_contract_count, etc.
//   - per-agent breakdown with address_type for each wallet
//
// Protected by ZETTA_INTERNAL_SECRET.
// Uses Alchemy Base-mainnet RPC to classify each address.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { classifyAddressBatch } from "@/lib/address-classifier";
import type { AddressType } from "@/lib/address-classifier";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // classification can be slow for large registries

type WalletReport = {
  address: string;
  label: string;
  role: string | null;
  chain: string | null;
  evidence_source: string | null;
  address_type: AddressType;
  attribution: "manifest" | "discovered" | "unknown";
  is_valid_for_books: boolean;
  error?: string;
};

type AgentReport = {
  name: string;
  slug: string;
  ecosystem: string;
  token_address: string | null;
  wallets: WalletReport[];
  manifest_wallet_count: number;
  discovered_wallet_count: number;
  eoa_count: number;
  contract_count: number;
  token_contract_count: number;
  attribution_status: "attributed" | "discovered_only" | "unattributed";
};

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const writeResults = url.searchParams.get("write") === "true";

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ALCHEMY_API_KEY not configured" }, { status: 500 });
  }

  const { agents } = await getRegistryAgents();

  // Collect all unique addresses to classify in one batched pass
  const allAddresses = new Set<string>();
  for (const agent of agents) {
    for (const w of agent.wallets ?? []) {
      if (w.address) allAddresses.add(w.address.toLowerCase());
    }
  }

  // Known token contract addresses (agent.tokenAddress) — fast-path in classifier
  const knownTokenAddresses = new Set(
    agents
      .map((a) => a.tokenAddress?.toLowerCase())
      .filter((a): a is string => !!a),
  );

  // Classify all addresses
  const classificationResults = await classifyAddressBatch(
    [...allAddresses],
    apiKey,
    knownTokenAddresses,
  );

  const classificationMap = new Map<string, AddressType>();
  for (const r of classificationResults) {
    classificationMap.set(r.address.toLowerCase(), r.address_type);
  }

  // Write address_type back to DB when ?write=true
  let rowsUpdated = 0;
  let writeError: string | null = null;
  if (writeResults) {
    if (!hasSupabaseAdminEnv()) {
      writeError = "Supabase not configured — cannot write results";
    } else {
      const supabase = getSupabaseAdminClient();
      const updates = [...classificationMap.entries()].map(([address, address_type]) => ({
        address,
        address_type,
      }));
      // Batch upsert by address — relies on address being unique per row (best-effort match)
      for (const { address, address_type } of updates) {
        const { error } = await supabase
          .from("registry_agent_wallets")
          .update({ address_type })
          .eq("address", address);
        if (!error) rowsUpdated++;
        else if (!writeError) writeError = error.message;
      }
    }
  }

  // Build per-agent report
  const agentReports: AgentReport[] = [];

  for (const agent of agents) {
    const wallets = agent.wallets ?? [];
    if (wallets.length === 0) {
      agentReports.push({
        name: agent.name,
        slug: agent.name.toLowerCase().replace(/\s+/g, "-"),
        ecosystem: agent.ecosystem,
        token_address: agent.tokenAddress,
        wallets: [],
        manifest_wallet_count: 0,
        discovered_wallet_count: 0,
        eoa_count: 0,
        contract_count: 0,
        token_contract_count: 0,
        attribution_status: "unattributed",
      });
      continue;
    }

    const walletReports: WalletReport[] = wallets.map((w) => {
      const addr = w.address?.toLowerCase() ?? "";
      const addrType = classificationMap.get(addr) ?? "unknown";
      const src = (w.evidenceSource ?? "").toLowerCase();
      const attribution: WalletReport["attribution"] =
        src === "manifest" ? "manifest" :
        src === "admin" || src === "luca" || src === "inferred" ? "discovered" :
        "unknown";

      const isTokenAddress =
        !!agent.tokenAddress && addr === agent.tokenAddress.toLowerCase();

      const isValidForBooks =
        attribution === "manifest" &&
        !isTokenAddress &&
        (addrType === "eoa" || addrType === "treasury_contract");

      return {
        address: w.address,
        label: w.label ?? "unknown role",
        role: w.role ?? null,
        chain: w.chain ?? null,
        evidence_source: w.evidenceSource ?? null,
        address_type: addrType,
        attribution,
        is_valid_for_books: isValidForBooks,
      };
    });

    const manifestCount = walletReports.filter((w) => w.attribution === "manifest").length;
    const discoveredCount = walletReports.filter((w) => w.attribution === "discovered").length;
    const eoaCount = walletReports.filter((w) => w.address_type === "eoa").length;
    const tokenContractCount = walletReports.filter((w) => w.address_type === "token_contract").length;
    const contractCount = walletReports.filter((w) =>
      w.address_type === "token_contract" ||
      w.address_type === "smart_contract" ||
      w.address_type === "proxy_contract" ||
      w.address_type === "vault",
    ).length;

    const validForBooksCount = walletReports.filter((w) => w.is_valid_for_books).length;
    const attributionStatus: AgentReport["attribution_status"] =
      validForBooksCount > 0 ? "attributed" :
      wallets.length > 0 ? "discovered_only" :
      "unattributed";

    agentReports.push({
      name: agent.name,
      slug: agent.name.toLowerCase().replace(/\s+/g, "-"),
      ecosystem: agent.ecosystem,
      token_address: agent.tokenAddress,
      wallets: walletReports,
      manifest_wallet_count: manifestCount,
      discovered_wallet_count: discoveredCount,
      eoa_count: eoaCount,
      contract_count: contractCount,
      token_contract_count: tokenContractCount,
      attribution_status: attributionStatus,
    });
  }

  // Platform summary
  const totalAgents = agentReports.length;
  const attributedAgents = agentReports.filter((a) => a.attribution_status === "attributed").length;
  const discoveredOnlyAgents = agentReports.filter((a) => a.attribution_status === "discovered_only").length;
  const unattributedAgents = agentReports.filter((a) => a.attribution_status === "unattributed").length;

  const allWalletReports = agentReports.flatMap((a) => a.wallets);
  const totalAddresses = allWalletReports.length;

  const countByType = (t: AddressType) => allWalletReports.filter((w) => w.address_type === t).length;

  const criticalIssues: string[] = [];
  const tokenContractAsManifest = agentReports.flatMap((a) =>
    a.wallets.filter((w) => w.attribution === "manifest" && w.address_type === "token_contract")
      .map((w) => `${a.name}: ${w.address} (${w.address_type})`)
  );
  if (tokenContractAsManifest.length > 0) {
    criticalIssues.push(`${tokenContractAsManifest.length} manifest wallet(s) classified as token_contract — MUST be removed from manifests`);
  }

  const smartContractAsManifest = agentReports.flatMap((a) =>
    a.wallets.filter((w) => w.attribution === "manifest" && (w.address_type === "smart_contract" || w.address_type === "proxy_contract"))
      .map((w) => `${a.name}: ${w.address} (${w.address_type})`)
  );
  if (smartContractAsManifest.length > 0) {
    criticalIssues.push(`${smartContractAsManifest.length} manifest wallet(s) classified as smart/proxy contract — review and reclassify`);
  }

  return NextResponse.json({
    ok: true,
    write: writeResults ? { rows_updated: rowsUpdated, error: writeError } : null,
    summary: {
      total_agents: totalAgents,
      attributed_agents: attributedAgents,
      discovered_only_agents: discoveredOnlyAgents,
      unattributed_agents: unattributedAgents,
      attribution_coverage_pct: totalAgents > 0 ? Math.round((attributedAgents / totalAgents) * 100) : 0,
      total_addresses: totalAddresses,
      eoa_count: countByType("eoa"),
      token_contract_count: countByType("token_contract"),
      proxy_contract_count: countByType("proxy_contract"),
      treasury_contract_count: countByType("treasury_contract"),
      vault_count: countByType("vault"),
      smart_contract_count: countByType("smart_contract"),
      unknown_count: countByType("unknown"),
      valid_for_books_count: allWalletReports.filter((w) => w.is_valid_for_books).length,
      critical_issues_count: criticalIssues.length,
    },
    critical_issues: criticalIssues,
    agents: agentReports,
    sql_migration: [
      "-- Run in Supabase SQL editor before applying address_type updates:",
      "alter table registry_agent_wallets",
      "  add column if not exists address_type text",
      "  check (address_type in (",
      "    'eoa','token_contract','proxy_contract',",
      "    'treasury_contract','vault','smart_contract','smart_account','unknown'",
      "  ))",
      "  default 'unknown';",
    ].join("\n"),
    generated_at: new Date().toISOString(),
  });
}
