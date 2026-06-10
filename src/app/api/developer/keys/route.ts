import { NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { internalAuth } from "@/lib/internal-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Keys are not yet bound to owner accounts, so the global list is admin-only.
// Key creation stays public (it is the signup funnel) but is capped per IP
// to prevent rate-limit bypass via key cycling.

// GET /api/developer/keys — list active keys (admin)
export async function GET(request: Request) {
  if (!internalAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = await listApiKeys();
  return NextResponse.json({ keys });
}

// POST /api/developer/keys — create a new key
export async function POST(request: Request) {
  if (!rateLimit("developer-keys", clientIp(request), 3, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Key creation limit reached. Try again tomorrow or contact the team." },
      { status: 429 },
    );
  }

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
