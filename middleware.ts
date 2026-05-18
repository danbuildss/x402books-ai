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

export function middleware(request: NextRequest) {
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

  if (username !== adminUser || password !== adminPassword) {
    return unauthorized("Invalid Luca admin credentials.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/luca-admin/:path*"],
};
