import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

// Rate limiting: max 5 attempts per IP per 15 minutes
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    authAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function signSession(secret: string): string {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", secret).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { password } = body;
  const expected = process.env.LUCA_ADMIN_PASSWORD;

  if (!expected || !password) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Timing-safe comparison
  let match = false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    match = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    match = false;
  }

  if (!match) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const sessionValue = signSession(secret);
  const isProd = process.env.NODE_ENV === "production";

  // Return the HMAC-signed session token, not the raw secret.
  // internalAuth() accepts both signed session tokens and raw secrets so that
  // cron/internal callers are unaffected; this path now never leaks the secret
  // in a response body.
  const response = NextResponse.json({ ok: true, token: sessionValue });
  response.cookies.set("x402-admin-session", sessionValue, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 3600,
    path: "/",
  });

  return response;
}
