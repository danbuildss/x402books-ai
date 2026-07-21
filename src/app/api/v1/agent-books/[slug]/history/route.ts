// GET /api/v1/agent-books/[slug]/history — historical books snapshots for one agent.
//
// Returns stored snapshots ordered oldest → newest for time-series charting.
// Snapshots are created when reports are generated or via the admin snapshot endpoint.
//
// Auth: v1Auth (same as agent-books endpoint)
// Period: 7d | 30d | 90d | all

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { ledgerErrorResponse } from "@/lib/api-utils";
import { getAgentBooksHistory } from "@/lib/agent-books-history";

const PERIOD_MAP: Record<string, number> = {
  "7d":  7,
  "30d": 30,
  "90d": 90,
  "all": 0,
};

const VALID_PERIODS = new Set(Object.keys(PERIOD_MAP));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Agent-scoped keys may only query their own agent's data — enforced centrally
  const auth = await v1Auth(request, { agentSlug: slug });
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "30d";

  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json(
      { error: "Period must be 7d, 30d, 90d, or all." },
      { status: 400 },
    );
  }

  const windowDays = PERIOD_MAP[period];
  const start = Date.now();
  const endpoint = "/api/v1/agent-books/history";

  try {
    const snapshots = await getAgentBooksHistory(slug, windowDays);

    if (snapshots.length === 0) {
      const res = NextResponse.json(
        {
          agent_slug: slug,
          period,
          window_days: windowDays,
          snapshot_count: 0,
          snapshots: [],
          note: "No snapshots found. Snapshots are created when reports are generated or via the admin snapshot endpoint.",
        },
        { status: 404 },
      );
      auth.finish(404, Date.now() - start, endpoint);
      return res;
    }

    const res = NextResponse.json({
      agent_slug:     slug,
      period,
      window_days:    windowDays,
      snapshot_count: snapshots.length,
      snapshots,
      note: "Snapshots are created when reports are generated or via the admin snapshot endpoint.",
    });
    auth.finish(200, Date.now() - start, endpoint);
    return res;
  } catch (error) {
    auth.finish(500, Date.now() - start, endpoint);
    return ledgerErrorResponse(error);
  }
}
