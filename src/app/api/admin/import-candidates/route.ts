import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";
import { dbError } from "@/lib/api-utils";

// GET /api/admin/import-candidates?status=pending|approved|rejected
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const sb = getSupabaseAdminClient();
  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const { data, error } = await sb
    .from("registry_import_candidates")
    .select("id, ca, ticker, name, source, dune_data, status, admin_notes, created_at, reviewed_at")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return dbError("admin/import-candidates", error);
  return NextResponse.json({ candidates: data ?? [], count: (data ?? []).length });
}

// PATCH /api/admin/import-candidates
// Body: { id, status: "approved"|"rejected", admin_notes? }
// Approving automatically inserts the candidate into registry_agents as Candidate.
export async function PATCH(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = await req.json() as { id?: string; status?: string; admin_notes?: string };
  const { id, status, admin_notes } = body;

  if (!id || !["approved", "rejected"].includes(status ?? "")) {
    return NextResponse.json(
      { error: "id and status ('approved' | 'rejected') are required" },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdminClient();

  if (status === "approved") {
    const { data: candidate, error: fetchErr } = await sb
      .from("registry_import_candidates")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Insert into registry as a Candidate entry
    const { error: insertErr } = await sb.from("registry_agents").insert({
      name: candidate.name ?? candidate.ticker ?? candidate.ca,
      symbol: candidate.ticker ? `$${candidate.ticker.toUpperCase()}` : null,
      ecosystem: "BANKR",
      x_handle: "",
      token_address: candidate.ca,
      verification_status: "Candidate",
      treasury_health: "Pending",
      priority: 30,
      evidence_sources: ["Bankr/Dune import"],
      market_data: candidate.dune_data ?? null,
      last_dune_sync: new Date().toISOString(),
    });

    if (insertErr) {
      return dbError("admin/import-candidates", insertErr);
    }
  }

  const { error: updateErr } = await sb
    .from("registry_import_candidates")
    .update({
      status,
      admin_notes: admin_notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return dbError("admin/import-candidates", updateErr);
  return NextResponse.json({ ok: true });
}
