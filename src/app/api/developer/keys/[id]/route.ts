import { NextResponse } from "next/server";
import { revokeApiKey, getKeyUsage, keyBelongsTo } from "@/lib/api-keys";
import { internalAuth } from "@/lib/internal-auth";
import { getSessionCodeId } from "@/lib/access-auth";

// Owner-or-admin: sessions can act on their own keys; the admin bearer on any.

// DELETE /api/developer/keys/:id — revoke a key
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (internalAuth(req)) {
    const ok = await revokeApiKey(id);
    if (!ok) return NextResponse.json({ error: "Could not revoke key." }, { status: 500 });
    return NextResponse.json({ revoked: true });
  }

  const codeId = getSessionCodeId(req);
  if (!codeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ok = await revokeApiKey(id, codeId);
  if (!ok) return NextResponse.json({ error: "Could not revoke key." }, { status: 500 });
  return NextResponse.json({ revoked: true });
}

// GET /api/developer/keys/:id — recent usage log
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!internalAuth(req)) {
    const codeId = getSessionCodeId(req);
    if (!codeId || !(await keyBelongsTo(id, codeId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const usage = await getKeyUsage(id);
  return NextResponse.json({ usage });
}
