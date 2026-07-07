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
import OpenAI from "openai";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access-auth";
import { executeTool, type ToolName } from "@/lib/luca-tools";
import { readMemory, writeMemory, formatMemoryContext } from "@/lib/luca-memory";
import { routeModel } from "@/lib/model-router";
import { logInferenceEvent } from "@/lib/inference-events";

export const dynamic = "force-dynamic";

function getOpenAI() {
  return new OpenAI({
    apiKey:  process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
    ...(process.env.LLM_BASE_URL ? { baseURL: process.env.LLM_BASE_URL } : {}),
  });
}

// OpenAI-format tool definitions (converted from Anthropic input_schema format)
const OPENAI_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_agent_books",
      description:
        "Fetch the attributed financial books for an agent: revenue, expenses, net income, wallet count, and confidence signals. Use this when asked about an agent's financial performance, revenue, costs, or profitability.",
      parameters: {
        type: "object",
        properties: {
          slug:   { type: "string", description: "Agent slug, e.g. 'aeon'" },
          period: { type: "string", enum: ["7d", "14d", "30d", "90d"], description: "Lookback window" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_treasury_balance",
      description:
        "Fetch the current stablecoin (USDC + USDT) balance for a wallet address. Use this when asked about treasury health, runway, or current balance.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "0x wallet address" },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_momentum",
      description:
        "Compute directional momentum (growing/stable/declining) for an agent's revenue, expenses, net income, and treasury over recent snapshots. Use this when asked about trends, direction, or whether an agent is improving.",
      parameters: {
        type: "object",
        properties: {
          slug:        { type: "string", description: "Agent slug" },
          window_days: { type: "number", description: "Lookback window in days (default 30)" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_anomaly_alerts",
      description:
        "Fetch active anomaly alerts for an agent: unusual volume, new counterparties, timing gaps, or ratio breakdowns. Use this when asked about risks, red flags, or unusual activity.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Agent slug" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_agent_info",
      description:
        "Fetch basic registry information for an agent: name, ecosystem, verification status, wallet count. Use this when asked who or what an agent is.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Agent slug" },
        },
        required: ["slug"],
      },
    },
  },
];

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

  // Normalise into OpenAI message array
  let apiMessages: OpenAI.Chat.ChatCompletionMessageParam[];
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
  const systemMsg = memoryCtx ? `${SYSTEM_PROMPT}\n\n${memoryCtx}` : SYSTEM_PROMPT;

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
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        const t0 = Date.now();

        // Prepend system message
        const msgsWithSystem: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: systemMsg },
          ...apiMessages,
        ];

        while (iterCount < MAX_ITER) {
          iterCount++;

          const currentModel = (usedToolCall
            ? routeModel({ query: lastUserText, hasToolCalls: true, forceCapable: false })
            : modelConfig
          ).model;

          const response = await getOpenAI().chat.completions.create({
            model:      currentModel,
            max_tokens: modelConfig.max_tokens,
            tools:      OPENAI_TOOLS,
            messages:   msgsWithSystem,
          });

          totalPromptTokens     += response.usage?.prompt_tokens     ?? 0;
          totalCompletionTokens += response.usage?.completion_tokens ?? 0;

          const choice = response.choices[0];
          if (!choice) {
            send("Analysis unavailable — model returned no response. Please try again.");
            break;
          }
          const msg = choice.message;

          if (choice.finish_reason === "stop" || choice.finish_reason === "length") {
            const text = msg.content ?? "";
            const words = text.split(" ");
            for (let i = 0; i < words.length; i++) {
              send(words[i] + (i < words.length - 1 ? " " : ""));
              await new Promise<void>((r) => setTimeout(r, 0));
            }

            if (/remember|note that|keep in mind/i.test(lastUserText)) {
              await writeMemory(userId, agentSlug, "user_note", lastUserText.slice(0, 200)).catch(() => {});
            }
            break;
          }

          if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
            usedToolCall = true;
            msgsWithSystem.push(msg);

            const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

            for (const tc of msg.tool_calls) {
              if (tc.type !== "function") continue;
              let parsed: Record<string, unknown> = {};
              try { parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>; } catch { /* ignore */ }

              const result = await executeTool(tc.function.name as ToolName, parsed);
              toolResults.push({
                role:         "tool",
                tool_call_id: tc.id,
                content:      JSON.stringify(result),
              });
            }

            for (const tr of toolResults) msgsWithSystem.push(tr);
            continue;
          }

          send("Analysis complete.");
          break;
        }

        sendDone();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Analysis failed";
        send(`Unable to complete analysis: ${errMsg}`);
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
