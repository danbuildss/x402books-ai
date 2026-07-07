// Anomaly Detection Engine
//
// Four signal types: volume, counterparty, timing, ratio.
// Pure functions — no side effects. Returns structured anomalies with severity.
// Called by the daily cron and by Luca's get_anomaly_alerts tool.

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export type AnomalySeverity = "low" | "medium" | "high";

export type AnomalyType =
  | "volume_spike"
  | "new_counterparty"
  | "timing_gap"
  | "ratio_breakdown"
  | "revenue_decline"
  | "runway_critical";

export type Anomaly = {
  id?:            string;
  agent_slug:     string;
  type:           AnomalyType;
  severity:       AnomalySeverity;
  description:    string;
  detected_at:    string;
  resolved:       boolean;
  metadata?:      Record<string, unknown>;
};

// ── Detectors ─────────────────────────────────────────────────────────────────

export function detectVolumeAnomaly(
  agentSlug:    string,
  currentValue: number,
  baseline:     number,
  stdDev:       number,
  metric:       string,
): Anomaly | null {
  if (stdDev === 0 || baseline === 0) return null;
  const zScore = Math.abs((currentValue - baseline) / stdDev);
  if (zScore < 2) return null;

  const direction = currentValue > baseline ? "spike" : "drop";
  const pctChange = Math.abs(((currentValue - baseline) / baseline) * 100).toFixed(0);
  const severity: AnomalySeverity = zScore >= 3 ? "high" : zScore >= 2.5 ? "medium" : "low";

  return {
    agent_slug:  agentSlug,
    type:        "volume_spike",
    severity,
    description: `${metric} ${direction}: $${currentValue.toFixed(2)} vs $${baseline.toFixed(2)} baseline (${pctChange}% deviation, ${zScore.toFixed(1)}σ).`,
    detected_at: new Date().toISOString(),
    resolved:    false,
    metadata:    { metric, currentValue, baseline, stdDev, zScore, direction },
  };
}

export function detectCounterpartyAnomaly(
  agentSlug:        string,
  newAddress:       string,
  outflowPct:       number,
  totalOutflow:     number,
): Anomaly | null {
  if (outflowPct < 0.15) return null;
  const pctLabel  = (outflowPct * 100).toFixed(0);
  const severity: AnomalySeverity = outflowPct >= 0.4 ? "high" : outflowPct >= 0.25 ? "medium" : "low";

  return {
    agent_slug:  agentSlug,
    type:        "new_counterparty",
    severity,
    description: `New unclassified counterparty ${newAddress.slice(0, 8)}… received ${pctLabel}% of outflow ($${(totalOutflow * outflowPct).toFixed(2)}).`,
    detected_at: new Date().toISOString(),
    resolved:    false,
    metadata:    { address: newAddress, outflowPct, totalOutflow },
  };
}

export function detectTimingAnomaly(
  agentSlug:       string,
  lastActiveDays:  number,
  historicalCadence: number, // average days between active periods
): Anomaly | null {
  if (historicalCadence === 0) return null;
  const ratio = lastActiveDays / historicalCadence;
  if (ratio < 3) return null;

  const severity: AnomalySeverity = ratio >= 7 ? "high" : ratio >= 5 ? "medium" : "low";
  return {
    agent_slug:  agentSlug,
    type:        "timing_gap",
    severity,
    description: `No activity for ${lastActiveDays} days. Historical cadence: active every ${historicalCadence.toFixed(0)} days.`,
    detected_at: new Date().toISOString(),
    resolved:    false,
    metadata:    { lastActiveDays, historicalCadence, ratio },
  };
}

export function detectRatioAnomaly(
  agentSlug:          string,
  currentRatio:       number, // expense / revenue
  historicalAvgRatio: number,
  historicalStdDev:   number,
): Anomaly | null {
  if (historicalStdDev === 0 || historicalAvgRatio === 0) return null;
  const zScore = Math.abs((currentRatio - historicalAvgRatio) / historicalStdDev);
  if (zScore < 2) return null;

  const severity: AnomalySeverity = zScore >= 3 ? "high" : "medium";
  return {
    agent_slug:  agentSlug,
    type:        "ratio_breakdown",
    severity,
    description: `Expense/revenue ratio ${currentRatio.toFixed(2)} vs historical average ${historicalAvgRatio.toFixed(2)} (${zScore.toFixed(1)}σ deviation).`,
    detected_at: new Date().toISOString(),
    resolved:    false,
    metadata:    { currentRatio, historicalAvgRatio, historicalStdDev, zScore },
  };
}

