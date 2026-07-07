// POST /api/v1/luca/surplus/webhook
//
// Surplus → Zetta inference spend callback.
//
// When an AEON agent calls Surplus directly (not via the Zetta proxy), Surplus
// POSTs this webhook after each inference job settles. Zetta records the spend
// as a classified financial event on the agent's profile.
//
// Auth: X-Surplus-Secret header must match SURPLUS_WEBHOOK_SECRET env var.
// If SURPLUS_WEBHOOK_SECRET is unset, the endpoint is disabled (fail-closed).
//
// Body (Surplus format):
// {
//   event:    "inference.completed",
//   agent_id: string,           // agent identifier (slug or registry name)
//   model:    string,
//   usage:    { prompt_tokens: number, completion_tokens: number },
//   cost_usd: number,           // actual settled cost (preferred over usage estimate)
//   latency_ms?: number,
//   request_id?: string,
//   timestamp?: string,
// }

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { logAgentEvent } from "@/lib/agent-events";
import { logInferenceEvent } from "@/lib/inference-events";

export const dynamic = "force-dynamic";

const PRICING: Record<string, [number, number]> = {
  "claude-opus-4.6":   [15.00, 75.00],
  "claude-opus-4-5":   [15.00, 75.00],
  "claude-sonnet-4-6": [3.00,  15.00],
  "claude-haiku-4-5":  [0.25,  1.25],
  "llama-3.3-70b":     [0.59,  0.79],
  "llama-3.1-405b":    [3.00,  3.00],
  "gpt-4o":            [2.50,  10.00],
  "gpt-4o-mini":       [0.15,  0.60],
};

function estimateCostFromUsage(
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number },
): number {
  const [inputRate, outputRate] = PRICING[model] ?? [0.59, 0.79];
  const cost =
    ((usage.prompt_tokens ?? 0) / 1_000_000) * inputRate +
    ((usage.completion_tokens ?? 0) / 1_000_000) * outputRate;
  return Math.round(cost * 10_000) / 10_000;
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SURPLUS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Surplus webhook is not configured on this server." },
      { status: 503 },
    );
  }

  // Verify Surplus-supplied secret header
  const provided = req.headers.get("x-surplus-secret") ?? "";
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const event      = typeof body.event      === "string" ? body.event      : "";
  const agentId    = typeof body.agent_id   === "string" ? body.agent_id.trim() : "";
  const model      = typeof body.model      === "string" ? body.model      : "llama-3.3-70b";
  const requestId  = typeof body.request_id === "string" ? body.request_id : null;
  const latencyMs  = typeof body.latency_ms === "number" ? body.latency_ms : null;

  if (!agentId) {
    return NextResponse.json({ error: "agent_id is required." }, { status: 400 });
  }

  // We accept any inference event type; non-inference events are acknowledged but ignored
  if (!event.startsWith("inference")) {
    return NextResponse.json({ ok: true, recorded: false, reason: "non-inference event ignored" });
  }

  // Cost: use settled cost_usd if provided, otherwise estimate from token usage
  let costUsd: number | null = null;
  if (typeof body.cost_usd === "number") {
    costUsd = body.cost_usd;
  } else {
    const usage = (body.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
    if (usage.prompt_tokens !== undefined || usage.completion_tokens !== undefined) {
      costUsd = estimateCostFromUsage(model, usage);
    }
  }

  const agentName = agentId;

  await Promise.allSettled([
    logAgentEvent({
      agentId,
      agentName,
      eventType: "inference_purchase",
      provider:  "surplus",
      amount:    costUsd,
      token:     "USD",
      direction: "outflow",
      metadata:  {
        model,
        request_id:  requestId,
        source:      "surplus_webhook",
        route:       "v1_surplus_webhook",
        event_type:  event,
      },
    }),
    logInferenceEvent({
      agentId,
      provider:    "surplus",
      model,
      requestType: "chat_completion",
      costUsd,
      latencyMs,
      status:      "success",
    }),
  ]);

  return NextResponse.json({
    ok:       true,
    recorded: true,
    agent_id: agentId,
    cost_usd: costUsd,
  }, { status: 200 });
}
