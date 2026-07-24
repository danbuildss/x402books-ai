import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });

  const body = await req.json() as Record<string, unknown>;
  for (const key of ["agent_slug", "event_type", "external_id", "occurred_at", "chain", "tx_hash"]) {
    if (!body[key]) return NextResponse.json({ ok: false, error: `${key} is required` }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: action, error: actionError } = await supabase.from("economic_actions").select("id,gross_amount_usd").eq("agent_slug", body.agent_slug).eq("chain", body.chain).eq("tx_hash", body.tx_hash).maybeSingle();
  if (actionError || !action) return NextResponse.json({ ok: false, error: actionError?.message ?? "Economic action not found; run processing first" }, { status: 404 });

  const { data: commercial, error: commercialError } = await supabase.from("commercial_events").upsert({ agent_slug: body.agent_slug, event_type: body.event_type, external_id: body.external_id, customer_ref: body.customer_ref ?? null, service_ref: body.service_ref ?? null, amount_usd: body.amount_usd ?? action.gross_amount_usd, status: body.status ?? "created", occurred_at: body.occurred_at, delivered_at: body.delivered_at ?? null, evidence: body.evidence ?? [], metadata: body.metadata ?? {} }, { onConflict: "agent_slug,event_type,external_id" }).select("id").single();
  if (commercialError) return NextResponse.json({ ok: false, error: commercialError.message }, { status: 500 });

  const { error: allocationError } = await supabase.from("payment_allocations").upsert({ action_id: action.id, commercial_event_id: commercial.id, amount_usd: body.amount_usd ?? action.gross_amount_usd, match_method: "explicit_tx_reference", match_confidence: "deterministic", evidence_basis: "commercial_record" }, { onConflict: "action_id,commercial_event_id" });
  if (allocationError) return NextResponse.json({ ok: false, error: allocationError.message }, { status: 500 });

  return NextResponse.json({ ok: true, commercial_event_id: commercial.id, action_id: action.id });
}
