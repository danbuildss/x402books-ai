import { NextRequest, NextResponse } from "next/server";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import { generateAgentReport } from "@/lib/agent-report";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function parsePeriod(p: string): number {
  const m = p.match(/^(\d+)d$/);
  return m ? Math.min(90, Math.max(1, parseInt(m[1], 10))) : 7;
}

// GET /api/agent-events/report?agent_id=luca&period=7d
export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get("agent_id");
  const period  = searchParams.get("period") ?? "7d";

  if (!agentId) {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }

  const days    = parsePeriod(period);
  const events  = await getAgentEvents(agentId, days);
  const summary = summarizeEvents(agentId, events, days);
  const report  = generateAgentReport(summary);

  return NextResponse.json({
    agentId:   summary.agentId,
    agentName: summary.agentName,
    period,
    sections: {
      inferenceSpend:    { value: summary.totalInferenceSpend,   label: "Inference Spend" },
      inferenceRevenue:  { value: summary.totalInferenceRevenue, label: "Inference Revenue" },
      providerUsage:     { value: summary.providerSpend,         label: "Provider Spend",    topProvider: summary.topProvider },
      fallbackUsage:     { value: summary.fallbackProviderSpend, label: "Fallback Spend",    count: summary.fallbackUsageCount },
      walletFlows:       { inflows: summary.walletInflows,       outflows: summary.walletOutflows, label: "Wallet Flows" },
      netAgentPosition:  { value: summary.netAgentPosition,      label: "Net Position",      direction: summary.netAgentPosition >= 0 ? "positive" : "negative" },
    },
    eventCount:          summary.eventCount,
    lucaVerdict:         summary.lucaVerdict,
    plainEnglishSummary: report.summary,
  });
}
