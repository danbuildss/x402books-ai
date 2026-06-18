// GET /api/admin/attribution — per-agent attribution status for the admin dashboard.
// Returns every indexed agent with their current attribution state, wallet count,
// cached books quality, and last refresh timestamp.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { toSlug } from "@/app/registry/[slug]/slug";

export type AttributionEntry = {
  name: string;
  slug: string;
  ecosystem: string;
  wallets_declared: number;
  attributed: boolean | null;
  reason: string | null;
  revenue_usd: number | null;
  expenses_usd: number | null;
  tx_count: number | null;
  last_refresh: string | null;
};

export type AttributionResponse = {
  ok: boolean;
  total_indexed: number;
  total_attributed: number;
  total_unattributed_with_wallets: number;
  total_no_wallets: number;
  agents: AttributionEntry[];
  generated_at: string;
};

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { agents } = await getRegistryAgents();

  // Fetch all cached books rows in one query
  let cacheRows: Record<string, { books_json: Record<string, unknown>; computed_at: string }> = {};
  if (hasSupabaseAdminEnv()) {
    const sb = getSupabaseAdminClient();
    const { data } = await sb
      .from("agent_books_cache")
      .select("agent_slug, books_json, computed_at")
      .eq("period", "30d");
    if (data) {
      for (const row of data) {
        cacheRows[row.agent_slug] = { books_json: row.books_json, computed_at: row.computed_at };
      }
    }
  }

  const entries: AttributionEntry[] = agents.map((agent) => {
    const slug = toSlug(agent.name);
    const walletsCount = (agent.wallets ?? []).length;
    const cached = cacheRows[slug];

    let attributed: boolean | null = null;
    let reason: string | null = null;
    let revenue_usd: number | null = null;
    let expenses_usd: number | null = null;
    let tx_count: number | null = null;
    let last_refresh: string | null = null;

    if (cached) {
      const books = cached.books_json as { attributed?: boolean; reason?: string; financials?: { revenue_usd?: number; expenses_usd?: number; tx_count?: number } };
      attributed = books.attributed ?? null;
      reason = books.attributed === false ? (books.reason ?? null) : null;
      if (books.attributed && books.financials) {
        revenue_usd = books.financials.revenue_usd ?? null;
        expenses_usd = books.financials.expenses_usd ?? null;
        tx_count = books.financials.tx_count ?? null;
      }
      last_refresh = cached.computed_at;
    }

    return {
      name: agent.name,
      slug,
      ecosystem: agent.ecosystem ?? "Unknown",
      wallets_declared: walletsCount,
      attributed,
      reason,
      revenue_usd,
      expenses_usd,
      tx_count,
      last_refresh,
    };
  });

  // Sort: attributed first (by revenue desc), then unattributed-with-wallets, then no wallets
  entries.sort((a, b) => {
    const scoreA = a.attributed ? 2 : a.wallets_declared > 0 ? 1 : 0;
    const scoreB = b.attributed ? 2 : b.wallets_declared > 0 ? 1 : 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.revenue_usd ?? 0) - (a.revenue_usd ?? 0);
  });

  const total_attributed = entries.filter((e) => e.attributed === true).length;
  const total_unattributed_with_wallets = entries.filter((e) => e.attributed === false && e.wallets_declared > 0).length;
  const total_no_wallets = entries.filter((e) => e.wallets_declared === 0).length;

  const resp: AttributionResponse = {
    ok: true,
    total_indexed: agents.length,
    total_attributed,
    total_unattributed_with_wallets,
    total_no_wallets,
    agents: entries,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(resp);
}
