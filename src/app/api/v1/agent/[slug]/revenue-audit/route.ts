// GET /api/v1/agent/[slug]/revenue-audit?period=30d
// Returns the full transaction-level revenue audit for a single agent.
// Protected by X402BOOKS_INTERNAL_SECRET — admin/AEON use only.
// Classification logic is read-only. No DB writes.

import { NextRequest, NextResponse } from "next/server";
import { getAgentBySlug, buildAgentBooksAudit } from "@/lib/agent-books";
import type { TimeRange } from "@/lib/ledger";

const VALID_PERIODS: TimeRange[] = ["7d", "14d", "30d", "90d"];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const secret = req.headers.get("x-internal-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.X402BOOKS_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const raw = req.nextUrl.searchParams.get("period") ?? "30d";
  const period = (VALID_PERIODS.includes(raw as TimeRange) ? raw : "30d") as TimeRange;

  const agent = await getAgentBySlug(slug);
  if (!agent) {
    return NextResponse.json({ error: `Agent "${slug}" not found in registry.` }, { status: 404 });
  }

  const audit = await buildAgentBooksAudit(agent, period);
  return NextResponse.json(audit);
}
