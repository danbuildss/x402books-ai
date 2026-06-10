// GET /api/v1/agent-books/[slug]?range=30d — Per-Agent Financial Statements.
//
// The core product: manifest attribution joined to the ledger engine.
// Returns revenue, expenses, net income, margin, per-wallet flows — computed
// from the agent's declared wallets only. Unattributed agents get an honest
// "no books" response, never an estimate.

import { NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, type AgentBooks, type AgentBooksUnattributed } from "@/lib/agent-books";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { TimeRange } from "@/lib/ledger";

export const dynamic = "force-dynamic";

// Books are expensive (one ledger scan per attributed wallet) — cache per
// slug+range for 10 minutes to protect upstream quota.
const cache = new Map<string, { data: AgentBooks | AgentBooksUnattributed; at: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const started = Date.now();

  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const { slug: rawSlug } = await params;
  const slug = toSlug(rawSlug ?? "");
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") ?? "30d";
  if (!["7d", "30d"].includes(rangeParam)) {
    auth.finish(400, Date.now() - started, "/api/v1/agent-books");
    return NextResponse.json({ error: "range must be 7d or 30d" }, { status: 400 });
  }
  const range = rangeParam as TimeRange;

  const { agents } = await getRegistryAgents();
  const agent = agents.find((a) => toSlug(a.name) === slug);

  if (!agent) {
    auth.finish(404, Date.now() - started, "/api/v1/agent-books");
    return NextResponse.json(
      {
        error: `Agent "${slug}" not found in registry.`,
        hint: "Browse indexed agents at https://www.x402books.xyz/registry",
      },
      { status: 404 },
    );
  }

  const cacheKey = `${slug}:${range}`;
  const hit = cache.get(cacheKey);
  let books: AgentBooks | AgentBooksUnattributed;

  if (hit && Date.now() - hit.at < CACHE_TTL) {
    books = hit.data;
  } else {
    books = await buildAgentBooks(agent, range);
    cache.set(cacheKey, { data: books, at: Date.now() });
  }

  auth.finish(200, Date.now() - started, "/api/v1/agent-books");

  return NextResponse.json({
    ...books,
    profile: `https://www.x402books.xyz/registry/${slug}`,
    note: books.attributed
      ? "Computed from manifest-declared wallets only. Internal transfers between the agent's own wallets are excluded from revenue and expenses."
      : undefined,
  });
}
