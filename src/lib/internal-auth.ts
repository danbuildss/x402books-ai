// Shared auth for internal/admin routes (X402BOOKS_INTERNAL_SECRET bearer).
//
// Fails CLOSED: a missing secret denies access instead of allowing it.
// Local dev can opt out explicitly with ALLOW_DEV_NOAUTH=1 (never in production).

import { createHash, timingSafeEqual } from "crypto";

// Hash both sides to equal length so timingSafeEqual never throws,
// then compare in constant time.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function internalAuth(req: Request): boolean {
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) {
    return (
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_DEV_NOAUTH === "1"
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  return safeEqual(token, secret);
}
