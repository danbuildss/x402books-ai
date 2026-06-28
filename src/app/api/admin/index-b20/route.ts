import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";
import {
  fetchB20TokenIdentity,
  fetchB20Activity,
  fetchB20FactoryLogs,
  linkTokenToAgent,
  deriveManifestStatus,
  buildLucaSummary,
  B20_INFRASTRUCTURE_ADDRESSES,
  type B20Chain,
} from "@/lib/b20-client";
import {
  upsertB20Token,
  upsertB20ActivityBatch,
} from "@/lib/b20-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// B20 prefix: all B20 tokens deployed by the factory start with 0xB200
const B20_PREFIX = "0xb200";

function isB20Prefix(addr: string): boolean {
  return addr.toLowerCase().startsWith(B20_PREFIX);
}

const VALID_CHAINS: B20Chain[] = ["base", "base-sepolia"];

// B20 factory address (Base/Base Sepolia)
const B20_FACTORY = "0xB20f000000000000000000000000000000000000";

type IndexB20Body = {
  mode: "from_registry" | "single" | "activity_only" | "detect_from_registry" | "detect_testnet_factory";
  address?: string;
  chain?: B20Chain;
  includeActivity?: boolean;
  dryRun?: boolean;
};

type TokenResult = {
  address: string;
  name: string | null;
  symbol: string | null;
  issuer_wallet: string | null;
  linked_agent: string | null;
  link_method: string;
  link_confidence: string;
  manifest_status: string;
  activity_events_inserted: number;
  status: "indexed" | "skipped" | "error";
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

  let body: IndexB20Body;
  try {
    body = await req.json() as IndexB20Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode, address, includeActivity = false, dryRun = false } = body;
  const chain: B20Chain = body.chain && VALID_CHAINS.includes(body.chain) ? body.chain : "base";
  const isTestnet = chain !== "base";

  if (!["from_registry", "single", "activity_only", "detect_from_registry", "detect_testnet_factory"].includes(mode)) {
    return NextResponse.json({ ok: false, error: "mode must be from_registry | single | activity_only | detect_from_registry | detect_testnet_factory" }, { status: 400 });
  }

  if ((mode === "single" || mode === "activity_only") && !address) {
    return NextResponse.json({ ok: false, error: "address required for single and activity_only modes" }, { status: 400 });
  }

  // Guard: factory and registry precompiles are never indexable as B20 tokens
  if (address && B20_INFRASTRUCTURE_ADDRESSES.has(address.trim().toLowerCase())) {
    return NextResponse.json({
      ok: false,
      error: `${address} is a B20 infrastructure precompile (factory or registry). It cannot be indexed as a B20 token. Only 0xB200… token addresses are indexable.`,
    }, { status: 400 });
  }

  if (!dryRun && !hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured — use dryRun: true to preview" }, { status: 503 });
  }

  // Load registry agents for linking
  const { agents } = await getRegistryAgents();

  // ── detect_from_registry: scan all tokenAddresses for 0xB200 prefix ─────────
  if (mode === "detect_from_registry") {
    type DetectResult = {
      address: string;
      agent_name: string;
      passes_prefix: boolean;
      confirmed_on_chain: boolean;
      name: string | null;
      symbol: string | null;
      issuer_wallet: string | null;
      recommendation: string;
    };

    const candidates = agents
      .filter((a) => a.tokenAddress)
      .map((a) => ({ agent: a.name, addr: a.tokenAddress!.trim().toLowerCase() }));

    const prefixMatches = candidates.filter((c) => isB20Prefix(c.addr));
    const results: DetectResult[] = [];

    for (const c of prefixMatches) {
      let confirmed = false;
      let name: string | null = null;
      let symbol: string | null = null;
      let issuerWallet: string | null = null;

      try {
        const identity = await fetchB20TokenIdentity(c.addr, apiKey);
        confirmed = !!(identity.name ?? identity.symbol ?? identity.totalSupply);
        name = identity.name;
        symbol = identity.symbol;
        issuerWallet = identity.issuerWallet;
      } catch { /* not confirmed */ }

      results.push({
        address: c.addr,
        agent_name: c.agent,
        passes_prefix: true,
        confirmed_on_chain: confirmed,
        name,
        symbol,
        issuer_wallet: issuerWallet,
        recommendation: confirmed
          ? "Set isB20Token: true in registry data.ts and re-run from_registry mode"
          : "Prefix matches but contract not confirmed — check address manually",
      });
    }

    const nonMatches = candidates.filter((c) => !isB20Prefix(c.addr));

    return NextResponse.json({
      ok: true,
      mode: "detect_from_registry",
      total_with_token_address: candidates.length,
      b20_prefix_matches: prefixMatches.length,
      confirmed_b20: results.filter((r) => r.confirmed_on_chain).length,
      results,
      non_b20_addresses: nonMatches.map((c) => ({ agent_name: c.agent, address: c.addr })),
      note: "Only addresses starting with 0xB200 are considered B20 tokens. Set isB20Token: true in data.ts after confirming.",
      generated_at: new Date().toISOString(),
    });
  }

  // ── detect_testnet_factory: scan Base Sepolia factory for emitted B20 addresses ─
  if (mode === "detect_testnet_factory") {
    if (chain !== "base-sepolia") {
      return NextResponse.json({
        ok: false,
        error: "detect_testnet_factory is only available on chain=base-sepolia. It is a testnet-only discovery mode.",
      }, { status: 400 });
    }

    const { logsScanned, candidates } = await fetchB20FactoryLogs(B20_FACTORY, apiKey, "base-sepolia");

    // Attempt Alchemy confirmation for each candidate
    type FactoryCandidate = {
      address: string;
      confirmed_on_chain: boolean;
      name: string | null;
      symbol: string | null;
      issuer_wallet: string | null;
      recommendation: string;
    };
    const results: FactoryCandidate[] = [];

    for (const addr of candidates) {
      let confirmed = false;
      let name: string | null = null;
      let symbol: string | null = null;
      let issuerWallet: string | null = null;
      try {
        const identity = await fetchB20TokenIdentity(addr, apiKey, "base-sepolia");
        confirmed = !!(identity.name ?? identity.symbol ?? identity.totalSupply);
        name = identity.name;
        symbol = identity.symbol;
        issuerWallet = identity.issuerWallet;
      } catch { /* not confirmed */ }

      results.push({
        address: addr,
        confirmed_on_chain: confirmed,
        name,
        symbol,
        issuer_wallet: issuerWallet,
        recommendation: confirmed
          ? "Confirmed B20 on Base Sepolia — use mode=single&chain=base-sepolia to index"
          : "Address extracted from factory logs but not confirmed — verify manually before indexing",
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "detect_testnet_factory",
      chain: "base-sepolia",
      is_testnet: true,
      factory: B20_FACTORY,
      logs_scanned: logsScanned,
      b20_candidates_found: candidates.length,
      confirmed: results.filter((r) => r.confirmed_on_chain).length,
      results,
      note: "Read-only. No data was written. Use mode=single with chain=base-sepolia to index confirmed candidates.",
      testnet_warning: "All data here is Base Sepolia testnet. It is for demo/proof only. Testnet tokens never enter Agent Books, Agent GDP, or production B20 intelligence.",
      generated_at: new Date().toISOString(),
    });
  }

  // Determine which token addresses to index
  let tokenAddresses: string[] = [];
  if (mode === "single" || mode === "activity_only") {
    tokenAddresses = [address!.trim().toLowerCase()];
  } else {
    // from_registry: only index agents explicitly marked isB20Token: true
    tokenAddresses = agents
      .filter((a) => a.isB20Token === true)
      .map((a) => a.tokenAddress)
      .filter((addr): addr is string => !!addr)
      .map((addr) => addr.toLowerCase());

    const unique = [...new Set(tokenAddresses)];
    tokenAddresses = unique;
  }

  if (tokenAddresses.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No B20 token addresses found. Set isB20Token: true on registry agents or use single mode.",
    }, { status: 422 });
  }

  const results: TokenResult[] = [];
  let indexed = 0;
  let errors = 0;

  for (const tokenAddr of tokenAddresses) {
    try {
      if (mode === "activity_only") {
        // Only refresh activity for existing token
        const activity = await fetchB20Activity(tokenAddr, apiKey, chain);
        let eventsInserted = 0;
        if (!dryRun) {
          const allEvents = [...activity.recentMints, ...activity.recentBurns];
          const res = await upsertB20ActivityBatch(tokenAddr, allEvents);
          eventsInserted = res.inserted;
        }
        results.push({
          address: tokenAddr,
          name: null,
          symbol: null,
          issuer_wallet: null,
          linked_agent: null,
          link_method: "—",
          link_confidence: "—",
          manifest_status: "—",
          activity_events_inserted: eventsInserted,
          status: "indexed",
        });
        indexed++;
        continue;
      }

      // Fetch token identity
      const identity = await fetchB20TokenIdentity(tokenAddr, apiKey, chain);

      // Link to agent
      const link = linkTokenToAgent(tokenAddr, identity.issuerWallet, agents);
      const manifestStatus = deriveManifestStatus(link);

      // Fetch activity if requested
      let activity = null;
      let eventsInserted = 0;
      if (includeActivity) {
        activity = await fetchB20Activity(tokenAddr, apiKey, chain);
        if (!dryRun && activity) {
          const allEvents = [...activity.recentMints, ...activity.recentBurns];
          const res = await upsertB20ActivityBatch(tokenAddr, allEvents);
          eventsInserted = res.inserted;
        }
      }

      const lucaSummary = buildLucaSummary(identity, link, manifestStatus, activity, isTestnet);

      if (!dryRun) {
        const res = await upsertB20Token(identity, link, manifestStatus, lucaSummary);
        if (!res.ok) {
          results.push({ address: tokenAddr, name: identity.name, symbol: identity.symbol, issuer_wallet: identity.issuerWallet, linked_agent: link.agentName, link_method: link.method, link_confidence: link.confidence, manifest_status: manifestStatus, activity_events_inserted: 0, status: "error", error: res.error });
          errors++;
          continue;
        }
      }

      results.push({
        address: tokenAddr,
        name: identity.name,
        symbol: identity.symbol,
        issuer_wallet: identity.issuerWallet,
        linked_agent: link.agentName,
        link_method: link.method,
        link_confidence: link.confidence,
        manifest_status: manifestStatus,
        activity_events_inserted: eventsInserted,
        status: "indexed",
      });
      indexed++;

      // Small delay between tokens to respect rate limits
      if (tokenAddresses.length > 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) {
      results.push({
        address: tokenAddr,
        name: null,
        symbol: null,
        issuer_wallet: null,
        linked_agent: null,
        link_method: "error",
        link_confidence: "—",
        manifest_status: "—",
        activity_events_inserted: 0,
        status: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      });
      errors++;
    }
  }

  const attributed  = results.filter((r) => r.manifest_status === "attributed").length;
  const candidates  = results.filter((r) => r.manifest_status === "candidate").length;
  const noManifest  = results.filter((r) => r.manifest_status === "none").length;

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    chain,
    is_testnet: isTestnet,
    summary: {
      tokens_discovered: tokenAddresses.length,
      tokens_indexed: indexed,
      errors,
      attributed,
      candidates,
      awaiting_manifest: candidates + noManifest,
      data_integrity_note: isTestnet
        ? "TESTNET (base-sepolia): Token data is for proof/demo only. Does not enter production B20 intelligence, Agent Books, or Agent GDP."
        : "Token contracts are never books-eligible. Token transfers are not operating revenue. B20 activity is excluded from Agent GDP.",
    },
    tokens: results,
    generated_at: new Date().toISOString(),
  });
}
