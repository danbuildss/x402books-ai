// POST /api/luca/chat
// Proxies dashboard chat to the Hermes-hosted Luca agent.
//
// Body:
//   { query: string, agent_id?: string, messages?: {role,content}[] }
//   OR { messages: [{role,content}], agent_id? }
//
// Auth: session cookie (same as dashboard)
// Response: text/event-stream — SSE chunks {"text":"..."} terminated by [DONE]

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access-auth";

export const dynamic = "force-dynamic";

const HERMES_URL = process.env.HERMES_API_URL ?? "http://167.172.59.234:8642";
const HERMES_KEY = process.env.HERMES_API_KEY ?? "";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token  = cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? "";
  const codeId = verifyAccessToken(token);
  if (!codeId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    query?:    string;
    agent_id?: string;
    messages?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  type Message = { role: "user" | "assistant" | "system"; content: string };
  let messages: Message[];
  if (body.messages?.length) {
    messages = body.messages.map((m) => ({ role: m.role, content: m.content }));
  } else if (body.query) {
    messages = [{ role: "user", content: body.query }];
  } else {
    return new Response(JSON.stringify({ error: "query or messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      const sendDone = () =>
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

      try {
        const hermesRes = await fetch(`${HERMES_URL}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization":       `Bearer ${HERMES_KEY}`,
            "Content-Type":        "application/json",
            "X-Hermes-Session-Key": `zetta-dashboard:${codeId}`,
          },
          body: JSON.stringify({
            model:    "hermes-agent",
            messages,
            stream:   true,
          }),
        });

        if (!hermesRes.ok || !hermesRes.body) {
          const errText = await hermesRes.text().catch(() => "");
          console.error(JSON.stringify({
            type:   "luca_hermes_error",
            ts:     new Date().toISOString(),
            status: hermesRes.status,
            body:   errText.slice(0, 200),
          }));
          send("Luca is unavailable right now. Please try again in a moment.");
          sendDone();
          controller.close();
          return;
        }

        // Parse OpenAI-compatible SSE stream and re-emit as {"text":"..."} chunks
        const reader  = hermesRes.body.getReader();
        const decoder = new TextDecoder();
        let   buf     = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
                // Hermes may also emit {text:"..."} directly
                text?: string;
              };
              const chunk =
                parsed.text ??
                parsed.choices?.[0]?.delta?.content ??
                "";
              if (chunk) send(chunk);
            } catch {
              // non-JSON line — ignore
            }
          }
        }

        sendDone();
      } catch (err) {
        console.error(JSON.stringify({
          type:  "luca_chat_error",
          ts:    new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
        }));
        send("Unable to reach Luca right now. Please try again.");
        sendDone();
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
