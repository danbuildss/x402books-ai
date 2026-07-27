// GET /api/v1/homepage-data
// Returns aggregated stats for the landing page.

import { NextResponse } from "next/server";
import { getAttributionMetrics } from "@/lib/attribution-health";
import { latestPublishedSnapshot } from "@/lib/financial-intelligence-db";
import { getAgentGDP } from "@/lib/agent-gdp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [metrics, gdpData] = await Promise.all([
      getAttributionMetrics(),
      getAgentGDP().catch(() => null),
    ]);

    const topAgentsBase = metrics.agents
      .filter((a) => a.attribution_tier === "manifest_attributed")
      .slice(0, 5);

    const topAgents = await Promise.all(
      topAgentsBase.map(async (a) => {
        const snapshot = await latestPublishedSnapshot(a.slug).catch(() => null);
        const revenue = snapshot?.metrics?.recognizedRevenueUsd ?? null;
        return {
          name: a.name,
          slug: a.slug,
          revenue_usd: revenue,
          ecosystem: a.ecosystem,
        };
      }),
    );

    return NextResponse.json({
      totalAgents: metrics.total_agents,
      attributed: metrics.manifest_attributed_agents,
      coveragePct: metrics.attribution_coverage_pct,
      manifestFiled: metrics.manifest_agents,
      topAgents,
      gdp: gdpData?.total_gdp_usd ?? null,
      expenses: gdpData?.total_expenses_usd ?? null,
      netIncome: gdpData?.net_income_usd ?? null,
      statusBreakdown: {
        manifest: metrics.status_breakdown.manifest,
        inferred: metrics.status_breakdown.inferred,
        none: metrics.status_breakdown.none,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load homepage data" },
      { status: 500 },
    );
  }
}
