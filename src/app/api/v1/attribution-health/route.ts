// GET /api/v1/attribution-health
// Public — returns platform-wide attribution metrics and per-agent health.

import { NextResponse } from "next/server";
import { getAttributionMetrics } from "@/lib/attribution-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await getAttributionMetrics();
  return NextResponse.json({ ok: true, ...metrics });
}
