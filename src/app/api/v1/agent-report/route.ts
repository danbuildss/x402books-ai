import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import { generateAgentReport } from "@/lib/agent-report";

export const dynamic = "force-dynamic";

// GET /api/v1/agent-report?agentName=X&days=7
// Returns a structured plain-language financial report for an agent.
export async function GET(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const agentName = searchParams.get("agentName");
  const days = Math.min(90, parseInt(searchParams.get("days") ?? "7", 10));

  if (!agentName) {
    return NextResponse.json({ error: "agentName is required" }, { status: 400 });
  }

  const events  = await getAgentEvents(agentName, days);
  const summary = summarizeEvents(agentName, events, days);
  const report  = generateAgentReport(summary);

  return NextResponse.json({ report, summary });
}