export function detectRunwayCritical(
  agentSlug:     string,
  runwayDays:    number,
  weeklyBurn:    number,
): Anomaly | null {
  if (runwayDays > 30) return null;
  const severity: AnomalySeverity = runwayDays <= 14 ? "high" : "medium";
  return {
    agent_slug:  agentSlug,
    type:        "runway_critical",
    severity,
    description: `Treasury runway estimated at ${runwayDays} days at current burn rate ($${weeklyBurn.toFixed(2)}/week).`,
    detected_at: new Date().toISOString(),
    resolved:    false,
    metadata:    { runwayDays, weeklyBurn },
  };
}

// ── Revenue decline detector ───────────────────────────────────────────────────

export function detectRevenueDecline(
  agentSlug:   string,
  currentRev:  number,
  previousRev: number,
): Anomaly | null {
  if (previousRev === 0) return null;
  const pctChange = ((currentRev - previousRev) / previousRev) * 100;
  if (pctChange > -20) return null;

  const severity: AnomalySeverity = pctChange <= -40 ? "high" : "medium";
  return {
    agent_slug:  agentSlug,
    type:        "revenue_decline",
    severity,
    description: `Revenue declined ${Math.abs(pctChange).toFixed(0)}% period-over-period ($${previousRev.toFixed(2)} → $${currentRev.toFixed(2)}).`,
    detected_at: new Date().toISOString(),
    resolved:    false,
    metadata:    { currentRev, previousRev, pctChange },
  };
}

// ── Supabase persistence ───────────────────────────────────────────────────────

export async function saveAnomalies(anomalies: Anomaly[]): Promise<void> {
  if (!hasSupabaseAdminEnv() || !anomalies.length) return;
  const sb = getSupabaseAdminClient();
  await sb.from("agent_anomalies").insert(
    anomalies.map((a) => ({
      agent_slug:  a.agent_slug,
      type:        a.type,
      severity:    a.severity,
      description: a.description,
      detected_at: a.detected_at,
      resolved:    false,
      metadata:    a.metadata ?? {},
    })),
  );
}

export async function getAnomaliesForAgent(slug: string): Promise<Anomaly[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("agent_anomalies")
    .select("*")
    .eq("agent_slug", slug)
    .eq("resolved", false)
    .order("detected_at", { ascending: false })
    .limit(10);
  return (data ?? []) as Anomaly[];
}

// ── Batch analysis using books history ────────────────────────────────────────

export async function analyzeAgentAnomalies(slug: string): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  try {
    const { getAgentBooksHistory } = await import("@/lib/agent-books-history");
    const snapshots = await getAgentBooksHistory(slug, 90);
    if (!snapshots || snapshots.length < 3) return anomalies;

    const recent   = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];

    // Revenue decline
    const revDecline = detectRevenueDecline(slug, recent.revenue_usd, previous.revenue_usd);
    if (revDecline) anomalies.push(revDecline);

    // Runway critical (if treasury data available)
    if (recent.treasury_usd !== null && recent.expenses_usd > 0) {
      const dailyBurn  = recent.expenses_usd / 30;
      const runwayDays = dailyBurn > 0 ? Math.floor(recent.treasury_usd / dailyBurn) : 999;
      const weeklyBurn = dailyBurn * 7;
      const runwayAlert = detectRunwayCritical(slug, runwayDays, weeklyBurn);
      if (runwayAlert) anomalies.push(runwayAlert);
    }

    // Ratio anomaly across all snapshots
    const ratios = snapshots
      .filter((s) => s.revenue_usd > 0)
      .map((s) => s.expenses_usd / s.revenue_usd);

    if (ratios.length >= 3) {
      const avg  = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const variance = ratios.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / ratios.length;
      const std  = Math.sqrt(variance);
      const currentRatio = recent.revenue_usd > 0 ? recent.expenses_usd / recent.revenue_usd : 0;
      const ratioAlert = detectRatioAnomaly(slug, currentRatio, avg, std);
      if (ratioAlert) anomalies.push(ratioAlert);
    }

    // Volume anomaly on revenue
    const revenues = snapshots.map((s) => s.revenue_usd);
    if (revenues.length >= 3) {
      const avg = revenues.slice(0, -1).reduce((a, b) => a + b, 0) / (revenues.length - 1);
      const variance = revenues.slice(0, -1).reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (revenues.length - 1);
      const std = Math.sqrt(variance);
      const volAlert = detectVolumeAnomaly(slug, recent.revenue_usd, avg, std, "revenue");
      if (volAlert) anomalies.push(volAlert);
    }
  } catch { /* non-fatal */ }

  return anomalies;
}
