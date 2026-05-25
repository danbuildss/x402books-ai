import { NextRequest, NextResponse } from "next/server";
import { getAgentEvents, summarizeEvents } from "@/lib/agent-events";
import { generateAgentReport } from "@/lib/agent-report";

export const dynamic = "force-dynamic";

function parsePeriod(p: string): number {
  const m = p.match(/^(\d+)d$/);
  return m ? Math.min(90, Math.max(1, parseInt(m[1], 10))) : 7;
}

// GET /api/luca/economics?period=7d
// Public — Luca's economics are visible as part of her registry profile.
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "7d";
  const days   = parsePeriod(period);

  const events  = await getAgentEvents("luca", days);
  const summary = summarizeEvents("luca", events, days);
  const report  = generateAgentReport(summary);

  return NextResponse.json({
    period,
    periodDays: days,
    summary,
    report,
  });
}
