import { NextRequest, NextResponse } from "next/server";
import { logAgentEvent } from "@/lib/agent-events";
import type { AgentEventType, AgentEventDirection } from "@/lib/agent-events";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

// POST /api/agent-events/log
export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    agent_id, agent_name, wallet_address,
    event_type, provider, amount, token,
    direction, tx_hash, metadata, timestamp,
  } = body;

  if (!agent_id || typeof agent_id !== "string") {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }
  if (!event_type || typeof event_type !== "string") {
    return NextResponse.json({ error: "event_type is required" }, { status: 400 });
  }

  const result = await logAgentEvent({
    agentId:       agent_id,
    agentName:     typeof agent_name === "string" ? agent_name : null,
    walletAddress: typeof wallet_address === "string" ? wallet_address : null,
    eventType:     event_type as AgentEventType,
    provider:      typeof provider === "string" ? provider : null,
    amount:        typeof amount === "number" ? amount : null,
    token:         typeof token === "string" ? token : "USDC",
    direction:     typeof direction === "string" ? direction as AgentEventDirection : null,
    txHash:        typeof tx_hash === "string" ? tx_hash : null,
    metadata:      metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : null,
    timestamp:     typeof timestamp === "string" ? timestamp : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
