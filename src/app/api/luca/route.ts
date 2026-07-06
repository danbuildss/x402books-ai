// POST /api/luca
// Luca conversational financial intelligence endpoint.
//
// Accepts a natural-language query with optional context (agent slug or wallet
// address) and returns a structured financial analysis response.
//
// Auth: Bearer <api_key> or X-API-Key header (v1 key required)
//
// Body:
//   { query: string, agent_id?: string, wallet?: string, period?: "7d"|"14d"|"30d"|"90d" }
//
// Response:
//   { ok: true, query, analysis: { agent?, treasury, activity, verdict, data_quality } }

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, getAgentBySlug } from "@/lib/agent-books";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import type { TimeRange } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set<string>(["7d", "14d", "30d", "90d"]);

// Resolve an agent slug from a query string by matching against registry names
async function resolveAgentSlugFromQuery(query: string): Promise<string | null> {
  try {
    const { agents } = await getRegistryAgents();
    const q = query.toLowerCase();
    for (const agent of agents) {
      const slug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (q.includes(slug) || q.includes(agent.name.toLowerCase())) {
        return slug;
      }
    }
  } catch { /* fall through */ }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca";

  let body: { query?: string; agent_id?: string; wallet?: string; period?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ ok: false, error: "query is required." }, { status: 400 });
  }

  const period = (VALID_PERIODS.has(body.period ?? "") ? body.period : "30d") as TimeRange;

  // Resolve agent: explicit agent_id wins, then try to extract from query
  let slug = body.agent_id
    ? body.agent_id.trim().toLowerCase()
    : await resolveAgentSlugFromQuery(query);

  // Wallet mode not yet supported on this endpoint — refer to /api/v1/luca/analyze
  if (!slug && body.wallet) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json(
      {
        ok: false,
        error: "Wallet-mode analysis is available at POST /api/v1/luca/analyze.",
        hint: 'Provide agent_id (registry slug) for agent analysis, e.g. { "query": "...", "agent_id": "aeon" }',
      },
      { status: 400 },
    );
  }

  if (!slug) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json(
      {
        ok: false,
        error: "Could not resolve an agent from query. Provide agent_id explicitly.",
        hint: 'e.g. { "query": "How is AEON doing?", "agent_id": "aeon" }',
      },
      { status: 400 },
    );
  }

  try {
    const agent = await getAgentBySlug(slug);
    if (!agent) {
      auth.finish(404, Date.now() - start, endpoint);
      return NextResponse.json(
        { ok: false, error: `Agent "${slug}" not found in registry.` },
        { status: 404 },
      );
    }

    const books = await buildAgentBooks(agent, period);

    const booksEligibleWallets = (agent.wallets ?? []).filter(
      (w) => isBooksEligibleWallet(w, agent.tokenAddress).eligible,
    );

    const hasBooks = books.attributed === true;
    const isVerified =
      agent.verificationStatus === "Verified" ||
      agent.verificationStatus === "Luca Managed";

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      ok: true,
      query,
      analysis: {
        agent: {
          name:      agent.name,
          slug,
          ecosystem: agent.ecosystem,
          status:    agent.verificationStatus,
        },
        period,
        books: hasBooks ? books : null,
        books_eligible_wallets: booksEligibleWallets.length,
        data_quality: {
          has_manifest:      booksEligibleWallets.length > 0,
          is_verified:       isVerified,
          books_available:   hasBooks,
          note: !isVerified
            ? "Agent not yet verified. Submit a wallets.json manifest to unlock attributed books."
            : booksEligibleWallets.length === 0
              ? "No manifest-declared wallets. Books require evidenceSource=manifest with eligible address_type."
              : "Verified agent. Books derived from manifest-declared wallets.",
        },
        verdict: hasBooks
          ? `${agent.name} books available for ${period} window. ${booksEligibleWallets.length} manifest-declared wallet(s) contributing.`
          : `${agent.name} is indexed in the registry but has no attributed books for the ${period} window.`,
      },
    });
  } catch (error) {
    auth.finish(500, Date.now() - start, endpoint);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: "Analysis failed.", detail: msg }, { status: 500 });
  }
}
