/**
 * Agent Books History
 *
 * Schema: agent_books_history (see supabase/agent-books-history.sql)
 * Update frequency: triggered by POST /api/admin/books/snapshot
 *   - called automatically on each research report generation
 *   - can be called manually for a specific agent
 * Retention: all snapshots kept indefinitely
 * Historical API: GET /api/v1/agent-books/[slug]/history?period=7d|30d|90d|all
 *
 * Data integrity: all values derived from buildAgentBooks() output only.
 * No synthetic, estimated, or inferred values are stored.
 */

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";
import type { AgentBooks } from "./agent-books";

export type AgentBooksSnapshot = {
  id: string;
  agent_slug: string;
  revenue_usd: number;
  expenses_usd: number;
  net_income_usd: number;
  treasury_usd: number | null;
  tx_count: number;
  wallet_count: number;
  snapshotted_at: string;
};

// Save a snapshot for one attributed agent.
// Fire-and-forget — caller should .catch(() => {}) this.
export async function saveAgentBooksSnapshot(books: AgentBooks): Promise<void> {
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_books_history").insert({
    agent_slug:     books.agent.slug,
    revenue_usd:    books.financials.revenue_usd,
    expenses_usd:   books.financials.expenses_usd,
    net_income_usd: books.financials.net_income_usd,
    treasury_usd:   books.financials.treasury_balance_usd,
    tx_count:       books.financials.tx_count,
    wallet_count:   books.wallets.declared,
  });
}

// Fetch snapshots for one agent, newest-first.
// windowDays: filter to snapshots from the last N days (0 = all time).
export async function getAgentBooksHistory(
  slug: string,
  windowDays = 90
): Promise<AgentBooksSnapshot[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  let query = sb
    .from("agent_books_history")
    .select("*")
    .eq("agent_slug", slug);

  if (windowDays > 0) {
    query = query.gte(
      "snapshotted_at",
      new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()
    );
  }

  const { data } = await query
    .order("snapshotted_at", { ascending: true })
    .limit(200);

  return (data ?? []) as AgentBooksSnapshot[];
}

// Returns first+last snapshot per agent within windowDays.
// One DB round-trip for the entire registry.
export async function getFirstLastSnapshotsPerAgent(
  windowDays = 30,
): Promise<Record<string, { first: AgentBooksSnapshot; last: AgentBooksSnapshot; count: number }>> {
  if (!hasSupabaseAdminEnv()) return {};
  const sb = getSupabaseAdminClient();

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from("agent_books_history")
    .select("*")
    .gte("snapshotted_at", since)
    .order("snapshotted_at", { ascending: true })
    .limit(5000);

  if (error || !data) return {};

  const grouped: Record<string, AgentBooksSnapshot[]> = {};
  for (const row of data) {
    if (!grouped[row.agent_slug]) grouped[row.agent_slug] = [];
    grouped[row.agent_slug].push(row as AgentBooksSnapshot);
  }

  const result: Record<string, { first: AgentBooksSnapshot; last: AgentBooksSnapshot; count: number }> = {};
  for (const [slug, snaps] of Object.entries(grouped)) {
    if (snaps.length < 2) continue;
    result[slug] = { first: snaps[0], last: snaps[snaps.length - 1], count: snaps.length };
  }
  return result;
}
