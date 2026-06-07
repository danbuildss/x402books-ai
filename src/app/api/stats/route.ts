import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { AGENTS } from "@/app/registry/data";

// Verification tier ordering (higher = more verified)
const TIER: Record<string, number> = {
  "Candidate":          0,
  "Needs Verification": 1,
  "Wallets Declared":   2,
  "Claimed":            3,
  "Verified":           4,
  "Luca Managed":       5,
};

interface AgentRow {
  verification_status: string | null;
  ecosystem: string | null;
  financial_activity_score: number | null;
  last_checked: string | null;
}

function buildStats(rows: AgentRow[]) {
  const byStatus: Record<string, number> = {
    "Candidate":          0,
    "Needs Verification": 0,
    "Wallets Declared":   0,
    "Claimed":            0,
    "Verified":           0,
    "Luca Managed":       0,
  };

  const byEcosystem: Record<string, {
    total: number;
    wallets_declared: number;
    claimed: number;
    verified: number;
    luca_managed: number;
  }> = {};

  const now = Date.now();
  const MS_7D  = 7  * 24 * 60 * 60 * 1000;
  const MS_30D = 30 * 24 * 60 * 60 * 1000;

  let declared_last_7d  = 0;
  let declared_last_30d = 0;
  let claimed_last_7d   = 0;
  let claimed_last_30d  = 0;

  for (const row of rows) {
    const status = row.verification_status ?? "Candidate";
    const eco    = row.ecosystem ?? "Unknown";
    const tier   = TIER[status] ?? 0;

    // Status counts
    if (status in byStatus) byStatus[status]++;

    // Ecosystem breakdown
    if (!byEcosystem[eco]) {
      byEcosystem[eco] = { total: 0, wallets_declared: 0, claimed: 0, verified: 0, luca_managed: 0 };
    }
    byEcosystem[eco].total++;
    if (tier >= TIER["Wallets Declared"]) byEcosystem[eco].wallets_declared++;
    if (tier >= TIER["Claimed"])          byEcosystem[eco].claimed++;
    if (tier >= TIER["Verified"])         byEcosystem[eco].verified++;
    if (tier >= TIER["Luca Managed"])     byEcosystem[eco].luca_managed++;

    // Recent activity (based on last_checked)
    if (row.last_checked) {
      const age = now - new Date(row.last_checked).getTime();
      if (tier >= TIER["Wallets Declared"]) {
        if (age <= MS_7D)  declared_last_7d++;
        if (age <= MS_30D) declared_last_30d++;
      }
      if (tier >= TIER["Claimed"]) {
        if (age <= MS_7D)  claimed_last_7d++;
        if (age <= MS_30D) claimed_last_30d++;
      }
    }
  }

  const wallets_declared_or_above =
    byStatus["Wallets Declared"] + byStatus["Claimed"] + byStatus["Verified"] + byStatus["Luca Managed"];
  const claimed_or_above =
    byStatus["Claimed"] + byStatus["Verified"] + byStatus["Luca Managed"];
  const verified_or_above =
    byStatus["Verified"] + byStatus["Luca Managed"];

  return {
    agents_indexed:             rows.length,
    wallets_declared_or_above,
    claimed_or_above,
    verified_or_above,
    by_status:                  byStatus,
    by_ecosystem:               byEcosystem,
    recent_activity: {
      declared_last_7d,
      declared_last_30d,
      claimed_last_7d,
      claimed_last_30d,
    },
    // Prediction market resolution helpers
    markets: {
      "100_manifests_before_august":    wallets_declared_or_above >= 100,
      "50_claimed_before_q4":           claimed_or_above >= 50,
      "25_verified_before_year_end":    verified_or_above >= 25,
      top_ecosystem_by_verified:        topEcosystem(byEcosystem, "verified"),
    },
    updated_at: new Date().toISOString(),
  };
}

function topEcosystem(
  byEco: Record<string, { verified: number; luca_managed: number }>,
  metric: "verified",
): { ecosystem: string; count: number } {
  let top = { ecosystem: "none", count: 0 };
  for (const [eco, data] of Object.entries(byEco)) {
    const count = data.verified + data.luca_managed;
    if (count > top.count) top = { ecosystem: eco, count };
  }
  return top;
}

// GET /api/stats — public, no auth, 60s cache
export async function GET() {
  // Live data from Supabase
  if (hasSupabaseAdminEnv()) {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("registry_agents")
      .select("verification_status, ecosystem, financial_activity_score, last_checked");

    if (!error && data) {
      const stats = buildStats(data as AgentRow[]);
      return NextResponse.json(stats, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    }
  }

  // Fallback to static data
  const rows: AgentRow[] = AGENTS.map((a) => ({
    verification_status:      a.verificationStatus,
    ecosystem:                a.ecosystem,
    financial_activity_score: a.financialActivityScore,
    last_checked:             null,
  }));

  const stats = buildStats(rows);
  return NextResponse.json(
    { ...stats, source: "static" },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
