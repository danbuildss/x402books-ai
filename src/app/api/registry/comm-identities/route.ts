import { NextRequest, NextResponse } from "next/server";
import { getCommIdentities, createCommIdentity } from "@/lib/registry-db";
import type { CommIdentityInput } from "@/lib/registry-db";

function auth(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  return secret && token === secret;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const agentName = req.nextUrl.searchParams.get("agent") ?? undefined;
  const result = await getCommIdentities(agentName);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as CommIdentityInput | null;
  if (!body?.agent_name || !body.platform || !body.handle || !body.confidence) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  const result = await createCommIdentity(body);
  return NextResponse.json(result, { status: result.ok ? 201 : 500 });
}
