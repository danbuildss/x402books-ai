import { NextRequest, NextResponse } from "next/server";
import { logInferenceEvent } from "@/lib/inference-events";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/inference/log
// Public intake endpoint — called by Surplus (or any agent) to record inference economic events.
// Writes to inference_events table (Surplus-facing raw events, separate from agent_economic_events).
//
// Body: { agent_id, provider, model?, request_type?, cost_usd?, latency_ms?, status? }
// Response: { ok: true, id: string }
export async function POST(req: NextRequest) {
  // High ceiling — legitimate machine traffic (Surplus) logs at volume;
  // this only brakes floods.
  if (!rateLimit("inference-log", clientIp(req), 240, 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agent_id, provider, model, request_type, cost_usd, latency_ms, status } = body;

  if (!agent_id || typeof agent_id !== "string") {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }
  if (!provider || typeof provider !== "string") {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const result = await logInferenceEvent({
    agentId:     agent_id,
    provider,
    model:       typeof model === "string" ? model : null,
    requestType: typeof request_type === "string" ? request_type : null,
    costUsd:     typeof cost_usd === "number" ? cost_usd : null,
    latencyMs:   typeof latency_ms === "number" ? latency_ms : null,
    status:      typeof status === "string" ? status : "success",
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
