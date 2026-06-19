// GET /api/cron/fetch-mentions — @AskLucaAI X mention pipeline.
//
// Called by Hermes on a recurring schedule (e.g. every 30 minutes).
//
// Pipeline:
//   1. Fetch recent @AskLucaAI mentions from X API v2
//   2. Filter to genuine questions (noise / vague tags are skipped)
//   3. Detect response tier: Fast Read (default) | Analyst Read | Full Report
//   4. Generate draft reply via Claude using luca-x-doctrine prompts
//   5. Deduplicate against existing DB records by target_post_id
//   6. Write draft to luca_pending_replies (status: pending)
//   7. Notify admin via Telegram
//
// Never auto-posts. Every draft requires human approval in /luca-admin.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { fetchRecentMentions, type XMention } from "@/lib/x-mentions";
import {
  isGenuineQuestion,
  classifyRisk,
  detectTier,
  stripMention,
  buildPrompt,
  tierLabel,
  type ResponseTier,
  type ReplyExample,
} from "@/lib/luca-x-doctrine";

// ── Draft generation ──────────────────────────────────────────────────────────

// Max chars by tier — advisory (admin can edit before posting).
const TIER_MAX: Record<ResponseTier, number> = {
  fast_read:    240,
  analyst_read: 480,
  full_report:  240,
};

async function generateDraft(
  mention: XMention,
  tier: ResponseTier,
  apiKey: string,
  sb: ReturnType<typeof getSupabaseAdminClient>,
): Promise<string> {
  const question = stripMention(mention.text);
  const maxChars = TIER_MAX[tier];

  // Fetch last 5 approved examples for this tier to inject as few-shot context
  let examples: ReplyExample[] = [];
  try {
    const { data } = await sb
      .from("luca_reply_examples")
      .select("question, reply")
      .eq("tier", tier)
      .order("created_at", { ascending: false })
      .limit(5);
    examples = (data ?? []) as ReplyExample[];
  } catch {}

  const prompt = buildPrompt(question, tier, examples);

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : null;
  if (!text) throw new Error("empty Claude response");

  return text.length > maxChars + 3 ? text.slice(0, maxChars) + "…" : text;
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

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ ok: false, error: "X_BEARER_TOKEN not set" }, { status: 500 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase env not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdminClient();

  // 1. Fetch recent @AskLucaAI mentions
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

  // 2. Filter to genuine questions (noise / vague tags skipped)
  const questions = mentions.filter((m) => isGenuineQuestion(m.text));

  if (questions.length === 0) {
    return NextResponse.json({
      ok: true, total: mentions.length, questions: 0, skipped: mentions.length, queued: 0,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Deduplicate — skip tweet IDs already in DB
  const tweetIds = questions.map((m) => m.id);
  const { data: existing } = await sb
    .from("luca_pending_replies")
    .select("target_post_id")
    .in("target_post_id", tweetIds);

  const existingIds = new Set(
    (existing ?? []).map((r: { target_post_id: string | null }) => r.target_post_id),
  );
  const newQuestions = questions.filter((m) => !existingIds.has(m.id));

  // 4–6. For each new mention: detect tier → generate draft → insert
  let queued = 0;
  const errors: string[] = [];
  const queued_tiers: string[] = [];

  for (const mention of newQuestions) {
    try {
      const clean = stripMention(mention.text);
      const tier  = detectTier(mention.text);
      const risk  = classifyRisk(mention.text);
      const draft = await generateDraft(mention, tier, anthropicKey, sb);

      const { error } = await sb.from("luca_pending_replies").insert({
        target_user:     mention.author_username,
        target_post_url: mention.url,
        target_post_id:  mention.id,
        question:        clean,
        draft_reply:     draft,
        risk_level:      risk,
        recommendation:  `[${tierLabel(tier)}] @${mention.author_username}: "${clean.slice(0, 120)}${clean.length > 120 ? "…" : ""}"`,
        status:          "pending",
      });

      if (error) {
        errors.push(`${mention.id}: ${error.message}`);
      } else {
        queued++;
        queued_tiers.push(tierLabel(tier));
      }
    } catch (err) {
      errors.push(`${mention.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 7. Telegram summary
  const hasNew = queued > 0;
  const icon   = hasNew ? "💬" : "ℹ️";
  const lines  = [
    `${icon} <b>@AskLucaAI Mentions</b>`,
    ``,
    `• Fetched: <b>${mentions.length}</b>  Questions: <b>${questions.length}</b>  Queued: <b>${queued}</b>`,
  ];
  if (queued_tiers.length > 0) {
    lines.push(`• Tiers: ${queued_tiers.join(", ")}`);
  }
  if (errors.length > 0) {
    lines.push(`• Errors: <b>${errors.length}</b>`);
    for (const e of errors.slice(0, 3)) lines.push(`  └ ${e}`);
  }
  if (hasNew) lines.push(`\n<a href="https://x402books.xyz/luca-admin">Review drafts in Luca Admin →</a>`);

  await notifyTelegram(lines.join("\n"));

  return NextResponse.json({
    ok:        true,
    total:     mentions.length,
    questions: questions.length,
    skipped:   mentions.length - questions.length,
    duplicate: questions.length - newQuestions.length,
    queued,
    tiers:     queued_tiers,
    errors:    errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
