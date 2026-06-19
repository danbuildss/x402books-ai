// Luca X (Twitter) response doctrine.
//
// This is the single source of truth for how Luca responds to @AskLucaAI
// mentions on X. Three tiers, same discipline:
//
//   Fast Read    — default. One signal. One verdict. Stop.
//   Analyst Read — triggered by "why?" / "details?" / "explain more"
//   Full Report  — triggered by "audit" / "full report" / "deep dive"
//
// Never auto-posts. All output is a draft for human approval in /luca-admin.

// ── Tier detection ────────────────────────────────────────────────────────────

export type ResponseTier = "fast_read" | "analyst_read" | "full_report";

export function detectTier(text: string): ResponseTier {
  if (/\bfull[- ]report\b|\baudit\b|\bdeep[- ]dive\b|\bbreak.*down\b/i.test(text)) return "full_report";
  if (/\bwhy\b.*\?|\bdetails?\b.*\?|\bexplain more\b|\bmore info\b|\btell me more\b|\belaborate\b/i.test(text)) return "analyst_read";
  return "fast_read";
}

// ── Question classification ───────────────────────────────────────────────────

const QUESTION_WORD = /^(what|how|why|when|who|where|can|does|is|are|will|would|should|could|tell|explain|do|has|have|did)\b/i;
const NOISE = /^(gm|gm!|wagmi|lfg|let'?s go|congrats|congratulations|nice|lol|wow|amazing|great|awesome|love this|🚀|💎|🔥|\+1|based|bullish|bearish)/i;

export function stripMention(text: string): string {
  return text.replace(/@AskLucaAI/gi, "").replace(/@\w+/g, "").replace(/\s+/g, " ").trim();
}

export function isGenuineQuestion(text: string): boolean {
  const clean = stripMention(text);
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length < 5) return false;       // too short
  if (NOISE.test(clean)) return false;      // pure noise / celebration

  const hasMark = clean.includes("?");
  const hasWord = QUESTION_WORD.test(clean);

  if (!hasMark && !hasWord) return false;

  // "what an amazing project!" — question word but not a question
  if (hasWord && !hasMark) {
    const afterQWord = clean.replace(QUESTION_WORD, "").trim();
    if (afterQWord.split(/\s+/).length < 3) return false;
  }

  return true;
}

// ── Risk classification ───────────────────────────────────────────────────────

const HIGH_RISK = /\bprice\b|\bmoon\b|\bpump\b|\bdump\b|\brug\b|\blegal\b|\bsue\b|\bscam\b|\bfraud\b|\billegal\b|\blambo\b|\brich\b/i;
const LOW_RISK  = /what is|how does|explain|tell me about|how to|x402|luca.*work|agent.*financ|what.*registry|how.*attribution/i;

export function classifyRisk(text: string): "low" | "medium" | "high" {
  if (HIGH_RISK.test(text)) return "high";
  if (LOW_RISK.test(text))  return "low";
  return "medium";
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SHARED_CONTEXT = `You are Luca — x402Books' financial intelligence layer for autonomous AI agents. x402Books tracks on-chain agent revenue, expenses, and wallet attribution from declared wallet manifests on Base.

Hard rules (never break these):
- No hype. No speculation. No financial advice.
- No token price. No market cap. No "to the moon."
- No forced reply — if the question is too vague, say so in one sentence.
- Do not start with "Hi", "Hey", or the person's name.
- Plain text only. No markdown. No hashtags unless natural.`;

export function buildFastReadPrompt(question: string): string {
  return `${SHARED_CONTEXT}

Response tier: Fast Read (default).
- One signal. One verdict. Stop.
- Plain language. If you have a number, use it. If not, say so.
- If the question is about a specific agent: point to x402books.xyz/registry/[slug]
- If you cannot answer specifically: one sentence on what x402Books can tell them.
- Max 240 characters.

The question tagged @AskLucaAI:
"${question}"

Write the Fast Read reply. One verdict. Stop.`;
}

export function buildAnalystReadPrompt(question: string): string {
  return `${SHARED_CONTEXT}

Response tier: Analyst Read (requested more detail).
- Expand with context, same discipline — still no hype.
- 2–3 sentences. Include one data point or explanation if you have it.
- Reference x402books.xyz/methodology or /leaderboard if relevant.
- Max 500 characters.

The follow-up tagged @AskLucaAI:
"${question}"

Write the Analyst Read reply.`;
}

export function buildFullReportPrompt(question: string): string {
  return `${SHARED_CONTEXT}

Response tier: Full Report (audit / deep dive requested).
- Acknowledge the request in one sentence.
- Direct them to the relevant x402Books page (x402books.xyz/registry/[agent] or /leaderboard or /methodology).
- Add one high-level signal if you have it.
- Max 240 characters.

The request tagged @AskLucaAI:
"${question}"

Write the Full Report reply.`;
}

export function buildPrompt(question: string, tier: ResponseTier): string {
  if (tier === "analyst_read") return buildAnalystReadPrompt(question);
  if (tier === "full_report")  return buildFullReportPrompt(question);
  return buildFastReadPrompt(question);
}

export function tierLabel(tier: ResponseTier): string {
  if (tier === "analyst_read") return "Analyst Read";
  if (tier === "full_report")  return "Full Report";
  return "Fast Read";
}
