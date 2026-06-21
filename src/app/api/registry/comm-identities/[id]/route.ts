import { NextRequest, NextResponse } from "next/server";
import { updateCommIdentity, deleteCommIdentity } from "@/lib/registry-db";
import { internalAuth as auth } from "@/lib/internal-auth";

const VALID_PLATFORMS = ["twitter", "x", "discord", "telegram", "github", "linkedin", "farcaster"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const patch = await req.json().catch(() => null);
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
  }
  if ("platform" in patch && !VALID_PLATFORMS.includes(String(patch.platform).toLowerCase())) {
    return NextResponse.json({ ok: false, error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` }, { status: 400 });
  }
  if ("confidence" in patch && (typeof patch.confidence !== "number" || patch.confidence < 0 || patch.confidence > 1)) {
    return NextResponse.json({ ok: false, error: "confidence must be a number between 0 and 1." }, { status: 400 });
  }
  const result = await updateCommIdentity(id, patch);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteCommIdentity(id);
  return NextResponse.json(result);
}
