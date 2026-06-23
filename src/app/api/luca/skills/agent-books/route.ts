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
  const endpoint = "/api/luca/skills/agent-books";

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
      return NextResponse.json(
        { error: `Agent '${slug}' not found. Use registry-check skill to find the correct slug.` },
        { status: 404 },
      );
    }

    const books = await buildAgentBooks(agent, period);
    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({ skill: "agent-books", ...books });
  } catch (error) {
    auth.finish(500, Date.now() - start, endpoint);
    return ledgerErrorResponse(error);
  }
}
