import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

function authOk(req: NextRequest): boolean {
  const token  = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  return !!secret && token === secret;
}

// GET /api/admin/pending-replies — list replies; ?status=pending (default) | all
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: true, replies: [] });

  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const sb = getSupabaseAdminClient();

  let query = sb
    .from("luca_pending_replies")
    .select("id, target_user, target_post_url, target_post_id, draft_reply, risk_level, recommendation, status, reviewer_notes, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, replies: data ?? [] });
}

// POST /api/admin/pending-replies — Luca queues a draft reply
export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { target_user, target_post_url, target_post_id, draft_reply, risk_level, recommendation } = body as Record<string, unknown>;
  if (!draft_reply) return NextResponse.json({ ok: false, error: "draft_reply is required" }, { status: 400 });

  const validRisk = ["low", "medium", "high"];

  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: true, id: "dev-mode" });

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("luca_pending_replies")
    .insert({
      target_user:     target_user     ? String(target_user)     : null,
      target_post_url: target_post_url ? String(target_post_url) : null,
      target_post_id:  target_post_id  ? String(target_post_id)  : null,
      draft_reply:     String(draft_reply),
      risk_level:      risk_level && validRisk.includes(String(risk_level)) ? String(risk_level) : "medium",
      recommendation:  recommendation  ? String(recommendation)  : null,
      status:          "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
