import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// GET /api/registry/claim-status?agent=[slug]
// Public — returns sanitized pending updates for an agent (no luca_notes / proposed_data)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("agent")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "agent param is required" }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ found: false, pending: [] });
  }

  const sb = getSupabaseAdminClient();

  // Resolve canonical agent name by slug
  const { data: agentRows } = await sb
    .from("registry_agents")
    .select("name")
    .limit(300);

  const match = (agentRows ?? []).find(
    (r: { name: string }) => toSlug(r.name) === slug,
  );

  if (!match) {
    return NextResponse.json({ found: false, pending: [] });
  }

  const { data, error } = await sb
    .from("registry_pending_updates")
    .select("id, update_type, status, created_at, diff_summary")
    .eq("agent_name", match.name)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updates = (data ?? []).map((row) => ({
    id:           row.id,
    type:         row.update_type,
    status:       row.status,
    submitted_at: row.created_at,
    summary:      row.diff_summary,
  }));

  return NextResponse.json(
    { found: true, agent: match.name, pending: updates },
    { headers: { "Cache-Control": "no-store" } },
  );
}
