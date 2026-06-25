import { createHash, createHmac } from "crypto";

// New canonical cookie name. Legacy name accepted for backwards compatibility.
export const ACCESS_COOKIE_NAME = "zetta_access";
export const ACCESS_COOKIE_NAME_LEGACY = "x402books_access";
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

// Reads the session cookie from a request and returns the codeId
// (access_codes.id) if the session is valid, null otherwise.
// Accepts both zetta_access (new) and x402books_access (legacy) during migration.
export function getSessionCodeId(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());

  for (const name of [ACCESS_COOKIE_NAME, ACCESS_COOKIE_NAME_LEGACY]) {
    const match = cookies.find((c) => c.startsWith(`${name}=`));
    if (!match) continue;
    const token = decodeURIComponent(match.slice(name.length + 1));
    const codeId = verifyAccessToken(token);
    if (codeId) return codeId;
  }
  return null;
}

// Returns the codeId (access_codes.id) if the token is valid, null otherwise.
export function verifyAccessToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const signature = parts[parts.length - 1];
  const payload = parts.slice(0, -1).join(".");
  const expiresAt = Number(parts[parts.length - 2]);
  const codeId = parts.slice(0, -2).join(".");
  if (!codeId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = createHmac("sha256", getAccessSecret()).update(payload).digest("hex");
  if (signature !== expected) return null;
  return codeId;
}
