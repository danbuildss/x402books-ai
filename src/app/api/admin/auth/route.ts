import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password?: string };
  const expected = process.env.LUCA_ADMIN_PASSWORD;

  if (!expected || !password || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Return the API secret so the client can authenticate subsequent data calls.
  // LUCA_ADMIN_PASSWORD is the login gate; X402BOOKS_INTERNAL_SECRET is the API token.
  const apiToken = process.env.X402BOOKS_INTERNAL_SECRET ?? expected;
  return NextResponse.json({ ok: true, token: apiToken });
}
