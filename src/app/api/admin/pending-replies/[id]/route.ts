import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

function authOk(req: NextRequest): boolean {
  const token  = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  return !!secret && token === secret;
}

// PATCH /api/admin/pending-replies/[id] — approve or reject a pending reply
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { action, reviewer_notes } = body as { action?: string; reviewer_notes?: string };
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ ok: false, error: "action must be approve or reject" }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: true });

  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("luca_pending_replies")
    .update({
      status:         action === "approve" ? "approved" : "rejected",
      reviewer_notes: reviewer_notes ? String(reviewer_notes) : null,
      reviewed_at:    new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
