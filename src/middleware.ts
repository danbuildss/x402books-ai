import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = "x402books_access";

const protectedRoutes = [
  "/dashboard",
  "/api",
  "/settings",
];

function isProtectedPath(pathname: string) {
  if (pathname.startsWith("/api/")) return false;
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

async function getSignature(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hasValidAccessCookie(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const secret = process.env.ACCESS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!token || !secret) return false;

  const [codeId, expiresAt, signature] = token.split(".");
  if (!codeId || !expiresAt || !signature) return false;

  const expires = Number(expiresAt);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = await getSignature(`${codeId}.${expiresAt}`, secret);
  return signature === expected;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (await hasValidAccessCookie(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
