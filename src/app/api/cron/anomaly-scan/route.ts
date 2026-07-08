// GET /api/cron/anomaly-scan
// Daily cron — runs anomaly detection across all registry agents that have books.
// Called by Luca (Hermes VPS scheduler). Protected by CRON_SECRET header.
// Suggested schedule: daily at 06:00 UTC.

import { NextRequest, NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { analyzeAgentAnomalies } from "@/lib/anomaly-detector";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min ceiling

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const start = Date.now();
  let processed = 0;
  let totalAnomalies = 0;
  const errors: string[] = [];

  try {
    const { agents } = await getRegistryAgents();

    for (const agent of agents) {
      const slug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      try {
        const anomalies = await analyzeAgentAnomalies(slug);
        totalAnomalies += anomalies.length;
        processed++;
      } catch (e) {
        errors.push(`${slug}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Registry fetch failed.", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    processed,
    total_anomalies: totalAnomalies,
    duration_ms: Date.now() - start,
    errors: errors.length > 0 ? errors : undefined,
  });
}
