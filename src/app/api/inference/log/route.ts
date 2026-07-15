import { NextRequest, NextResponse } from "next/server";
import { logInferenceEvent, type CostSource } from "@/lib/inference-events";
import { internalAuth } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

// POST /api/inference/log
// Internal intake endpoint — called by Surplus (or any agent) to record inference economic events.
// Requires Authorization: Bearer <ZETTA_INTERNAL_SECRET> or X-Internal-Secret header.
// Writes to inference_events table.
//
// Body: {
//   agent_id, provider,
//   model?, request_type?,
//   input_tokens?, output_tokens?, total_tokens?,
//   cost_usd?, cost_source?: "actual"|"estimated"|"missing",
//   latency_ms?, status?,
//   external_request_id?
// }
export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    agent_id, provider,
    model, request_type,
    input_tokens, output_tokens, total_tokens,
    cost_usd, cost_source,
    latency_ms, status,
    external_request_id,
  } = body;

  if (!agent_id || typeof agent_id !== "string") {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }
  if (!provider || typeof provider !== "string") {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const validCostSources: CostSource[] = ["actual", "estimated", "missing"];
  const resolvedCostSource: CostSource =
    typeof cost_source === "string" && validCostSources.includes(cost_source as CostSource)
      ? (cost_source as CostSource)
      : typeof cost_usd === "number" ? "actual" : "missing";

  const result = await logInferenceEvent({
    agentId:            agent_id,
    provider,
    model:              typeof model === "string" ? model : null,
    requestType:        typeof request_type === "string" ? request_type : null,
    inputTokens:        typeof input_tokens === "number" ? input_tokens : null,
    outputTokens:       typeof output_tokens === "number" ? output_tokens : null,
    totalTokens:        typeof total_tokens === "number" ? total_tokens : null,
    costUsd:            typeof cost_usd === "number" ? cost_usd : null,
    costSource:         resolvedCostSource,
    latencyMs:          typeof latency_ms === "number" ? latency_ms : null,
    status:             typeof status === "string" ? status : "success",
    externalRequestId:  typeof external_request_id === "string" ? external_request_id : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
