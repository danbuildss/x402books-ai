import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/admin/financial-intelligence/revenue-quality?agent_slug=X&period_start=&period_end=
 *
 * Internal/operator-only. Evidence-grade breakdown (A→U) of recognized + candidate
 * revenue over the period, sourced from posted journals.
 */
export async function GET(req: NextRequest) {
  if (!internalAuth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });

  const slug = req.nextUrl.searchParams.get("agent_slug");
  const periodStart = req.nextUrl.searchParams.get("period_start");
  const periodEnd = req.nextUrl.searchParams.get("period_end");
  if (!slug || !periodStart || !periodEnd) return NextResponse.json({ ok: false, error: "agent_slug, period_start, and period_end are required" }, { status: 400 });

  try {
    const sb = getSupabaseAdminClient();
    const { data: journals, error } = await sb
      .from("financial_journals")
      .select("id, journal_type, recognition_status, evidence_grade, status")
      .eq("agent_slug", slug)
      .eq("status", "posted")
      .gte("recognition_date", periodStart)
      .lte("recognition_date", periodEnd);
    if (error) throw error;

    const journalIds = (journals ?? []).map((j) => j.id);
    const { data: lines, error: lineError } = journalIds.length
      ? await sb.from("financial_journal_lines").select("journal_id, account_code, debit_usd, credit_usd").in("journal_id", journalIds)
      : { data: [] as Array<{ journal_id: string; account_code: string; debit_usd: number; credit_usd: number }>, error: null };
    if (lineError) throw lineError;

    const amountByJournal = new Map<string, number>();
    for (const line of lines ?? []) {
      // revenue-recognition amount = sum of credits to revenue accounts (4xxx)
      if (String(line.account_code).startsWith("4")) {
        amountByJournal.set(line.journal_id, (amountByJournal.get(line.journal_id) ?? 0) + Number(line.credit_usd));
      }
    }

    const grades = ["A", "B", "C", "D", "U"] as const;
    const byGrade: Record<string, { journals: number; amount_usd: number }> = {};
    for (const g of grades) byGrade[g] = { journals: 0, amount_usd: 0 };

    let recognized = 0;
    let unresolvedOrCandidate = 0;
    for (const j of journals ?? []) {
      const amount = amountByJournal.get(j.id) ?? 0;
      byGrade[j.evidence_grade].journals++;
      byGrade[j.evidence_grade].amount_usd += amount;
      if (j.recognition_status === "recognized") recognized += amount;
      if (j.recognition_status === "candidate" || j.recognition_status === "unresolved") unresolvedOrCandidate += amount;
    }

    const verifiedUsd = byGrade.A.amount_usd + byGrade.B.amount_usd;
    const total = grades.reduce((s, g) => s + byGrade[g].amount_usd, 0);

    return NextResponse.json({
      ok: true,
      agent_slug: slug,
      period: { start: periodStart, end: periodEnd },
      totals: {
        recognized_revenue_usd: recognized,
        unresolved_or_candidate_usd: unresolvedOrCandidate,
        verified_usd: verifiedUsd,
        verified_pct: total > 0 ? verifiedUsd / total : 0,
        journal_count: (journals ?? []).length,
      },
      by_evidence_grade: byGrade,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
