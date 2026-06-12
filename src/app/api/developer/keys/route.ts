import { NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { getSessionCodeId } from "@/lib/access-auth";
import { internalAuth } from "@/lib/internal-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/developer/keys — list keys.
// Session → only that session's keys. Admin bearer → all keys. Neither → 401.
export async function GET(request: Request) {
  if (internalAuth(request)) {
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  }

  const codeId = getSessionCodeId(request);
  if (!codeId) {
    return NextResponse.json({ error: "Sign in to manage API keys." }, { status: 401 });
  }

  const keys = await listApiKeys(codeId);
  return NextResponse.json({ keys });
}

// POST /api/developer/keys — create a new key (session required)
export async function POST(request: Request) {
  const codeId = getSessionCodeId(request);
  if (!codeId) {
    return NextResponse.json({ error: "Sign in to create API keys." }, { status: 401 });
  }

  if (!rateLimit("create-key", clientIp(request), 3, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Key creation limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json() as { name?: unknown };
    const name = String(body.name ?? "Default").trim().slice(0, 64);

    const result = await createApiKey(name, codeId);
    if (!result) {
      return NextResponse.json({ error: "Could not create API key." }, { status: 500 });
    }

    // Return the raw key only once — it is not stored and cannot be retrieved again
    return NextResponse.json({ key: result.key, record: result.record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
