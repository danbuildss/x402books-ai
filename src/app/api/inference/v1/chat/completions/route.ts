import { NextRequest, NextResponse } from "next/server";
import { logAgentEvent } from "@/lib/agent-events";
import { logInferenceEvent } from "@/lib/inference-events";
import { internalAuth as authOk } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

const SURPLUS_URL = "https://www.surplusintelligence.ai/api/inference/v1/chat/completions";

// Approximate pricing per 1M tokens (input / output) in USD.
// Used only when Surplus doesn't return usage in the response.
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

async function logInference(opts: {
  model: string;
  requestId: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number } | null;
  streamed: boolean;
  latencyMs?: number;
  agentId?: string;
  agentName?: string;
}) {
  const cost = estimateCost(opts.model, opts.usage);
  const agentId   = opts.agentId   ?? "luca";
  const agentName = opts.agentName ?? "Luca";

  // Broader financial ledger (agent_economic_events)
  await logAgentEvent({
    agentId,
    agentName,
    eventType: "inference_purchase",
    provider:  "surplus",
    amount:    cost,
    token:     "USD",
    direction: "outflow",
    metadata: {
      model:      opts.model,
      request_id: opts.requestId,
      source:     "hermes",
      route:      "inference_proxy",
      streamed:   opts.streamed,
      usage:      opts.usage,
    },
  }).catch(() => {});

  // Inference ledger (inference_events) — powers /luca/ledger and profile cards
  await logInferenceEvent({
    agentId,
    provider:    "surplus",
    model:       opts.model,
    requestType: "chat_completion",
    costUsd:     cost,
    latencyMs:   opts.latencyMs ?? null,
    status:      "success",
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const surplusKey = process.env.SURPLUS_API_KEY;
  if (!surplusKey) {
    return NextResponse.json({ error: "SURPLUS_API_KEY not configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const model     = typeof body.model === "string" ? body.model : "unknown";
  const isStream  = body.stream === true;
  const t0        = Date.now();
  // Caller can override which agent gets the spend attributed via header.
  // Defaults to "luca" so existing behaviour is unchanged.
  const agentId   = req.headers.get("x-agent-id")?.trim().toLowerCase() || "luca";
  const agentName = req.headers.get("x-agent-name")?.trim() || "Luca";

  // Forward to Surplus, replacing auth header server-side
  let upstream: Response;
  try {
    upstream = await fetch(SURPLUS_URL, {
      method:  "POST",
      headers: {
        "Authorization":  `Bearer ${surplusKey}`,
        "Content-Type":   "application/json",
        "Accept":         isStream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Surplus", detail: String(err) },
      { status: 502 },
    );
  }

  const requestId = upstream.headers.get("x-request-id");

  if (!upstream.ok) {
    let detail: unknown;
    const ct = upstream.headers.get("content-type") ?? "";
    try {
      detail = ct.includes("json") ? await upstream.json() : await upstream.text();
    } catch {
      detail = upstream.statusText;
    }
    return NextResponse.json(
      { error: "Surplus error", detail },
      { status: upstream.status },
    );
  }

  // ── Streaming response ────────────────────────────────────────────────────
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

          // Try to capture usage from SSE chunks (present in final chunk on some models)
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const chunk = JSON.parse(line.slice(6));
                if (chunk.usage) usage = chunk.usage;
              } catch { /* non-JSON line, skip */ }
            }
          }

          await writer.write(value);
        }
      } finally {
        writer.close().catch(() => {});
        await logInference({ model, requestId, usage, streamed: true, agentId, agentName });
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

  // ── Non-streaming response ────────────────────────────────────────────────
  let data: Record<string, unknown>;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON from Surplus" }, { status: 502 });
  }

  const usage = (data.usage as { prompt_tokens?: number; completion_tokens?: number } | null) ?? null;
  await logInference({ model, requestId: requestId ?? (data.id as string | null) ?? null, usage, streamed: false, latencyMs: Date.now() - t0, agentId, agentName });

  return NextResponse.json(data);
}
