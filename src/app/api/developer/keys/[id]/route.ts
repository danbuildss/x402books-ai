import { NextResponse } from "next/server";
import { revokeApiKey, getKeyUsage } from "@/lib/api-keys";

// DELETE /api/developer/keys/:id — revoke a key
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await revokeApiKey(id);
  if (!ok) return NextResponse.json({ error: "Could not revoke key." }, { status: 500 });
  return NextResponse.json({ revoked: true });
}

// GET /api/developer/keys/:id/usage — recent usage log
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usage = await getKeyUsage(id);
  return NextResponse.json({ usage });
}
