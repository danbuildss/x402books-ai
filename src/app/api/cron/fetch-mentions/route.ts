// GET /api/cron/fetch-mentions — fetches recent @AskLucaAI mentions from X,
// classifies whether each is a genuine question, generates a draft reply via
// Claude Haiku, deduplicates against existing DB records, and queues new
// drafts into luca_pending_replies for human approval in /luca-admin.
//
// Called by Hermes on a recurring schedule (e.g. every 30 minutes).
// Never auto-posts. Humans approve in /luca-admin → Pending Replies.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { fetchRecentMentions, type XMention } from "@/lib/x-mentions";

// ── Question classification ───────────────────────────────────────────────────

const QUESTION_WORDS = /^(what|how|why|when|who|where|can|does|is|are|will|would|should|could|tell|explain|do|has|have|did|does)\b/i;
const HIGH_RISK_WORDS = /price|moon|pump|dump|rug|legal|sue|scam|fraud|illegal|lambo|when.*rich|get rich/i;
const LOW_RISK_WORDS = /what is|how does|explain|tell me about|how to|what.*x402|how.*luca|what.*agent|how.*work/i;

function stripMention(text: string): string {
  return text.replace(/@AskLucaAI/gi, "").replace(/@\w+/g, "").trim();
}

function isGenuineQuestion(mention: XMention): boolean {
  const clean = stripMention(mention.text);
  if (clean.split(/\s+/).filter(Boolean).length < 4) return false; // too short
  return clean.includes("?") || QUESTION_WORDS.test(clean);
}

function classifyRisk(mention: XMention): "low" | "medium" | "high" {
  const text = mention.text.toLowerCase();
  if (HIGH_RISK_WORDS.test(text)) return "high";
  if (LOW_RISK_WORDS.test(text))  return "low";
  return "medium";
}

// ── Draft generation ──────────────────────────────────────────────────────────

async function generateDraft(mention: XMention, apiKey: string): Promise<string> {
  const clean = stripMention(mention.text);
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [{
      role:    "user",
      content: `You are Luca, the financial intelligence layer for x402Books — the financial identity infrastructure for autonomous AI agents. x402Books tracks on-chain agent revenue, expenses, and attribution from declared wallet manifests.

Someone tagged @AskLucaAI on X with this message:
"${clean}"

Write a reply (max 240 characters). Rules:
- Be direct and helpful — answer the question if you can
- Reference x402Books or agent finance if relevant
- No hype, no token price commentary, no emojis unless natural
- Do not start with "Hi" or "Hey" or the person's name
- Plain text only, no hashtags unless it flows naturally
- If you cannot answer specifically, tell them where to find out (e.g. x402books.xyz/methodology)`,
    }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : null;
  if (!text) throw new Error("empty Claude response");

  // Truncate hard at 280 chars (X limit) with ellipsis
  return text.length > 277 ? text.slice(0, 277) + "…" : text;
}

// ── Telegram notification ─────────────────────────────────────────────────────

async function notifyTelegram(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.LUCA_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ ok: false, error: "TWITTER_BEARER_TOKEN not set" }, { status: 500 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase env not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdminClient();

  // 1. Fetch recent @AskLucaAI mentions from X API
  let mentions: XMention[];
  try {
    mentions = await fetchRecentMentions(bearerToken);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `X API fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  if (mentions.length === 0) {
    return NextResponse.json({ ok: true, total: 0, questions: 0, queued: 0, timestamp: new Date().toISOString() });
  }

  // 2. Filter to genuine questions
  const questions = mentions.filter(isGenuineQuestion);

  if (questions.length === 0) {
    return NextResponse.json({ ok: true, total: mentions.length, questions: 0, queued: 0, timestamp: new Date().toISOString() });
  }

  // 3. Deduplicate — skip tweet IDs already in DB
  const tweetIds = questions.map((m) => m.id);
  const { data: existing } = await sb
    .from("luca_pending_replies")
    .select("target_post_id")
    .in("target_post_id", tweetIds);

  const existingIds = new Set((existing ?? []).map((r: { target_post_id: string | null }) => r.target_post_id));
  const newQuestions = questions.filter((m) => !existingIds.has(m.id));

  // 4. Generate draft + insert for each new mention
  let queued = 0;
  const errors: string[] = [];

  for (const mention of newQuestions) {
    try {
      const draft    = await generateDraft(mention, anthropicKey);
      const risk     = classifyRisk(mention);
      const cleanMsg = stripMention(mention.text);

      const { error } = await sb.from("luca_pending_replies").insert({
        target_user:     mention.author_username,
        target_post_url: mention.url,
        target_post_id:  mention.id,
        draft_reply:     draft,
        risk_level:      risk,
        recommendation:  `Reply to @${mention.author_username}: "${cleanMsg.slice(0, 120)}${cleanMsg.length > 120 ? "…" : ""}"`,
        status:          "pending",
      });

      if (error) {
        errors.push(`${mention.id}: ${error.message}`);
      } else {
        queued++;
      }
    } catch (err) {
      errors.push(`${mention.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Telegram summary
  if (mentions.length > 0 || queued > 0) {
    const icon = queued > 0 ? "💬" : "ℹ️";
    const lines = [
      `${icon} <b>Mentions Scan</b>`,
      ``,
      `• Fetched: <b>${mentions.length}</b>  Questions: <b>${questions.length}</b>  Queued: <b>${queued}</b>`,
    ];
    if (errors.length > 0) lines.push(`• Errors: <b>${errors.length}</b> — check logs`);
    if (queued > 0) lines.push(`\n<a href="https://x402books.xyz/luca-admin">Review in Luca Admin →</a>`);
    await notifyTelegram(lines.join("\n"));
  }

  return NextResponse.json({
    ok: true,
    total:     mentions.length,
    questions: questions.length,
    skipped:   questions.length - newQuestions.length,
    queued,
    errors:    errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
