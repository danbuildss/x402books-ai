// GET /api/registry/status?ref=XXXXXXXX
// Public endpoint — returns submission status by 8-char reference ID.
// Checks agent_submissions first, then registry_pending_updates.
// Never exposes wallet addresses or sensitive data.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const STATUS_LABELS: Record<string, string> = {
  pending:  "Under review",
  reviewed: "Reviewed",
  approved: "Approved",
  rejected: "Not approved",
};

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim().toUpperCase();

  if (!ref || !/^[0-9A-F]{8}$/i.test(ref)) {
    return NextResponse.json({ ok: false, error: "Invalid reference ID. Expected 8 characters." }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Registry unavailable." }, { status: 503 });
  }

  const sb = getSupabaseAdminClient();
  const refLower = ref.toLowerCase();

  // Check agent_submissions first (manual submit flow)
  const { data: submission } = await sb
    .from("agent_submissions")
    .select("id, agent_name, status, created_at")
    .ilike("id::text", `${refLower}%`)
    .limit(1)
    .single();

  if (submission) {
    return NextResponse.json({
      ok: true,
      ref,
      source: "submission",
      agent_name: submission.agent_name,
      status: submission.status,
      status_label: STATUS_LABELS[submission.status] ?? submission.status,
      submitted_at: submission.created_at,
    });
  }

  // Fall back to registry_pending_updates (manifest flow)
  const { data: pending } = await sb
    .from("registry_pending_updates")
    .select("id, agent_name, status, created_at")
    .ilike("id::text", `${refLower}%`)
    .limit(1)
    .single();

  if (pending) {
    return NextResponse.json({
      ok: true,
      ref,
      source: "manifest",
      agent_name: pending.agent_name,
      status: pending.status,
      status_label: STATUS_LABELS[pending.status] ?? pending.status,
      submitted_at: pending.created_at,
    });
  }

  return NextResponse.json({ ok: false, error: "Reference not found." }, { status: 404 });
}
