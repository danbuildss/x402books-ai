import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/luca-admin"];

function unauthorized(message = "Authentication required") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Luca Command Center"',
    },
  });
}

async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const adminUser = process.env.LUCA_ADMIN_USER;
  const adminPassword = process.env.LUCA_ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return unauthorized("Luca admin auth is not configured.");
  }

  const header = request.headers.get("authorization");

  if (!header?.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = header.slice("Basic ".length);
  const decoded = atob(encoded);
  const separator = decoded.indexOf(":");
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  const [userOk, passOk] = await Promise.all([
    timingSafeStringEqual(username, adminUser),
    timingSafeStringEqual(password, adminPassword),
  ]);

  if (!userOk || !passOk) {
    return unauthorized("Invalid Luca admin credentials.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/luca-admin/:path*"],
};
