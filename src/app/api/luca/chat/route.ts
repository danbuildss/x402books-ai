// POST /api/luca/chat
// Streaming Luca chat with tool use and session memory.
//
// Body:
//   { query: string, agent_id?: string, messages?: {role,content}[], session_id?: string }
//   OR { messages: [{role,content}], agent_id?, session_id? }
//
// Auth: session cookie (same as dashboard)
// Response: text/event-stream — SSE chunks {"text":"..."} terminated by [DONE]

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access-auth";
import { LUCA_TOOL_DEFINITIONS, executeTool, type ToolName } from "@/lib/luca-tools";
import { readMemory, writeMemory, formatMemoryContext } from "@/lib/luca-memory";
import { routeModel } from "@/lib/model-router";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Luca — Zetta's financial analyst for the autonomous agent economy.

You have access to live financial data via tools. When a user asks about an agent's finances, treasury, revenue, or trends — call the appropriate tool first, then answer with the data. Never fabricate numbers.

Analyst discipline:
1. Attribution first — confirm which agent and wallets you're analyzing
2. Books — what happened financially (revenue, expenses, net income)
3. History — what changed (momentum direction and %)
4. Signal — the most important observation
5. Verdict — why it matters

Response style:
- Terse. Accounting-focused. No hype.
- Numbers always in USD with 2 decimal places
- Use the settlement pattern vocabulary: "Recurring flow pattern detected." not "I notice..."
- Fast Read (default): Signal + Verdict. Stop.
- Analyst Read (when asked "why?" / "explain"): add context
- Full Report (when asked for "full report" / "audit"): complete structured breakdown

If data is unavailable or confidence is low, say so plainly. Never estimate when you can measure.
Memory: If the user expresses a preference or asks you to remember something, acknowledge it. You will record it.`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token  = cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? "";
  const codeId = verifyAccessToken(token);
  if (!codeId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  let body: {
    query?:    string;
    agent_id?: string;
    wallet?:   string;
    messages?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Normalise into message array
  let apiMessages: Anthropic.MessageParam[];
  if (body.messages?.length) {
    apiMessages = body.messages.map((m) => ({ role: m.role, content: m.content }));
  } else if (body.query) {
    apiMessages = [{ role: "user", content: body.query }];
  } else {
    return new Response(JSON.stringify({ error: "query or messages required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const agentSlug = body.agent_id ?? null;
  const userId    = codeId;

  const lastUserContent = [...apiMessages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastUserText    = typeof lastUserContent === "string" ? lastUserContent : "";

  // Memory context
  const memory    = await readMemory(userId, agentSlug ?? undefined);
  const memoryCtx = formatMemoryContext(memory);
  const system    = memoryCtx ? `${SYSTEM_PROMPT}\n\n${memoryCtx}` : SYSTEM_PROMPT;

  // Route model based on complexity
  const modelConfig = routeModel({
    query:        lastUserText,
    hasToolCalls: false,
    estimatedTokens: apiMessages.reduce((n, m) => n + (typeof m.content === "string" ? m.content.length / 4 : 0), 0),
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      const sendDone = () =>
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

      try {
        let iterCount = 0;
        const MAX_ITER = 5;
        let usedToolCall = false;

        while (iterCount < MAX_ITER) {
          iterCount++;

          // Re-route after first tool call — more context = use capable model
          const currentModel = (usedToolCall
            ? routeModel({ query: lastUserText, hasToolCalls: true, forceCapable: false })
            : modelConfig
          ).model;

          const response = await anthropic.messages.create({
            model:      currentModel,
            max_tokens: modelConfig.max_tokens,
            system,
            tools:      LUCA_TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
            messages:   apiMessages,
            stream:     false,
          });

          if (response.stop_reason === "end_turn") {
            for (const block of response.content) {
              if (block.type === "text") {
                const words = block.text.split(" ");
                for (let i = 0; i < words.length; i++) {
                  send(words[i] + (i < words.length - 1 ? " " : ""));
                  await new Promise<void>((r) => setTimeout(r, 0));
                }

                if (/remember|note that|keep in mind/i.test(lastUserText)) {
                  await writeMemory(userId, agentSlug, "user_note", lastUserText.slice(0, 200)).catch(() => {});
                }
              }
            }
            break;
          }

          if (response.stop_reason === "tool_use") {
            usedToolCall = true;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type === "tool_use") {
                const result = await executeTool(
                  block.name as ToolName,
                  block.input as Record<string, unknown>,
                );
                toolResults.push({
                  type:        "tool_result",
                  tool_use_id: block.id,
                  content:     JSON.stringify(result),
                });
              }
            }

            apiMessages.push({ role: "assistant", content: response.content });
            apiMessages.push({ role: "user",      content: toolResults });
            continue;
          }

          send("Analysis complete.");
          break;
        }

        sendDone();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Analysis failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
