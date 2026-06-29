import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

// PATCH /api/admin/registry/update-agent
// Body: { name: string; xHandle?: string; website?: string; symbol?: string }
// Updates profile metadata fields for an agent. Admin-authenticated only.
export async function PATCH(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  let body: { name?: string; xHandle?: string; website?: string; symbol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if ("xHandle" in body) updates.x_handle = body.xHandle?.trim() || null;
  if ("website" in body) updates.website = body.website?.trim() || null;
  if ("symbol" in body) updates.symbol = body.symbol?.trim() || null;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_agents")
    .update(updates)
    .eq("name", name)
    .select("name");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: `Agent "${name}" not found` }, { status: 404 });
  }

  return NextResponse.json({ ok: true, name, updated: updates });
}
