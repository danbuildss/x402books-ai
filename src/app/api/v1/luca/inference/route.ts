// POST /api/v1/luca/inference
//
// Surplus inference via the Zetta proxy — accessible with a standard v1 API key.
//
// This is the endpoint Luca on Hermes (Telegram runtime) calls. It uses the same
// v1Auth as all other Luca skills so Hermes only needs one key for everything.
//
// Auth: Authorization: Bearer <api-key>  or  X-API-Key: <api-key>
// Body: OpenAI-compatible { model, messages, stream? }
//
// SURPLUS_API_KEY stays on Vercel — callers never need it.
// All spend is logged automatically to inference_events + agent_economic_events.

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { logAgentEvent } from "@/lib/agent-events";
import { logInferenceEvent } from "@/lib/inference-events";

export const dynamic = "force-dynamic";

const SURPLUS_URL = "https://www.surplusintelligence.ai/api/inference/v1/chat/completions";

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

function estimateCost(
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number } | null,
): number | null {
  if (!usage) return null;
  const [inputRate, outputRate] = PRICING[model] ?? PRICING["llama-3.3-70b"];
  const cost =
    ((usage.prompt_tokens ?? 0) / 1_000_000) * inputRate +
    ((usage.completion_tokens ?? 0) / 1_000_000) * outputRate;
  return Math.round(cost * 10_000) / 10_000;
}

async function logSpend(opts: {
  model: string;
  requestId: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number } | null;
  latencyMs: number;
  agentId: string;
  agentName: string;
}) {
  const cost = estimateCost(opts.model, opts.usage);

  await Promise.allSettled([
    logAgentEvent({
      agentId:   opts.agentId,
      agentName: opts.agentName,
      eventType: "inference_purchase",
      provider:  "surplus",
      amount:    cost,
      token:     "USD",
      direction: "outflow",
      metadata:  { model: opts.model, request_id: opts.requestId, source: "hermes", route: "v1_inference" },
    }),
    logInferenceEvent({
      agentId:     opts.agentId,
      provider:    "surplus",
      model:       opts.model,
      requestType: "chat_completion",
      costUsd:     cost,
      latencyMs:   opts.latencyMs,
      status:      "success",
    }),
  ]);
}

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  // Prefer Luca's own buyer key so inference costs settle from Luca's wallet.
  // Fall back to the shared server key if the buyer key isn't set yet.
  const surplusKey = process.env.LUCA_SURPLUS_BUYER_KEY || process.env.SURPLUS_API_KEY;
  if (!surplusKey) {
    auth.finish(503, 0, "/api/v1/luca/inference");
    return NextResponse.json(
      { error: "Surplus inference is not configured on this server." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    auth.finish(400, 0, "/api/v1/luca/inference");
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const model    = typeof body.model === "string" ? body.model : "llama-3.3-70b";
  const isStream = body.stream === true;
  const t0       = Date.now();

  // Use key's agentScope if set (agent-scoped key), otherwise default to "luca"
  const agentId   = auth.agentScope ?? "luca";
  const agentName = agentId === "luca" ? "Luca" : agentId;

  let upstream: Response;
  try {
    upstream = await fetch(SURPLUS_URL, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${surplusKey}`,
        "Content-Type":  "application/json",
        "Accept":        isStream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    auth.finish(502, Date.now() - t0, "/api/v1/luca/inference");
    return NextResponse.json(
      { error: "Could not reach Surplus.", detail: String(err) },
      { status: 502 },
    );
  }

  const requestId = upstream.headers.get("x-request-id");

  if (!upstream.ok) {
    let detail: unknown;
    try {
      const ct = upstream.headers.get("content-type") ?? "";
      detail = ct.includes("json") ? await upstream.json() : await upstream.text();
    } catch {
      detail = upstream.statusText;
    }
    auth.finish(upstream.status, Date.now() - t0, "/api/v1/luca/inference");
    return NextResponse.json({ error: "Surplus returned an error.", detail }, { status: upstream.status });
  }

  // ── Streaming ──────────────────────────────────────────────────────────────
  if (isStream && upstream.body) {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer  = writable.getWriter();
    const decoder = new TextDecoder();
    let usage: { prompt_tokens?: number; completion_tokens?: number } | null = null;

    (async () => {
      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try { const c = JSON.parse(line.slice(6)); if (c.usage) usage = c.usage; } catch { /* skip */ }
            }
          }
          await writer.write(value);
        }
      } finally {
        writer.close().catch(() => {});
        const latencyMs = Date.now() - t0;
        auth.finish(200, latencyMs, "/api/v1/luca/inference");
        await logSpend({ model, requestId, usage, latencyMs, agentId, agentName });
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        ...(requestId ? { "x-request-id": requestId } : {}),
      },
    });
  }

  // ── Non-streaming ──────────────────────────────────────────────────────────
  let data: Record<string, unknown>;
  try {
    data = await upstream.json();
  } catch {
    auth.finish(502, Date.now() - t0, "/api/v1/luca/inference");
    return NextResponse.json({ error: "Invalid response from Surplus." }, { status: 502 });
  }

  const usage    = (data.usage as { prompt_tokens?: number; completion_tokens?: number } | null) ?? null;
  const latencyMs = Date.now() - t0;

  auth.finish(200, latencyMs, "/api/v1/luca/inference");
  await logSpend({ model, requestId: requestId ?? (data.id as string | null) ?? null, usage, latencyMs, agentId, agentName });

  return NextResponse.json(data);
}
