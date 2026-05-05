import { createHash, createHmac } from "crypto";

export const ACCESS_COOKIE_NAME = "x402books_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

export function normalizeAccessCode(code: string) {
  return code.trim().replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function hashAccessCode(code: string) {
  const salt = process.env.ACCESS_CODE_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "x402books";

  return createHash("sha256")
    .update(`${salt}:${normalizeAccessCode(code)}`)
    .digest("hex");
}

export function getAccessSecret() {
  return process.env.ACCESS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function createAccessToken(codeId: string) {
  const expiresAt = Date.now() + ACCESS_COOKIE_MAX_AGE * 1000;
  const payload = `${codeId}.${expiresAt}`;
  const signature = createHmac("sha256", getAccessSecret()).update(payload).digest("hex");

  return `${payload}.${signature}`;
}
