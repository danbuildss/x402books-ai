// GET /api/agent-anomalies/[slug]
// Returns active anomalies for an agent. Public — no auth required.
// Used by agent profile pages and the operator dashboard.

import { NextRequest, NextResponse } from "next/server";
import { getAnomaliesForAgent } from "@/lib/anomaly-detector";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const anomalies = await getAnomaliesForAgent(slug);
    return NextResponse.json({ ok: true, slug, anomalies });
  } catch {
    return NextResponse.json({ ok: true, slug, anomalies: [] });
  }
}
