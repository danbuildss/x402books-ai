import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getAgentGDP } from "@/lib/agent-gdp";
import { generateEconomyReport } from "@/lib/luca-research";
import { saveReport, getReportBySlug } from "@/lib/research-db";

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({})) as { type?: string; force?: boolean };
    const type = (["weekly", "monthly", "quarterly"].includes(body.type ?? "")
      ? body.type
      : "weekly") as "weekly" | "monthly" | "quarterly";
    const force = body.force === true;

    const gdp = await getAgentGDP();
    const report = await generateEconomyReport(gdp, type);

    // Don't overwrite a same-day report unless forced
    if (!force) {
      const existing = await getReportBySlug(report.slug);
      if (existing) {
        return NextResponse.json({ ok: true, existing: true, slug: report.slug });
      }
    }

    const result = await saveReport({
      slug: report.slug,
      title: report.title,
      subtitle: report.subtitle,
      type: report.type,
      summary: report.summary,
      body: report.body,
      agent_gdp_usd: report.agent_gdp_usd,
      attributed_agents: report.attributed_agents,
      period_label: report.period_label,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug: report.slug, id: result.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
