import { NextRequest, NextResponse } from "next/server";
import { updateCommIdentity, deleteCommIdentity } from "@/lib/registry-db";
import { internalAuth as auth } from "@/lib/internal-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  const result = await updateCommIdentity(id, patch);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteCommIdentity(id);
  return NextResponse.json(result);
}
