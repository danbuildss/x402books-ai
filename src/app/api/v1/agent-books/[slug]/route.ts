// GET /api/v1/agent-books/[slug] — per-agent financial statement.
//
// The core product output: how much did this agent earn, spend, and net,
// across all of its declared wallets, with internal transfers eliminated.
// Agents without declared wallets get an honest no-books response.
//
// Auth: API key (Bearer / X-API-Key) or internal secret, via v1Auth.
// Caching: 10-minute TTL per slug+period, managed by agent-books lib.

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { ledgerErrorResponse } from "@/lib/api-utils";
import { buildAgentBooks, getAgentBySlug } from "@/lib/agent-books";
import type { TimeRange } from "@/lib/ledger";

const VALID_RANGES = new Set(["7d", "14d", "30d", "90d"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  // Agent-scoped keys may only query their own agent's data
  if (auth.agentScope && auth.agentScope !== slug) {
    return NextResponse.json(
      { error: `This API key is scoped to agent '${auth.agentScope}', not '${slug}'. Use a key scoped to this agent, or an unscoped key.` },
      { status: 403 },
    );
  }
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("range") ?? searchParams.get("period") ?? "30d") as TimeRange;

  if (!VALID_RANGES.has(period)) {
    return NextResponse.json({ error: "Range must be 7d, 14d, 30d, or 90d." }, { status: 400 });
  }

  const start = Date.now();
  const endpoint = "/api/v1/agent-books";

  try {
    const agent = await getAgentBySlug(slug);
    if (!agent) {
      const res = NextResponse.json(
        { error: `Agent '${slug}' not found in the registry. Browse agents at /registry.` },
        { status: 404 },
      );
      auth.finish(404, Date.now() - start, endpoint);
      return res;
    }

    const body = await buildAgentBooks(agent, period);
    const res = NextResponse.json(body);
    auth.finish(200, Date.now() - start, endpoint);
    return res;
  } catch (error) {
    auth.finish(500, Date.now() - start, endpoint);
    return ledgerErrorResponse(error);
  }
}
