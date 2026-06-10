import { NextResponse } from "next/server";
import { revokeApiKey, getKeyUsage } from "@/lib/api-keys";
import { internalAuth } from "@/lib/internal-auth";

// Key IDs are enumerable via the (admin-gated) list endpoint, so revocation
// and usage must be admin-only until keys are bound to owner sessions.

// DELETE /api/developer/keys/:id — revoke a key (admin)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!internalAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await revokeApiKey(id);
  if (!ok) return NextResponse.json({ error: "Could not revoke key." }, { status: 500 });
  return NextResponse.json({ revoked: true });
}

// GET /api/developer/keys/:id/usage — recent usage log (admin)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!internalAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const usage = await getKeyUsage(id);
  return NextResponse.json({ usage });
}
