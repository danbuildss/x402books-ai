import { NextRequest, NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { getAgentGDP } from "@/lib/agent-gdp";
import { internalAuth as authOk } from "@/lib/internal-auth";
import type { Agent } from "@/app/registry/types";

// GET /api/admin/registry/agents
// Full Agent objects (internal CRM fields included) for admin tooling,
// enriched with revenue_usd from the GDP snapshot. Admin-authenticated only.
// Deliberately NOT scoped by the BANKR_ONLY flag — admin always sees every
// ecosystem.
export type AdminAgent = Agent & { revenue_usd: number };

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { agents, fromSupabase } = await getRegistryAgents();

    // Revenue enrichment is best-effort: a GDP failure must not take down
    // the admin CRM list.
    const revenueBySlug: Record<string, number> = {};
    try {
      const gdp = await getAgentGDP();
      for (const entry of gdp.all_attributed) {
        revenueBySlug[entry.slug] = entry.revenue_usd;
      }
    } catch (err) {
      console.error("[api/admin/registry/agents] GDP enrichment failed:", err);
    }

    const enriched: AdminAgent[] = agents.map((a) => ({
      ...a,
      revenue_usd: revenueBySlug[a.slug] ?? 0,
    }));

    return NextResponse.json({ ok: true, agents: enriched, fromSupabase });
  } catch (err) {
    console.error("[api/admin/registry/agents] error:", err);
    return NextResponse.json({ ok: false, agents: [], error: "Internal error" }, { status: 500 });
  }
}
