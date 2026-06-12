import { NextResponse } from "next/server";
import { revokeApiKey, getKeyUsage, keyBelongsTo } from "@/lib/api-keys";
import { getSessionCodeId } from "@/lib/access-auth";
import { internalAuth } from "@/lib/internal-auth";

// DELETE /api/developer/keys/:id — revoke a key (owner or admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (internalAuth(req)) {
    const ok = await revokeApiKey(id);
    if (!ok) return NextResponse.json({ error: "Could not revoke key." }, { status: 500 });
    return NextResponse.json({ revoked: true });
  }

  const codeId = getSessionCodeId(req);
  if (!codeId) {
    return NextResponse.json({ error: "Sign in to manage API keys." }, { status: 401 });
  }

  const ok = await revokeApiKey(id, codeId);
  if (!ok) return NextResponse.json({ error: "Key not found or not yours." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}

// GET /api/developer/keys/:id — recent usage log (owner or admin only)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!internalAuth(req)) {
    const codeId = getSessionCodeId(req);
    if (!codeId) {
      return NextResponse.json({ error: "Sign in to view key usage." }, { status: 401 });
    }
    if (!(await keyBelongsTo(id, codeId))) {
      return NextResponse.json({ error: "Key not found or not yours." }, { status: 404 });
    }
  }

  const usage = await getKeyUsage(id);
  return NextResponse.json({ usage });
}
