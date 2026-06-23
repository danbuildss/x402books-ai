import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import {
  fetchB20TokenIdentity,
  fetchB20Activity,
  linkTokenToAgent,
  deriveManifestStatus,
  buildLucaSummary,
} from "@/lib/b20-client";
import { getB20Token, getB20Activity, buildActivitySummaryFromDb } from "@/lib/b20-db";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca/skills/b20-token-analysis";

  let body: { address?: string; agent_slug?: string; period?: string };
  try {
    body = await req.json() as { address?: string; agent_slug?: string; period?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = (body.address ?? "").trim().toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "address must be a valid 0x Ethereum address" }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    auth.finish(500, Date.now() - start, endpoint);
    return NextResponse.json({ error: "ALCHEMY_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Check if already indexed in DB — use cached data if available
    const [cached, dbEvents] = await Promise.allSettled([
      getB20Token(address),
      getB20Activity(address, 20),
    ]);

    const cachedToken = cached.status === "fulfilled" ? cached.value : null;
    const storedEvents = dbEvents.status === "fulfilled" ? dbEvents.value : [];

    let identity, link, manifestStatus, activity, lucaSummary;

    if (cachedToken) {
      // Use cached identity, fetch fresh activity
      identity = {
        address: cachedToken.address,
        name: cachedToken.name,
        symbol: cachedToken.symbol,
        decimals: cachedToken.decimals,
        totalSupply: cachedToken.total_supply,
        issuerWallet: cachedToken.issuer_wallet,
        ownerWallet: cachedToken.owner_wallet,
        deploymentTx: cachedToken.deployment_tx,
        deployedBlock: cachedToken.deployed_block,
        metadataUri: cachedToken.metadata_uri,
        chain: "base" as const,
      };
      link = {
        method: cachedToken.link_method as "manifest" | "known_token" | "erc8004" | "admin" | "none",
        confidence: (cachedToken.link_confidence ?? "candidate") as "confirmed" | "inferred" | "candidate",
        agentName: cachedToken.linked_agent_name,
        agentSlug: cachedToken.linked_agent_name
          ? cachedToken.linked_agent_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          : null,
        note: null,
      };
      manifestStatus = cachedToken.manifest_status as "attributed" | "candidate" | "none";
      activity = storedEvents.length > 0
        ? buildActivitySummaryFromDb(address, storedEvents)
        : await fetchB20Activity(address, apiKey);
      lucaSummary = cachedToken.luca_summary ?? buildLucaSummary(identity, link, manifestStatus, activity);
    } else {
      // Live fetch
      const { agents } = await getRegistryAgents();
      [identity, activity] = await Promise.all([
        fetchB20TokenIdentity(address, apiKey),
        fetchB20Activity(address, apiKey),
      ]);
      link = linkTokenToAgent(address, identity.issuerWallet, agents);
      manifestStatus = deriveManifestStatus(link);
      lucaSummary = buildLucaSummary(identity, link, manifestStatus, activity);
    }

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      skill: "b20-token-analysis",
      token: {
        address: identity.address,
        name: identity.name,
        symbol: identity.symbol,
        decimals: identity.decimals,
        total_supply: identity.totalSupply,
        chain: identity.chain,
        deployed_block: identity.deployedBlock,
        issuer_wallet: identity.issuerWallet,
        owner_wallet: identity.ownerWallet,
        books_eligible: false,
        books_eligible_note: "Token contracts are never books-eligible",
      },
      linked_agent: link.agentName
        ? {
            name: link.agentName,
            slug: link.agentSlug,
            link_method: link.method,
            link_confidence: link.confidence,
            note: link.note,
          }
        : null,
      manifest_status: manifestStatus,
      manifest_note: manifestStatus === "attributed"
        ? "Issuer wallet is manifest-attributed"
        : manifestStatus === "candidate"
          ? "Candidate match found — submit .agent/wallets.json to confirm attribution"
          : "No manifest found — B20 indexed, but financial books require wallet attribution",
      activity: activity
        ? {
            mint_count: activity.mintCount,
            burn_count: activity.burnCount,
            mint_volume_raw: activity.mintVolumeRaw,
            burn_volume_raw: activity.burnVolumeRaw,
            recent_mints: activity.recentMints,
            recent_burns: activity.recentBurns,
            last_activity_at: activity.lastActivityAt,
          }
        : null,
      luca_read: lucaSummary,
      limitations: [
        "Token transfers are not operating revenue",
        "Token contract is not an operator wallet",
        `Issuer wallet (${identity.issuerWallet ?? "unknown"}) is not books-eligible unless declared in agent manifest`,
        "B20 activity is not included in Agent GDP",
        "Holder concentration analysis requires a full transfer scan — not available in this endpoint",
      ],
      data_integrity_warnings: [
        "gross_inflow_usd from token transfers ≠ operating revenue",
        "Do not count B20 mint events as agent revenue",
        "Token issuance is a financial event but not a revenue event",
      ],
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    auth.finish(502, Date.now() - start, endpoint);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "B20 analysis failed" },
      { status: 502 },
    );
  }
}
