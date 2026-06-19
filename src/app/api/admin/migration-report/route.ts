// GET /api/admin/migration-report
//
// Recalculates all attributed agents using Revenue Classification v2
// and compares against the previous cached books (v1 methodology).
//
// Returns a migration report showing:
//   - Old revenue (from cache, v1 methodology)
//   - New revenue (freshly computed, v2 methodology)
//   - Difference and reason
//   - Confidence scores (new)
//
// This endpoint CLEARS the books cache before recomputing, so it forces
// a full Alchemy rescan. Do not call frequently — one run per sprint.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, invalidateBooksCache } from "@/lib/agent-books";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { AgentBooks } from "@/lib/agent-books";

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { agents } = await getRegistryAgents();
  const withWallets = agents.filter((a) => (a.wallets ?? []).length > 0);

  const period = "30d" as const;

  // Fetch old (v1) figures from DB cache BEFORE invalidating
  const oldBooks = new Map<string, { revenue: number; expenses: number; net_income: number }>();
  if (hasSupabaseAdminEnv()) {
    const sb = getSupabaseAdminClient();
    const slugs = withWallets.map((a) => toSlug(a.name));
    const { data } = await sb
      .from("agent_books_cache")
      .select("agent_slug, books_json")
      .in("agent_slug", slugs)
      .eq("period", period);
    for (const row of data ?? []) {
      const b = row.books_json as Record<string, unknown>;
      if (b?.attributed === true) {
        const f = b.financials as Record<string, number>;
        oldBooks.set(row.agent_slug as string, {
          revenue:    f.revenue_usd    ?? 0,
          expenses:   f.expenses_usd   ?? 0,
          net_income: f.net_income_usd ?? 0,
        });
      }
    }
  }

  // Invalidate caches and recompute with v2 methodology
  const results = [];
  for (const agent of withWallets) {
    const slug = toSlug(agent.name);
    await invalidateBooksCache(slug, period);
    const books = await buildAgentBooks(agent, period);

    if (!books.attributed) {
      results.push({
        agent: agent.name,
        slug,
        status: "unattributed",
        reason: books.reason,
      });
      continue;
    }

    const b = books as AgentBooks;
    const old = oldBooks.get(slug);

    const revenueDiff   = b.financials.revenue_usd - (old?.revenue ?? 0);
    const expensesDiff  = b.financials.expenses_usd - (old?.expenses ?? 0);
    const netIncomeDiff = b.financials.net_income_usd - (old?.net_income ?? 0);

    const reasons: string[] = [];
    if (b.classification.quarantined_inflows_usd > 0) {
      reasons.push(`$${b.classification.quarantined_inflows_usd.toFixed(2)} quarantined (${b.classification.quarantined_events.map((e) => e.reason).join(", ")})`);
    }
    if (b.classification.bridge_excluded_expense_usd > 0) {
      reasons.push(`$${b.classification.bridge_excluded_expense_usd.toFixed(2)} bridge expenses removed`);
    }
    if (b.classification.dex_excluded_usd > 0) {
      reasons.push(`$${b.classification.dex_excluded_usd.toFixed(2)} DEX swap flows excluded`);
    }
    if (reasons.length === 0) reasons.push("no change in classification");

    results.push({
      agent: agent.name,
      slug,
      status: "recomputed",
      wallets_analyzed: b.wallets.analyzed,
      old_revenue:   old?.revenue    ?? null,
      new_revenue:   b.financials.revenue_usd,
      revenue_diff:  Math.round(revenueDiff * 100) / 100,
      old_expenses:  old?.expenses   ?? null,
      new_expenses:  b.financials.expenses_usd,
      expenses_diff: Math.round(expensesDiff * 100) / 100,
      old_net_income:  old?.net_income  ?? null,
      new_net_income:  b.financials.net_income_usd,
      net_income_diff: Math.round(netIncomeDiff * 100) / 100,
      gross_inflow:    b.financials.gross_inflow_usd,
      quarantined_usd: b.classification.quarantined_inflows_usd,
      confidence: b.confidence,
      reason: reasons.join("; "),
    });
  }

  const recomputed  = results.filter((r) => r.status === "recomputed");
  const totalOldRev = recomputed.reduce((s, r) => s + (r.old_revenue ?? 0), 0);
  const totalNewRev = recomputed.reduce((s, r) => s + (r.new_revenue ?? 0), 0);
  const totalQuarantined = recomputed.reduce((s, r) => s + (r.quarantined_usd ?? 0), 0);

  return NextResponse.json({
    ok: true,
    period,
    methodology: "v2",
    summary: {
      agents_with_wallets: withWallets.length,
      agents_recomputed:   recomputed.length,
      agents_unattributed: results.length - recomputed.length,
      total_old_revenue:   Math.round(totalOldRev * 100) / 100,
      total_new_revenue:   Math.round(totalNewRev * 100) / 100,
      total_revenue_diff:  Math.round((totalNewRev - totalOldRev) * 100) / 100,
      total_quarantined:   Math.round(totalQuarantined * 100) / 100,
    },
    agents: results,
    generated_at: new Date().toISOString(),
  });
}
