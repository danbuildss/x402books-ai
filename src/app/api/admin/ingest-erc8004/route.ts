import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { classifyAddressBatch } from "@/lib/address-classifier";
import { fetchAllErc8004Agents, fetchErc8004AgentById } from "@/lib/erc8004-client";
import type { Erc8004RawAgent } from "@/lib/erc8004-client";
import { transformErc8004Agent } from "@/lib/erc8004-transformer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type IngestBody = {
  mode: "contract" | "batch";
  agentIds?: string[];
  fromBlock?: string;
  toBlock?: string;
  dryRun?: boolean;
};

type AgentIngestionResult = {
  agent_id: string;
  name: string;
  status: "upserted" | "skipped" | "error";
  metadata_ok: boolean;
  wallet_address: string | null;
  wallet_type: string | null;
  manifest_uri: string | null;
  has_did: boolean;
  books_eligible: boolean;
  warnings: string[];
  error?: string;
};

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ALCHEMY_API_KEY not configured" }, { status: 500 });
  }

  let body: IngestBody;
  try {
    body = await req.json() as IngestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode, agentIds, fromBlock, toBlock, dryRun = false } = body;

  if (mode !== "contract" && mode !== "batch") {
    return NextResponse.json({ ok: false, error: "mode must be 'contract' or 'batch'" }, { status: 400 });
  }

  if (mode === "batch" && (!agentIds || agentIds.length === 0)) {
    return NextResponse.json({ ok: false, error: "agentIds required for batch mode" }, { status: 400 });
  }

  // 1. Fetch raw agents
  let rawAgents: Erc8004RawAgent[];
  if (mode === "contract") {
    const erc8004Result = await fetchAllErc8004Agents(apiKey, fromBlock, toBlock);
    rawAgents = erc8004Result.agents;
    if (rawAgents.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Contract scan returned 0 agents. See diagnostic for details.",
        diagnostic: erc8004Result.diagnostic,
        suggestions: [
          "Confirm IDENTITY_REGISTRY address is correct for Base mainnet",
          "Try fromBlock closer to the ERC-8004 registry deployment block",
          "Check if any RPC errors occurred during scanning",
          "Use batch mode with known agentIds to test individual IDs",
        ],
      }, { status: 422 });
    }
  } else {
    const settled = await Promise.allSettled(
      (agentIds ?? []).map((id) => fetchErc8004AgentById(id, apiKey)),
    );
    rawAgents = settled
      .filter((s): s is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchErc8004AgentById>>> => s.status === "fulfilled")
      .map((s) => s.value);
  }

  // 2. Transform
  const transformed = rawAgents.map((raw) => ({
    raw,
    result: transformErc8004Agent(raw),
  }));

  // 3. Classify all wallets in one batch
  const allWalletAddresses = transformed.flatMap(({ result }) =>
    result.wallets.map((w) => w.address),
  );

  const classificationMap = new Map<string, string>();
  if (allWalletAddresses.length > 0) {
    // All addresses coming through ERC-8004 manifest ingestion are manifest-declared —
    // give them smart_account benefit of the doubt instead of blocking as smart_contract.
    const manifestDeclared = new Set(allWalletAddresses.map((a) => a.toLowerCase()));
    const classified = await classifyAddressBatch(allWalletAddresses, apiKey, undefined, 5, manifestDeclared);
    for (const c of classified) {
      classificationMap.set(c.address.toLowerCase(), c.address_type);
    }
  }

  // 4. Load existing agents from DB to check for conflicts
  const existingNonErc8004 = new Set<string>();
  let supabase: ReturnType<typeof getSupabaseAdminClient> | null = null;

  if (!dryRun && hasSupabaseAdminEnv()) {
    supabase = getSupabaseAdminClient();
    const { data: existingAgents } = await supabase
      .from("registry_agents")
      .select("name, evidence_sources");

    if (existingAgents) {
      for (const agent of existingAgents as { name: string; evidence_sources: string[] | null }[]) {
        const sources = agent.evidence_sources ?? [];
        if (!sources.includes("ERC-8004")) {
          existingNonErc8004.add(agent.name.toLowerCase());
        }
      }
    }
  }

  // 5. Process each agent
  const agentResults: AgentIngestionResult[] = [];
  let agentsUpserted = 0;
  let agentsSkipped = 0;
  let errors = 0;

  for (const { raw, result } of transformed) {
    const { agent, wallets, manifestUri, did, description, warnings } = result;
    const walletAddr = wallets[0]?.address ?? null;
    const walletType = walletAddr ? (classificationMap.get(walletAddr.toLowerCase()) ?? "unknown") : null;

    // books_eligible: manifest evidenceSource only — ERC-8004 wallets are NOT books-eligible
    const booksEligible = false;

    const agentResult: AgentIngestionResult = {
      agent_id: raw.agentId,
      name: agent.name,
      status: "upserted",
      metadata_ok: raw.metadata !== null,
      wallet_address: walletAddr,
      wallet_type: walletType,
      manifest_uri: manifestUri,
      has_did: did !== null,
      books_eligible: booksEligible,
      warnings,
    };

    if (dryRun) {
      agentResults.push(agentResult);
      agentsUpserted++;
      continue;
    }

    // Skip if non-ERC-8004 agent with same name exists
    if (existingNonErc8004.has(agent.name.toLowerCase())) {
      agentResult.status = "skipped";
      agentResult.warnings = [...warnings, `Skipped: non-ERC-8004 agent named "${agent.name}" already exists`];
      agentResults.push(agentResult);
      agentsSkipped++;
      continue;
    }

    if (!supabase) {
      agentResult.status = "skipped";
      agentResult.warnings = [...warnings, "Skipped: Supabase not configured"];
      agentResults.push(agentResult);
      agentsSkipped++;
      continue;
    }

    try {
      // Upsert agent row
      const { error: upsertError } = await supabase
        .from("registry_agents")
        .upsert(
          {
            name: agent.name,
            ecosystem: agent.ecosystem,
            verification_status: agent.verificationStatus,
            evidence_sources: agent.evidenceSources,
            x_handle: agent.xHandle ?? null,
            website: agent.website ?? null,
            erc8004_agent_id: raw.agentId,
            erc8004_metadata_uri: raw.metadataUri ?? null,
            erc8004_registration_tx: raw.registrationTx ?? null,
            erc8004_did: did ?? null,
            erc8004_description: description ?? null,
          },
          { onConflict: "name" },
        );

      if (upsertError) {
        agentResult.status = "error";
        agentResult.error = upsertError.message;
        errors++;
        agentResults.push(agentResult);
        continue;
      }

      // Write wallets
      if (wallets.length > 0) {
        const walletRows = wallets.map((w) => ({
          agent_name: agent.name,
          address: w.address,
          label: w.label,
          role: w.role,
          chain: w.chain,
          confidence: w.confidence,
          evidence_source: w.evidenceSource,
          address_type: classificationMap.get(w.address.toLowerCase()) ?? "unknown",
          notes: w.notes,
        }));

        await supabase
          .from("registry_agent_wallets")
          .upsert(walletRows, { onConflict: "agent_name,address" });
      }

      agentResult.status = "upserted";
      agentsUpserted++;
    } catch (e) {
      agentResult.status = "error";
      agentResult.error = e instanceof Error ? e.message : "Unknown error";
      errors++;
    }

    agentResults.push(agentResult);
  }

  const total = rawAgents.length;
  const metadataFetched  = transformed.filter(({ raw }) => raw.metadata !== null).length;
  const manifestUrisFound = transformed.filter(({ result }) => result.manifestUri !== null).length;
  const agentsWithDid    = transformed.filter(({ result }) => result.did !== null).length;
  const walletsFound     = transformed.reduce((n, { result }) => n + result.wallets.length, 0);
  const tokenContractsFound = [...classificationMap.values()].filter((t) => t === "token_contract").length;

  function pct(n: number) {
    return total > 0 ? Math.round((n / total) * 100) : 0;
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    summary: {
      total_discovered: total,
      // Coverage KPIs — identity/trust layer, not financial
      metadata_coverage_pct:   pct(metadataFetched),
      did_coverage_pct:        pct(agentsWithDid),
      reputation_coverage_pct: 0, // Phase 2 — Reputation Registry queries
      validation_coverage_pct: 0, // Phase 2 — Validation Registry queries
      manifest_coverage_pct:   pct(manifestUrisFound),
      books_coverage_pct:      0, // 0 until manifest submitted and wallets declared
      // Raw counts
      metadata_fetched: metadataFetched,
      agents_with_did: agentsWithDid,
      manifest_uris_found: manifestUrisFound,
      wallets_found: walletsFound,
      books_eligible_wallets: 0,
      token_contracts_found: tokenContractsFound,
      agents_upserted: agentsUpserted,
      agents_skipped: agentsSkipped,
      errors,
    },
    agents: agentResults,
    generated_at: new Date().toISOString(),
  });
}
