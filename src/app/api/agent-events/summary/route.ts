import { NextRequest, NextResponse } from "next/server";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import { internalAuth as authOk } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

// GET /api/agent-events/summary?agent_id=luca&period=7d
export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get("agent_id");
  const periodParam = searchParams.get("period") ?? "7d";

  if (!agentId) {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }

  const days = parsePeriod(periodParam);
  const events = await getAgentEvents(agentId, days);
  const summary = summarizeEvents(agentId, events, days);

  return NextResponse.json({ summary });
}

function parsePeriod(p: string): number {
  const match = p.match(/^(\d+)d$/);
  if (match) return Math.min(90, Math.max(1, parseInt(match[1], 10)));
  return 7;
}
