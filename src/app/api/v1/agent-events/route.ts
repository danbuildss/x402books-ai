import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { logAgentEvent, getAgentEvents } from "@/lib/agent-events";
import type { AgentEventType, AgentEventDirection } from "@/lib/agent-events";

export const dynamic = "force-dynamic";

// POST /api/v1/agent-events
// Log a new economic event for an agent.
// Body: { agentName, eventType, amountUsd?, provider?, token?, direction?, txHash?, metadata? }
export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentName, eventType, amountUsd, provider, token, direction, txHash, walletAddress, metadata } = body;

  if (!agentName || typeof agentName !== "string") {
    return NextResponse.json({ error: "agentName is required" }, { status: 400 });
  }
  if (!eventType || typeof eventType !== "string") {
    return NextResponse.json({ error: "eventType is required" }, { status: 400 });
  }

  const result = await logAgentEvent({
    agentName,
    eventType:     eventType as AgentEventType,
    walletAddress: typeof walletAddress === "string" ? walletAddress : null,
    provider:      typeof provider === "string" ? provider : null,
    amountUsd:     typeof amountUsd === "number" ? amountUsd : null,
    token:         typeof token === "string" ? token : "USDC",
    direction:     typeof direction === "string" ? direction as AgentEventDirection : null,
    txHash:        typeof txHash === "string" ? txHash : null,
    metadata:      metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}

// GET /api/v1/agent-events?agentName=X&days=7&limit=100
// Fetch recent events for an agent.
export async function GET(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const agentName = searchParams.get("agentName");
  const days   = Math.min(90, parseInt(searchParams.get("days") ?? "7", 10));
  const limit  = Math.min(500, parseInt(searchParams.get("limit") ?? "100", 10));

  if (!agentName) {
    return NextResponse.json({ error: "agentName is required" }, { status: 400 });
  }

  const events = await getAgentEvents(agentName, days, limit);
  return NextResponse.json({ events, count: events.length });
}
