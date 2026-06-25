// GET /api/v1/luca/economy — Luca's primary intelligence feed.
//
// Returns everything Luca needs to write a report or answer a financial
// question about the agent economy in a single call:
//   - Agent GDP aggregate (30d)
//   - All attributed agents with full books
//   - Top revenue agents ranked
//   - Attribution gap (unattributed count)
//   - Latest research report slug (so Luca knows what's already published)
//
// Auth: Luca API key (2000/day tier) or internal secret.
// Cache: 10 minutes (books are already cached; this adds one layer on top).

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getLatestReport } from "@/lib/research-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/v1/luca/economy";

  try {
    let gdp: Awaited<ReturnType<typeof getAgentGDP>>;
    let isLive = true;
    let dataWarning: string | undefined;

    try {
      gdp = await getAgentGDP();
      // If registry has agents but none are attributed, DB is likely unreachable
      if (gdp.total_agents > 0 && gdp.attributed_agents === 0) {
        isLive = false;
        dataWarning = "No attributed agents found. Financial data may be unavailable — check Supabase connectivity.";
      }
    } catch {
      isLive = false;
      dataWarning = "Economy data unavailable right now.";
      gdp = { total_revenue_usd: 0, total_expenses_usd: 0, total_net_income_usd: 0, attributed_agents: 0, attributed_wallets: 0, total_agents: 0, erc8004_agents: 0, awaiting_manifest: [], all_attributed: [], top_agents: [], generated_at: new Date().toISOString() };
    }

    const latestReport = await getLatestReport().catch(() => null);

    const payload = {
      generated_at: new Date().toISOString(),

      // Economy aggregate
      economy: {
        total_revenue_usd:    gdp.total_revenue_usd,
        total_expenses_usd:   gdp.total_expenses_usd,
        total_net_income_usd: gdp.total_net_income_usd,
        attributed_agents:    gdp.attributed_agents,
        total_agents:         gdp.total_agents,
        attribution_gap:      gdp.total_agents - gdp.attributed_agents,
        period: "30d",
        is_live: isLive,
        ...(dataWarning ? { warning: dataWarning } : {}),
      },

      // All attributed agents ranked by revenue
      agents: gdp.all_attributed.map((a) => ({
        name:            a.name,
        slug:            a.slug,
        ecosystem:       a.ecosystem,
        revenue_usd:     a.revenue_usd,
        expenses_usd:    a.expenses_usd,
        net_income_usd:  a.net_income_usd,
        tx_count:        a.tx_count,
        profitable:      a.net_income_usd > 0,
        profile_url:     `https://www.zettaai.co/registry/${a.slug}`,
      })),

      // Top 3 for quick reference
      top_agents: gdp.all_attributed.slice(0, 3),

      // Latest published report (so Luca doesn't duplicate)
      last_report: latestReport
        ? {
            slug:         latestReport.slug,
            title:        latestReport.title,
            type:         latestReport.type,
            published_at: latestReport.published_at,
            url:          `https://www.zettaai.co/research/${latestReport.slug}`,
          }
        : null,

      // Luca's action endpoints (so he has them in context)
      _meta: {
        generate_report:  "POST /api/admin/research/generate  (use ZETTA_INTERNAL_SECRET)",
        agent_books:      "GET /api/v1/agent-books/[slug]?range=30d",
        this_endpoint:    "GET /api/v1/luca/economy",
        leaderboard_url:  "https://www.zettaai.co/leaderboard",
        research_url:     "https://www.zettaai.co/research",
      },
    };

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json(payload);
  } catch (e) {
    auth.finish(500, Date.now() - start, endpoint);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
