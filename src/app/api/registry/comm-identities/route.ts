import { NextRequest, NextResponse } from "next/server";
import { getCommIdentities, createCommIdentity } from "@/lib/registry-db";
import type { CommIdentityInput } from "@/lib/registry-db";
import { internalAuth as auth } from "@/lib/internal-auth";

const VALID_PLATFORMS = ["twitter", "x", "discord", "telegram", "github", "linkedin", "farcaster"] as const;

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const agentName = req.nextUrl.searchParams.get("agent") ?? undefined;
  const result = await getCommIdentities(agentName);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as CommIdentityInput | null;
  if (!body?.agent_name || !body.platform || !body.handle) {
    return NextResponse.json({ ok: false, error: "Missing required fields: agent_name, platform, handle" }, { status: 400 });
  }
  if (!VALID_PLATFORMS.includes(body.platform.toLowerCase() as typeof VALID_PLATFORMS[number])) {
    return NextResponse.json({ ok: false, error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` }, { status: 400 });
  }
  if (body.confidence === undefined || body.confidence === null) {
    return NextResponse.json({ ok: false, error: "confidence is required" }, { status: 400 });
  }
  if (typeof body.confidence !== "number" || body.confidence < 0 || body.confidence > 1) {
    return NextResponse.json({ ok: false, error: "confidence must be a number between 0 and 1" }, { status: 400 });
  }
  const result = await createCommIdentity(body);
  return NextResponse.json(result, { status: result.ok ? 201 : 500 });
}
