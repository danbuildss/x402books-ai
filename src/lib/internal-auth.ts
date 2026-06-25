// Fail-closed auth for internal/admin routes.
//
// Rules:
// - If ZETTA_INTERNAL_SECRET (or legacy X402BOOKS_INTERNAL_SECRET) is unset,
//   access is DENIED (fail closed).
//   The only escape hatch is ALLOW_DEV_NOAUTH=1, which is ignored in production.
// - Token comparison is timing-safe (sha256 normalization + timingSafeEqual).
// - Both ZETTA_INTERNAL_SECRET and X402BOOKS_INTERNAL_SECRET are accepted during migration.

import { createHash, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
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
  return safeEqual(token, secret);
}
