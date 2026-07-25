// GET /api/v1/agent/[slug]/financial-summary
// Public — returns truth engine financial summary for an agent.
// Falls back to null if no wallet claims or manifest exists.

import { NextRequest, NextResponse } from "next/server";
import { getAgentFinancialSummary } from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const agentSlug = slug.toLowerCase().trim();

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: true, summary: null });
  }

  try {
    const summary = await getAgentFinancialSummary(agentSlug);
    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ ok: true, summary: null });
  }
}
