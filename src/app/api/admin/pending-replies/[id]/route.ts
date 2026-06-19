import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

// PATCH /api/admin/pending-replies/[id]
// action: "approve" | "reject" | "post"
// body:   { action, reviewer_notes?, edited_reply? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { action, reviewer_notes, edited_reply } =
    body as { action?: string; reviewer_notes?: string; edited_reply?: string };

  if (action !== "approve" && action !== "reject" && action !== "post") {
    return NextResponse.json({ ok: false, error: "action must be approve, reject, or post" }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: true });

  const sb = getSupabaseAdminClient();

  if (action === "approve") {
    // Fetch current record for learning loop
    const { data: current } = await sb
      .from("luca_pending_replies")
      .select("question, draft_reply, recommendation")
      .eq("id", id)
      .single();

    const finalReply = edited_reply?.trim() || current?.draft_reply;

    const update: Record<string, unknown> = {
      status:         "approved",
      reviewer_notes: reviewer_notes ? String(reviewer_notes) : null,
      reviewed_at:    new Date().toISOString(),
    };
    if (edited_reply?.trim()) update.draft_reply = edited_reply.trim();

    const { error } = await sb.from("luca_pending_replies").update(update).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Save to learning examples (best-effort — don't fail the approve if this errors)
    const question = current?.question;
    if (question && finalReply) {
      const tier = extractTier(current?.recommendation ?? "");
      await sb.from("luca_reply_examples")
        .insert({ question, reply: finalReply, tier, source_id: id })
        .then(() => {});
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await sb.from("luca_pending_replies").update({
      status:         "rejected",
      reviewer_notes: reviewer_notes ? String(reviewer_notes) : null,
      reviewed_at:    new Date().toISOString(),
    }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // action === "post"
  const { error } = await sb.from("luca_pending_replies").update({
    status:    "posted",
    posted_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function extractTier(recommendation: string): string {
  if (recommendation.startsWith("[Analyst Read]")) return "analyst_read";
  if (recommendation.startsWith("[Full Report]"))  return "full_report";
  return "fast_read";
}
