import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

// POST /api/admin/registry/delete-agent
// Body: { name: string }
// Deletes a registry_agents row and its wallet rows by exact agent name.
// Admin-authenticated only.
export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();

  const { error: walletError } = await sb
    .from("registry_agent_wallets")
    .delete()
    .eq("agent_name", name);

  if (walletError) {
    return NextResponse.json({ ok: false, error: walletError.message }, { status: 500 });
  }

  const { error: agentError, count } = await sb
    .from("registry_agents")
    .delete({ count: "exact" })
    .eq("name", name);

  if (agentError) {
    return NextResponse.json({ ok: false, error: agentError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0, name });
}
