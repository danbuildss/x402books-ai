import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { dbError } from "@/lib/api-utils";

function authOk(req: NextRequest): boolean {
  const key = process.env.NIPMOD_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

// POST /api/nipmod/events — ingest a tool decision event from Nipmod
export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_id, package: pkg, source, trust_score, risk_level, decision, timestamp, project_id, decision_proof_hash } = body as {
    agent_id?: string;
    package?: string;
    source?: string;
    trust_score?: number;
    risk_level?: string;
    decision?: string;
    timestamp?: string;
    project_id?: string;
    decision_proof_hash?: string;
  };

  if (!agent_id || !pkg) {
    return NextResponse.json({ ok: false, error: "agent_id and package are required" }, { status: 400 });
  }

  const validRisk     = ["low", "medium", "high", "unknown"];
  const validDecision = ["install", "reject", "defer", "unknown"];

  // Normalize agent_id to lowercase slug so it matches registry profile URLs
  const normalizedAgentId = String(agent_id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Parse timestamp safely — fall back to now() if malformed
  let eventTime = new Date().toISOString();
  if (timestamp) {
    const parsed = new Date(String(timestamp));
    if (!isNaN(parsed.getTime())) eventTime = parsed.toISOString();
  }

  const row = {
    agent_id:            normalizedAgentId,
    package:             String(pkg),
    source:              source ? String(source) : null,
    trust_score:         typeof trust_score === "number" ? Math.min(100, Math.max(0, trust_score)) : null,
    risk_level:          risk_level && validRisk.includes(String(risk_level)) ? String(risk_level) : "unknown",
    decision:            decision && validDecision.includes(String(decision)) ? String(decision) : "unknown",
    event_time:          eventTime,
    project_id:          project_id ? String(project_id) : null,
    decision_proof_hash: decision_proof_hash ? String(decision_proof_hash) : null,
    raw:                 body,
  };

  if (!hasSupabaseAdminEnv()) {
    // Dev mode: log and return ok without persisting
    console.log("[nipmod] event received (no DB):", row);
    return NextResponse.json({ ok: true, event_id: "dev-mode" });
  }

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("tool_decision_events")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return dbError("nipmod/events", error);
  }

  return NextResponse.json({ ok: true, event_id: data.id });
}
