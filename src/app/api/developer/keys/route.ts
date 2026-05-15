import { NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

// GET /api/developer/keys — list active keys
export async function GET() {
  const keys = await listApiKeys();
  return NextResponse.json({ keys });
}

// POST /api/developer/keys — create a new key
export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown };
    const name = String(body.name ?? "Default").trim().slice(0, 64);

    const result = await createApiKey(name);
    if (!result) {
      return NextResponse.json({ error: "Could not create API key." }, { status: 500 });
    }

    // Return the raw key only once — it is not stored and cannot be retrieved again
    return NextResponse.json({ key: result.key, record: result.record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
