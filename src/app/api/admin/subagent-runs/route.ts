import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

// GET /api/admin/subagent-runs — list recent runs (last 100)
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: true, runs: [] });

  const subagent = new URL(req.url).searchParams.get("subagent");
  const sb = getSupabaseAdminClient();

  let query = sb
    .from("luca_subagent_runs")
    .select("id, subagent_name, status, started_at, finished_at, duration_ms, summary, error, triggered_by")
    .order("started_at", { ascending: false })
    .limit(100);

  if (subagent) query = query.eq("subagent_name", subagent);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, runs: data ?? [] });
}

// POST /api/admin/subagent-runs — log a new run (called by Hermes)
export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { subagent_name, status, started_at, finished_at, duration_ms, summary, result, error: runError, triggered_by } = body as Record<string, unknown>;
  if (!subagent_name || !status) return NextResponse.json({ ok: false, error: "subagent_name and status required" }, { status: 400 });

  const validStatus = ["running", "success", "failed", "timeout"];
  if (!validStatus.includes(String(status))) return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });

  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: true, id: "dev-mode" });

  const sb = getSupabaseAdminClient();
  const { data, error: dbErr } = await sb
    .from("luca_subagent_runs")
    .insert({
      subagent_name: String(subagent_name),
      status:        String(status),
      started_at:    started_at ? String(started_at) : new Date().toISOString(),
      finished_at:   finished_at ? String(finished_at) : null,
      duration_ms:   typeof duration_ms === "number" ? duration_ms : null,
      summary:       summary ? String(summary) : null,
      result:        result ?? null,
      error:         runError ? String(runError) : null,
      triggered_by:  triggered_by ? String(triggered_by) : null,
    })
    .select("id")
    .single();

  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
