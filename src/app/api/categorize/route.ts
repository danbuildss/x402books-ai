import { type NextRequest, NextResponse } from "next/server";

// Legacy route — redirected to canonical v1 endpoint.
export async function POST(req: NextRequest) {
  const dest = new URL("/api/v1/categorize", req.url);
  dest.search = req.nextUrl.search;
  return NextResponse.redirect(dest, 308);
}
