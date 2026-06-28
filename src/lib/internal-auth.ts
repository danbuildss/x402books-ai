// Fail-closed auth for internal/admin routes.
//
// Rules:
// - If ZETTA_INTERNAL_SECRET (or legacy X402BOOKS_INTERNAL_SECRET) is unset,
//   access is DENIED (fail closed).
//   The only escape hatch is ALLOW_DEV_NOAUTH=1, which is ignored in production.
// - Token comparison is timing-safe (sha256 normalization + timingSafeEqual).
// - Both ZETTA_INTERNAL_SECRET and X402BOOKS_INTERNAL_SECRET are accepted during migration.
// - Signed session tokens (issued by /api/admin/auth) are also accepted so that
//   the raw secret never needs to appear in a response body.

import { createHash, createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Verify an HMAC-signed session token of the form `${ts}.${sig}`.
// Tokens are valid for 1 hour, matching the admin session cookie maxAge.
function verifySessionToken(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const tsNum = parseInt(ts, 10);
  // Always run HMAC before checking expiry — early-exit leaks timing information
  // about whether the timestamp format was valid (timing oracle).
  const expected = createHmac("sha256", secret).update(ts).digest("hex");
  const sigOk = safeEqual(sig.length > 0 ? sig : "\0", expected);
  const notExpired = !isNaN(tsNum) && Date.now() - tsNum <= 3_600_000;
  return sigOk && notExpired;
}

export function internalAuth(req: Request): boolean {
  return internalAuthDetailed(req).ok;
}

// Extended variant — returns how auth passed so callers can audit the access.
// Use this in security-sensitive admin routes; existing callers using the
// boolean variant are unaffected.
export function internalAuthDetailed(
  req: Request,
): { ok: boolean; via: "raw_secret" | "session_token" | "dev_noauth" | null } {
  const secret = process.env.ZETTA_INTERNAL_SECRET || process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) {
    const devOk = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_NOAUTH === "1";
    return { ok: devOk, via: devOk ? "dev_noauth" : null };
  }

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Some internal callers (BANKR x402 handlers, crons) send x-internal-secret instead
  const token = bearer || (req.headers.get("x-internal-secret") ?? "").trim();

  if (!token) return { ok: false, via: null };

  if (safeEqual(token, secret)) return { ok: true, via: "raw_secret" };
  if (verifySessionToken(token, secret)) return { ok: true, via: "session_token" };
  return { ok: false, via: null };
}

// Fire-and-forget audit log. Emits a structured JSON line to stdout so it
// appears in Vercel/server logs and can be searched or piped to a SIEM.
// Call after a successful internalAuthDetailed check in admin routes.
export function logAdminAccess(params: {
  via: "raw_secret" | "session_token" | "dev_noauth";
  endpoint: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
}): void {
  const entry = {
    type:        "admin_access",
    ts:          new Date().toISOString(),
    endpoint:    params.endpoint,
    via:         params.via,
    status_code: params.statusCode,
    duration_ms: params.durationMs,
    ip:          params.ip ?? null,
  };
  console.log(JSON.stringify(entry));
}
