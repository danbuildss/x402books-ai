// GET /api/v1/kya/[slug] — Know Your Agent trust check.
//
// The one call a counterparty makes before trusting an agent with money.
// Returns a trust decision: score, confidence, risk level, recommendation,
// and the evidence behind it. Advisory — the caller makes the decision.

import { NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { getToolDecisions } from "@/lib/tool-decisions";
import { computeKya } from "@/lib/kya";
import { toSlug } from "@/app/registry/[slug]/slug";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const started = Date.now();

  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const { slug: rawSlug } = await params;
  const slug = toSlug(rawSlug ?? "");

  if (!slug) {
    auth.finish(400, Date.now() - started, "/api/v1/kya");
    return NextResponse.json({ error: "Agent slug is required." }, { status: 400 });
  }

  const { agents } = await getRegistryAgents();
  const agent = agents.find((a) => toSlug(a.name) === slug);

  if (!agent) {
    auth.finish(404, Date.now() - started, "/api/v1/kya");
    return NextResponse.json(
      {
        error: `Agent "${slug}" not found in registry.`,
        hint: "Browse indexed agents at https://www.x402books.xyz/registry or submit a manifest to get indexed.",
      },
      { status: 404 },
    );
  }

  let hasToolDecisions = false;
  try {
    const decisions = await getToolDecisions(slug, 1);
    hasToolDecisions = decisions.length > 0;
  } catch {
    // behavioral data unavailable — confidence simply doesn't get the bump
  }

  const assessment = computeKya(agent, { hasToolDecisions });

  auth.finish(200, Date.now() - started, "/api/v1/kya");

  return NextResponse.json({
    agent: slug,
    name: agent.name,
    ecosystem: agent.ecosystem,
    ...assessment,
    advisory:
      "Advisory risk signal based on registry data. Not financial advice — the caller makes the decision.",
    profile: `https://www.x402books.xyz/registry/${slug}`,
    checked_at: new Date().toISOString(),
  });
}
