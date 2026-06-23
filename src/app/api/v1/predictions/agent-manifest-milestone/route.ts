import { NextResponse } from "next/server";
import { getAttributionMetrics } from "@/lib/attribution-health";
import { getGDPHistory } from "@/lib/gdp-history";

export const dynamic = "force-dynamic";

const QUESTION = "Will 100 agents declare wallets via the Agent Wallet Manifest before August?";
const TARGET = 100;
const DEADLINE = new Date("2026-08-01T00:00:00.000Z");
const MANIFEST_GUIDE = "https://www.zettaai.co/manifest";

export async function GET() {
  const [metrics, history] = await Promise.allSettled([
    getAttributionMetrics(),
    getGDPHistory(30),
  ]);

  const current =
    metrics.status === "fulfilled"
      ? metrics.value.manifest_attributed_agents
      : 0;

  const totalAgents =
    metrics.status === "fulfilled" ? metrics.value.total_agents : 0;

  const discoveredNotManifest =
    metrics.status === "fulfilled" ? metrics.value.discovered_agents : 0;

  const unattributed =
    metrics.status === "fulfilled" ? metrics.value.unattributed_agents : 0;

  const now = new Date();
  const deadlinePassed = now >= DEADLINE;
  const daysRemaining = deadlinePassed
    ? 0
    : Math.ceil((DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Resolution: target hit (YES) or deadline passed with target not hit (NO)
  const targetHit = current >= TARGET;
  const resolved = targetHit || deadlinePassed;
  const resolution: "YES" | "NO" | null = resolved
    ? targetHit ? "YES" : "NO"
    : null;

  // Trend from GDP history snapshots (attributed_agents field)
  const snapshots =
    history.status === "fulfilled" ? history.value : [];

  // Snapshots are newest-first; find the one closest to 7 days ago
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const oldSnapshot = snapshots
    .filter((s) => new Date(s.snapshotted_at).getTime() <= sevenDaysAgo)
    .at(0); // newest snapshot that is at least 7 days old

  const delta7d = oldSnapshot != null ? current - oldSnapshot.attributed_agents : null;

  // Rate: change per day over available window
  let ratePerDay: number | null = null;
  let projectedByDeadline: number | null = null;
  let onTrack: boolean | null = null;

  if (oldSnapshot != null && delta7d != null) {
    const windowDays =
      (now.getTime() - new Date(oldSnapshot.snapshotted_at).getTime()) /
      (1000 * 60 * 60 * 24);
    ratePerDay = windowDays > 0 ? Math.round((delta7d / windowDays) * 100) / 100 : 0;
    projectedByDeadline =
      !deadlinePassed && ratePerDay != null
        ? Math.round(current + ratePerDay * daysRemaining)
        : null;
    onTrack = projectedByDeadline != null ? projectedByDeadline >= TARGET : false;
  }

  const progressPct = Math.min(100, Math.round((current / TARGET) * 100));

  return NextResponse.json(
    {
      question: QUESTION,
      metric: "agents_with_manifest_declared_wallets",
      current,
      target: TARGET,
      deadline: DEADLINE.toISOString(),
      days_remaining: daysRemaining,
      progress_pct: progressPct,
      resolved,
      resolution,
      outcome: resolution,
      trend: {
        delta_7d: delta7d,
        rate_per_day: ratePerDay,
        projected_by_deadline: projectedByDeadline,
        on_track: onTrack,
        note:
          snapshots.length < 2
            ? "Insufficient snapshot history for trend — check back after daily snapshots accumulate"
            : null,
      },
      context: {
        total_agents_in_registry: totalAgents,
        manifest_attributed: current,
        discovered_not_manifest: discoveredNotManifest,
        unattributed,
        definition:
          "manifest_attributed = agent has ≥1 manifest-declared wallet of type eoa or treasury_contract, verified via .agent/wallets.json",
        manifest_guide: MANIFEST_GUIDE,
      },
      generated_at: now.toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
