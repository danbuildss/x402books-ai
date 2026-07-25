import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = "zetta_access";
const ACCESS_COOKIE_NAME_LEGACY = "x402books_access";

const protectedRoutes = ["/dashboard", "/settings"];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isMaintenanceBypass(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/access"
  );
}

async function getSignature(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value ?? request.cookies.get(ACCESS_COOKIE_NAME_LEGACY)?.value;
  const secret = (process.env.ACCESS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!token || !secret) return false;

  const parts = token.split(".");
  if (parts.length < 3) return false;

  const signature = parts[parts.length - 1];
  const expiresAt = Number(parts[parts.length - 2]);
  const userId = parts.slice(0, -2).join(".");

  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = await getSignature(`${userId}.${expiresAt}`, secret);
  return signature === expected;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (process.env.MAINTENANCE_MODE === "true" && !isMaintenanceBypass(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  if (!isProtectedPath(pathname)) return NextResponse.next();
  if (await hasValidSession(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
