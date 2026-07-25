import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv, getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/admin/financial-intelligence/unresolved?agent_slug=X&limit=10
 *
 * Internal/operator-only. Top unresolved/candidate economic actions — what still
 * needs commercial evidence. No private payloads: amounts, dates, counterparty
 * type, reason codes only.
 */
export async function GET(req: NextRequest) {
  if (!internalAuth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });

  const slug = req.nextUrl.searchParams.get("agent_slug");
  if (!slug) return NextResponse.json({ ok: false, error: "agent_slug is required" }, { status: 400 });
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 50);

  try {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("economic_actions")
      .select("id, action_type, chain, tx_hash, gross_amount_usd, occurred_at, reconstruction_confidence, reason_codes, counterparty")
      .eq("agent_slug", slug)
      .in("action_type", ["direct_payment", "unknown"])
      .eq("status", "finalized")
      .order("gross_amount_usd", { ascending: false })
      .limit(limit);
    if (error) throw error;

    // keep only actions that have no recognized journal (still unresolved/candidate)
    const items: Array<Record<string, unknown>> = [];
    for (const action of data ?? []) {
      const { data: journals } = await sb
        .from("financial_journals")
        .select("recognition_status")
        .eq("action_id", action.id)
        .eq("status", "posted")
        .limit(1);
      const status = journals?.[0]?.recognition_status;
      if (status === "recognized") continue;
      items.push({
        action_id: action.id,
        action_type: action.action_type,
        amount_usd: Number(action.gross_amount_usd),
        occurred_at: action.occurred_at,
        chain: action.chain,
        tx_hash: action.tx_hash,
        recognition_status: status ?? "unresolved",
        confidence: action.reconstruction_confidence,
        reason_codes: action.reason_codes,
        counterparty_known: Boolean(action.counterparty),
      });
    }

    return NextResponse.json({ ok: true, agent_slug: slug, count: items.length, total_unresolved_usd: items.reduce((s, i) => s + Number(i.amount_usd), 0), items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
