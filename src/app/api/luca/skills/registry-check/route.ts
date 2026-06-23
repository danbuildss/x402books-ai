import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import { toSlug } from "@/app/registry/[slug]/slug";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/i;

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca/skills/registry-check";

  let body: { query?: string };
  try {
    body = await req.json() as { query?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "query is required (agent slug, name, or 0x wallet address)" }, { status: 400 });
  }

  try {
    const { agents } = await getRegistryAgents();
    const isAddress = ADDRESS_RE.test(query);
    const queryLower = query.toLowerCase();

    let matchType: "slug" | "name" | "wallet_address" | null = null;
    type Agent = (typeof agents)[0];
    let match: Agent | undefined;

    if (isAddress) {
      match = agents.find((a) =>
        (a.wallets ?? []).some((w) => w.address.toLowerCase() === queryLower),
      );
      if (match) matchType = "wallet_address";
    }

    if (!match) {
      match = agents.find((a) => toSlug(a.name) === queryLower);
      if (match) matchType = "slug";
    }

    if (!match) {
      match = agents.find((a) => a.name.toLowerCase().includes(queryLower));
      if (match) matchType = "name";
    }

    if (!match) {
      auth.finish(200, Date.now() - start, endpoint);
      return NextResponse.json({
        skill: "registry-check",
        found: false,
        query,
        agent: null,
        generated_at: new Date().toISOString(),
      });
    }

    const wallets = match.wallets ?? [];
    const eligibleWallets = wallets.filter((w) => isBooksEligibleWallet(w, match!.tokenAddress).eligible);

    const attributionTier =
      eligibleWallets.length > 0 ? "manifest_attributed" :
      wallets.length > 0 ? "discovered" :
      "unattributed";

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      skill: "registry-check",
      found: true,
      query,
      match_type: matchType,
      agent: {
        name: match.name,
        slug: toSlug(match.name),
        ecosystem: match.ecosystem,
        verification_status: match.verificationStatus,
        evidence_sources: match.evidenceSources ?? [],
        erc8004_agent_id: match.erc8004AgentId ?? null,
        erc8004_did: match.erc8004Did ?? null,
        attribution_tier: attributionTier,
        books_eligible_wallets: eligibleWallets.length,
        total_wallets: wallets.length,
        wallets: wallets.map((w) => {
          const elig = isBooksEligibleWallet(w, match!.tokenAddress);
          return {
            address: w.address.toLowerCase(),
            label: w.label,
            role: w.role ?? null,
            address_type: w.address_type ?? "unknown",
            evidence_source: w.evidenceSource ?? null,
            books_eligible: elig.eligible,
            books_ineligibility_reason: elig.eligible ? null : elig.reason,
            chain: w.chain ?? "base",
          };
        }),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    auth.finish(502, Date.now() - start, endpoint);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registry check failed" },
      { status: 502 },
    );
  }
}
