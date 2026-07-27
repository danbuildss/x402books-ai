import { NextRequest, NextResponse } from "next/server";
import { internalAuth as authOk } from "@/lib/internal-auth";
import { getRecentFailures, isPipelineStage, type PipelineStage } from "@/lib/pipeline-observability";

// GET /api/admin/registry pipeline failures — where the Bankr data pipeline
// fails, queryable so admin never sees a silent empty state (P5).
// Filters: ?stage= &resolved=true|false &agent=<slug> &limit=
export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const stageParam = url.searchParams.get("stage");
  const resolvedParam = url.searchParams.get("resolved");
  const agent = url.searchParams.get("agent") ?? undefined;
  const limitParam = url.searchParams.get("limit");

  const stage: PipelineStage | undefined =
    stageParam && isPipelineStage(stageParam) ? stageParam : undefined;
  const resolved = resolvedParam == null ? undefined : resolvedParam === "true";
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 200, 1), 500) : 200;

  try {
    const failures = await getRecentFailures({ stage, resolved, agentSlug: agent, limit });

    // Aggregate unresolved counts by stage for a quick overview.
    const byStage: Record<string, number> = {};
    for (const f of failures) {
      if (!f.resolved) byStage[f.stage] = (byStage[f.stage] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      failures,
      counts: { byStage, total: failures.length, unresolved: failures.filter((f) => !f.resolved).length },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/admin/pipeline-failures] error:", err);
    return NextResponse.json({ ok: false, failures: [], error: "Internal error" }, { status: 500 });
  }
}
