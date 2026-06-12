import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

// GET /api/registry/submissions?status=pending
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("agent_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, submissions: data ?? [] });
}
