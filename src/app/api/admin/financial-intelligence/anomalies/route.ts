import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/admin/financial-intelligence/anomalies?agent_slug=X&status=open
 *
 * Internal/operator-only. Review flags. Framing matters: these are "flagged for
 * review", never accusations of fraud.
 */
export async function GET(req: NextRequest) {
  if (!internalAuth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });

  const slug = req.nextUrl.searchParams.get("agent_slug");
  if (!slug) return NextResponse.json({ ok: false, error: "agent_slug is required" }, { status: 400 });
  const status = req.nextUrl.searchParams.get("status") ?? "open";

  try {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("financial_anomalies")
      .select("id, anomaly_type, severity, status, score, reason_codes, created_at")
      .eq("agent_slug", slug)
      .eq("status", status)
      .order("severity", { ascending: false })
      .order("score", { ascending: false })
      .limit(100);
    if (error) throw error;

    const bySeverity: Record<string, number> = {};
    for (const a of data ?? []) bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;

    return NextResponse.json({
      ok: true,
      agent_slug: slug,
      status,
      count: (data ?? []).length,
      by_severity: bySeverity,
      framing_note: "These are items flagged for review, not confirmed problems. Resolve by attaching commercial evidence or dismissing with a reason.",
      items: (data ?? []).map((a) => ({
        anomaly_id: a.id,
        type: a.anomaly_type,
        severity: a.severity,
        score: Number(a.score),
        reason_codes: a.reason_codes,
        flagged_at: a.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
