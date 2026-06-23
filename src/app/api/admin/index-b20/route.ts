import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";
import {
  fetchB20TokenIdentity,
  fetchB20Activity,
  linkTokenToAgent,
  deriveManifestStatus,
  buildLucaSummary,
} from "@/lib/b20-client";
import {
  upsertB20Token,
  upsertB20ActivityBatch,
} from "@/lib/b20-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type IndexB20Body = {
  mode: "from_registry" | "single" | "activity_only";
  address?: string;
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

  if (mode !== "from_registry" && mode !== "single" && mode !== "activity_only") {
    return NextResponse.json({ ok: false, error: "mode must be from_registry | single | activity_only" }, { status: 400 });
  }

  if ((mode === "single" || mode === "activity_only") && !address) {
    return NextResponse.json({ ok: false, error: "address required for single and activity_only modes" }, { status: 400 });
  }

  if (!dryRun && !hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured — use dryRun: true to preview" }, { status: 503 });
  }

  // Load registry agents for linking
  const { agents } = await getRegistryAgents();

  // Determine which token addresses to index
  let tokenAddresses: string[] = [];
  if (mode === "single" || mode === "activity_only") {
    tokenAddresses = [address!.trim().toLowerCase()];
  } else {
    // from_registry: collect all agent tokenAddress values
    tokenAddresses = agents
      .map((a) => a.tokenAddress)
      .filter((addr): addr is string => !!addr)
      .map((addr) => addr.toLowerCase());

    const unique = [...new Set(tokenAddresses)];
    tokenAddresses = unique;
  }

  if (tokenAddresses.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No token addresses found. Add tokenAddress to registry agents or use single mode.",
    }, { status: 422 });
  }

  const results: TokenResult[] = [];
  let indexed = 0;
  let errors = 0;

  for (const tokenAddr of tokenAddresses) {
    try {
      if (mode === "activity_only") {
        // Only refresh activity for existing token
        const activity = await fetchB20Activity(tokenAddr, apiKey);
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
      const identity = await fetchB20TokenIdentity(tokenAddr, apiKey);

      // Link to agent
      const link = linkTokenToAgent(tokenAddr, identity.issuerWallet, agents);
      const manifestStatus = deriveManifestStatus(link);

      // Fetch activity if requested
      let activity = null;
      let eventsInserted = 0;
      if (includeActivity) {
        activity = await fetchB20Activity(tokenAddr, apiKey);
        if (!dryRun && activity) {
          const allEvents = [...activity.recentMints, ...activity.recentBurns];
          const res = await upsertB20ActivityBatch(tokenAddr, allEvents);
          eventsInserted = res.inserted;
        }
      }

      const lucaSummary = buildLucaSummary(identity, link, manifestStatus, activity);

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
    summary: {
      tokens_discovered: tokenAddresses.length,
      tokens_indexed: indexed,
      errors,
      attributed,
      candidates,
      awaiting_manifest: candidates + noManifest,
      data_integrity_note: "Token contracts are never books-eligible. Token transfers are not operating revenue. B20 activity is excluded from Agent GDP.",
    },
    tokens: results,
    generated_at: new Date().toISOString(),
  });
}
