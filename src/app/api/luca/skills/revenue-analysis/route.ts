import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { buildAgentBooks, getAgentBySlug } from "@/lib/agent-books";
import { ledgerErrorResponse } from "@/lib/api-utils";
import type { TimeRange } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set<string>(["7d", "14d", "30d", "90d"]);

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca/skills/revenue-analysis";

  let body: { slug?: string; period?: string };
  try {
    body = await req.json() as { slug?: string; period?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase();
  if (!slug) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const period = (body.period ?? "30d") as TimeRange;
  if (!VALID_PERIODS.has(period)) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "period must be 7d, 14d, 30d, or 90d" }, { status: 400 });
  }

  try {
    const agent = await getAgentBySlug(slug);
    if (!agent) {
      auth.finish(404, Date.now() - start, endpoint);
      return NextResponse.json({ error: `Agent '${slug}' not found` }, { status: 404 });
    }

    const books = await buildAgentBooks(agent, period);

    if (!books.attributed) {
      auth.finish(200, Date.now() - start, endpoint);
      return NextResponse.json({
        skill: "revenue-analysis",
        agent: books.agent,
        period,
        attributed: false,
        reason: books.reason,
        message: books.message ?? null,
      });
    }

    const { financials, classification, confidence, breakdown } = books;

    const recognitionRate = financials.gross_inflow_usd > 0
      ? Math.round((financials.revenue_usd / financials.gross_inflow_usd) * 100)
      : 0;

    const excludedPct = 100 - recognitionRate;

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      skill: "revenue-analysis",
      agent: books.agent,
      period,
      attributed: true,
      wallets: books.wallets,
      revenue: {
        gross_inflow_usd: financials.gross_inflow_usd,
        operating_revenue_usd: financials.revenue_usd,
        quarantined_inflows_usd: classification.quarantined_inflows_usd,
        dex_excluded_usd: classification.dex_excluded_usd,
        revenue_recognition_rate_pct: recognitionRate,
        gross_inflow_is_not_revenue: true,
        note: excludedPct > 0
          ? `${excludedPct}% of gross inflows excluded (capital injections, DEX activity, or internal transfers)`
          : "All inflows recognized as operating revenue",
      },
      expenses: {
        total_usd: financials.expenses_usd,
        bridge_excluded_usd: classification.bridge_excluded_expense_usd,
        dex_excluded_usd: classification.dex_excluded_usd,
        net_income_usd: financials.net_income_usd,
        margin_pct: financials.margin_pct,
      },
      confidence,
      breakdown: {
        revenue_by_source: breakdown.revenue_by_source,
        expenses_by_category: breakdown.expenses_by_category,
        quarantined_events: classification.quarantined_events,
      },
      generated_at: books.generated_at,
    });
  } catch (error) {
    auth.finish(500, Date.now() - start, endpoint);
    return ledgerErrorResponse(error);
  }
}
