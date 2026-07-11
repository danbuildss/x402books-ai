import { NextRequest, NextResponse } from "next/server";
import { getInferenceEvents } from "@/lib/inference-events";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get("agent_id");
  const days    = parseInt(searchParams.get("days") ?? "30", 10);
  const limit   = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  if (!agentId) return NextResponse.json({ error: "agent_id required" }, { status: 400 });

  const events = await getInferenceEvents(agentId, days, limit);
  return NextResponse.json({ events });
}
