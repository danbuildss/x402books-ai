import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/v1/financial-intelligence/{slug}/compare?from=2026-07-01&to=2026-08-01
 *
 * Public. Returns two published snapshots and server-computed deltas.
 * Luca never computes his own deltas — this endpoint does the math.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  const { slug } = await params;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ ok: false, error: "from and to query params (YYYY-MM-DD period starts) are required" }, { status: 400 });

  try {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("financial_snapshots")
      .select("period_start, period_end, accounting_basis, metrics, evidence_coverage, data_completeness, integrity_hash, published_at")
      .eq("agent_slug", slug)
      .eq("status", "published")
      .in("period_start", [from, to])
      .order("period_start", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ ok: false, error: "No published snapshots for the requested periods" }, { status: 404 });

    const a = data.find((r) => r.period_start === from);
    const b = data.find((r) => r.period_start === to);
    if (!a || !b) {
      return NextResponse.json({ ok: false, error: "One or both requested periods have no published snapshot", available_periods: data.map((r) => r.period_start) }, { status: 404 });
    }

    const keys = ["recognizedRevenueUsd", "collectedRevenueUsd", "grossPaymentVolumeUsd", "unresolvedInflowsUsd", "directCostsUsd", "grossProfitUsd", "operatingExpensesUsd", "operatingProfitUsd", "refundsUsd", "otherIncomeUsd", "anomalyCount"] as const;
    const deltas: Record<string, { from: number; to: number; change: number; pct_change: number | null }> = {};
    for (const k of keys) {
      const av = Number((a.metrics as Record<string, unknown>)?.[k] ?? 0);
      const bv = Number((b.metrics as Record<string, unknown>)?.[k] ?? 0);
      deltas[k] = { from: av, to: bv, change: bv - av, pct_change: av !== 0 ? (bv - av) / av : null };
    }

    return NextResponse.json({
      ok: true,
      agent_slug: slug,
      comparable: a.accounting_basis === b.accounting_basis,
      basis: { from: a.accounting_basis, to: b.accounting_basis },
      periods: { from: { start: a.period_start, end: a.period_end, integrity_hash: a.integrity_hash }, to: { start: b.period_start, end: b.period_end, integrity_hash: b.integrity_hash } },
      deltas,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
