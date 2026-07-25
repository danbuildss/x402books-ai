/**
 * Luca response verifier — deterministic post-processing hook.
 *
 * Runs AFTER Luca drafts a reply and BEFORE it is sent.
 * Extracts every dollar figure and percentage from the draft and confirms
 * each one exists in the skill responses retrieved this turn.
 *
 * A figure that cannot be traced to a skill response = reject the draft.
 * This is what stops Luca from inventing financial numbers.
 *
 * Wire this into Hermes as a response post-processor, not into the prompt.
 */

export interface SkillResponse {
  skill: string;
  body: unknown;
}

export interface VerificationResult {
  ok: boolean;
  uncited: string[]; // figures in the draft with no source in skill data
  reason?: string;
}

const FIGURE_RE = /\$\s?[\d,]+(?:\.\d{1,2})?[KkMm]?|\b\d+(?:\.\d{1,2})?\s?%/g;

// Flatten every numeric leaf of a skill response into a set of comparable strings.
function collectSourceNumbers(data: unknown, out: Set<string>): void {
  if (data == null) return;
  if (typeof data === "number" && Number.isFinite(data)) {
    out.add(normalize(data));
    // also add rounded variants so $12,400 matches 12400.00 and 12397.44 rounds up
    out.add(normalize(Math.round(data)));
    out.add(normalize(Math.round(data * 100) / 100));
    return;
  }
  if (Array.isArray(data)) {
    for (const item of data) collectSourceNumbers(item, out);
    return;
  }
  if (typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      collectSourceNumbers(value, out);
    }
  }
}

function normalize(n: number): string {
  return n.toFixed(2);
}

// Parse a figure from the draft text into a number.
// Supports $1,234.56, $12.4K, $1.2M, 91%, 91.5%.
function parseFigure(raw: string): number | null {
  const s = raw.trim();
  const pct = s.endsWith("%");
  const body = pct ? s.slice(0, -1) : s.replace(/^\$\s?/, "");
  const mult = /[Kk]$/.test(body) ? 1_000 : /[Mm]$/.test(body) ? 1_000_000 : 1;
  const cleaned = body.replace(/[KkMm]$/, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return pct ? n : n * mult;
}

// A draft figure is cited if any source number is within tolerance.
// Tolerance handles rounding ($12.4K vs 12397.44) and percent↔fraction (91% vs 0.91).
function isCited(value: number, raw: string, sources: Set<string>): boolean {
  const isPct = raw.trim().endsWith("%");
  for (const src of sources) {
    const sn = parseFloat(src);
    if (isPct) {
      // percent in draft may match fraction (0.91) or whole (91.00) in data
      if (Math.abs(sn - value) <= 0.51) return true;
      if (Math.abs(sn * 100 - value) <= 0.51) return true;
    } else {
      const tol = Math.max(0.01, Math.abs(sn) * 0.005); // 0.5% rounding tolerance
      if (Math.abs(sn - value) <= tol) return true;
    }
  }
  return false;
}

const ALLOWED_UNCITED = new Set([
  // structural numbers Luca is allowed to state without a tool source
  "100.00", // "100% coverage"
]);

export function verifyLucaResponse(
  draft: string,
  skillResponses: SkillResponse[],
): VerificationResult {
  const sources = new Set<string>();
  for (const r of skillResponses) collectSourceNumbers(r.body, sources);

  const figures = draft.match(FIGURE_RE) ?? [];
  const uncited: string[] = [];

  for (const raw of figures) {
    const value = parseFigure(raw);
    if (value == null) continue;
    if (ALLOWED_UNCITED.has(value.toFixed(2))) continue;
    if (!isCited(value, raw, sources)) uncited.push(raw.trim());
  }

  if (uncited.length > 0) {
    return {
      ok: false,
      uncited,
      reason:
        `Draft contains ${uncited.length} figure(s) not present in any skill response: ` +
        uncited.join(", ") +
        ". Regenerate the answer using only cited numbers, or remove these figures.",
    };
  }
  return { ok: true, uncited: [] };
}

// Terminology guardrails — phrases Luca must never say.
const FORBIDDEN_PHRASES: Array<{ re: RegExp; why: string }> = [
  { re: /wallet(s)?\s+(received|got)\s+.{0,40}(revenue|earned)/i, why: "wallet inflow is not revenue" },
  { re: /\bearned\b.{0,30}\bunresolved\b/i, why: "unresolved inflows are not earnings" },
  { re: /you should (buy|sell|invest)/i, why: "no investment advice" },
  { re: /(killing it|mooning|going to the moon)/i, why: "no hype" },
];

export function checkForbiddenPhrases(draft: string): { ok: boolean; hits: string[] } {
  const hits = FORBIDDEN_PHRASES.filter((p) => p.re.test(draft)).map((p) => p.why);
  return { ok: hits.length === 0, hits };
}
