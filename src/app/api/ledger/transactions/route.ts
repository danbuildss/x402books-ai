import { type NextRequest, NextResponse } from "next/server";

// Legacy route — redirected to canonical v1 endpoint.
export async function GET(req: NextRequest) {
  const dest = new URL("/api/v1/transactions", req.url);
  dest.search = req.nextUrl.search;
  return NextResponse.redirect(dest, 308);
}
