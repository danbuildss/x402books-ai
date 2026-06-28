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
  const secret = process.env.ZETTA_INTERNAL_SECRET || process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_NOAUTH === "1";
  }

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Some internal callers (BANKR x402 handlers, crons) send x-internal-secret instead
  const token = bearer || (req.headers.get("x-internal-secret") ?? "").trim();

  if (!token) return false;

  // Accept raw secret (crons/internal callers) or signed session token (admin UI)
  return safeEqual(token, secret) || verifySessionToken(token, secret);
}
