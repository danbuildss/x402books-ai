// POST/GET /api/cron/snapshot-trust-scores — daily trust score snapshot.
//
// Computes the KYA assessment for every registry agent and records one row
// per agent per day in trust_score_history. Powers "Most Improved" and
// score trajectories on /trust. Internal auth — Luca's scheduler calls this.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { getRegistryAgents } from "@/lib/registry-db";
import { computeKya } from "@/lib/kya";
import { toSlug } from "@/app/registry/[slug]/slug";
import { dbError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function snapshot(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const sb = getSupabaseAdminClient();

  // Agents with behavioral data get the confidence bump, same as the API
  const { data: tdRows } = await sb.from("tool_decision_events").select("agent_id").limit(2000);
  const behavioral = new Set(((tdRows ?? []) as Array<{ agent_id: string }>).map((r) => r.agent_id));

  const { agents } = await getRegistryAgents();
  const today = new Date().toISOString().slice(0, 10);

  const rows = agents.map((agent) => {
    const slug = toSlug(agent.name);
    const kya = computeKya(agent, { hasToolDecisions: behavioral.has(slug) });
    return {
      agent_slug:          slug,
      agent_name:          agent.name,
      trust_score:         kya.trust_score,
      confidence:          kya.confidence,
      verification_status: kya.verification_status,
      risk_level:          kya.risk_level,
      recommendation:      kya.recommendation,
      snapshot_date:       today,
    };
  });

  const { error } = await sb
    .from("trust_score_history")
    .upsert(rows, { onConflict: "agent_slug,snapshot_date" });

  if (error) return dbError("cron/snapshot-trust-scores", error);

  return NextResponse.json({ ok: true, snapshot_date: today, agents: rows.length });
}

export async function GET(req: NextRequest)  { return snapshot(req); }
export async function POST(req: NextRequest) { return snapshot(req); }
