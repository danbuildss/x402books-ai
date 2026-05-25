import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function authOk(req: NextRequest): boolean {
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) return false;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  return token === secret;
}

// PATCH /api/registry/submissions/[id]
// body: { status: "approved" | "rejected", admin_notes?: string }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { status: string; admin_notes?: string };

  if (!["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ ok: false, error: "status must be approved or rejected" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("agent_submissions")
    .update({ status: body.status, admin_notes: body.admin_notes ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
