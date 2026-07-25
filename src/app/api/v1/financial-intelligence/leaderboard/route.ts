import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";

const ALLOWED_METRICS = ["recognizedRevenueUsd", "collectedRevenueUsd", "grossPaymentVolumeUsd", "grossProfitUsd", "operatingProfitUsd"] as const;
type Metric = (typeof ALLOWED_METRICS)[number];

/**
 * GET /api/v1/financial-intelligence/leaderboard?metric=collectedRevenueUsd&period_end=2026-07-31&limit=25
 *
 * Public. Ranks agents by a published-snapshot metric with proof coverage on every row.
 * Defaults to the latest published period_end per agent if period_end is omitted.
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  const metric = (req.nextUrl.searchParams.get("metric") ?? "collectedRevenueUsd") as Metric;
  if (!ALLOWED_METRICS.includes(metric)) return NextResponse.json({ ok: false, error: `metric must be one of: ${ALLOWED_METRICS.join(", ")}` }, { status: 400 });
  const periodEnd = req.nextUrl.searchParams.get("period_end");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 25), 100);

  try {
    const sb = getSupabaseAdminClient();
    let query = sb
      .from("financial_snapshots")
      .select("agent_slug, period_start, period_end, accounting_basis, metrics, evidence_coverage, data_completeness, integrity_hash, published_at")
      .eq("status", "published")
      .order("period_end", { ascending: false });
    if (periodEnd) query = query.eq("period_end", periodEnd);

    const { data, error } = await query;
    if (error) throw error;

    // keep latest published snapshot per agent (rows already sorted by period_end desc)
    const latest = new Map<string, (typeof data)[number]>();
    for (const row of data ?? []) {
      if (!latest.has(row.agent_slug)) latest.set(row.agent_slug, row);
    }

    const rows = [...latest.values()]
      .map((r) => ({
        agent_slug: r.agent_slug,
        value: Number((r.metrics as Record<string, unknown>)?.[metric] ?? 0),
        period: { start: r.period_start, end: r.period_end },
        accounting_basis: r.accounting_basis,
        evidence_coverage: Number(r.evidence_coverage),
        data_completeness: Number(r.data_completeness),
        integrity_hash: r.integrity_hash,
      }))
      .sort((x, y) => y.value - x.value)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r }));

    return NextResponse.json({ ok: true, metric, period_end: periodEnd ?? "latest_per_agent", count: rows.length, rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
