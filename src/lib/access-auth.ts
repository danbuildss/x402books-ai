import { createHmac } from "crypto";

export const ACCESS_COOKIE_NAME = "zetta_access";
export const ACCESS_COOKIE_NAME_LEGACY = "x402books_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export function getAccessSecret() {
  return process.env.ACCESS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function createAccessToken(userId: string) {
  const expiresAt = Date.now() + ACCESS_COOKIE_MAX_AGE * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", getAccessSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAccessToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const signature = parts[parts.length - 1];
  const payload = parts.slice(0, -1).join(".");
  const expiresAt = Number(parts[parts.length - 2]);
  const userId = parts.slice(0, -2).join(".");
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = createHmac("sha256", getAccessSecret()).update(payload).digest("hex");
  if (signature !== expected) return null;
  return userId;
}

export function getSessionCodeId(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const name of [ACCESS_COOKIE_NAME, ACCESS_COOKIE_NAME_LEGACY]) {
    const match = cookies.find((c) => c.startsWith(`${name}=`));
    if (!match) continue;
    const token = decodeURIComponent(match.slice(name.length + 1));
    const userId = verifyAccessToken(token);
    if (userId) return userId;
  }
  return null;
}
