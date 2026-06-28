// POST /api/admin/registry/outreach-status
// Directly update outreach_status on a registry agent.
// Protected by internalAuth (ZETTA_INTERNAL_SECRET or session token).

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const VALID_STATUSES = ["Not started", "In progress", "Connected"] as const;
type OutreachStatus = (typeof VALID_STATUSES)[number];

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, status } = body as { slug?: string; status?: string };

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
  }

  if (!status || !VALID_STATUSES.includes(status as OutreachStatus)) {
    return NextResponse.json(
      { ok: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("registry_agents")
    .update({ outreach_status: status, updated_at: new Date().toISOString() })
    .eq("slug", slug.trim().toLowerCase());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug: slug.trim().toLowerCase(), status });
}
