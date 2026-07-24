import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { buildJournal, decideRecognition, detectAnomalies, emptyMetrics, reconstructEconomicActions, snapshotIntegrityHash, type SnapshotMetrics } from "@/lib/financial-intelligence";
import { commercialForAction, loadSourceEvents, postJournal, saveAnomalies, saveSnapshot, upsertAction } from "@/lib/financial-intelligence-db";
import { getWalletClaims } from "@/lib/truth-engine-db";

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });

  const body = await req.json() as { agent_slug?: string; period_start?: string; period_end?: string; publish?: boolean };
  if (!body.agent_slug || !body.period_start || !body.period_end) return NextResponse.json({ ok: false, error: "agent_slug, period_start, and period_end are required" }, { status: 400 });

  try {
    const source = await loadSourceEvents(body.agent_slug, body.period_start, `${body.period_end}T23:59:59.999Z`);
    const actions = reconstructEconomicActions(source);
    const claims = await getWalletClaims(body.agent_slug);
    const related = new Set(claims.map((wallet) => String(wallet.address).toLowerCase()));
    const metrics: SnapshotMetrics = emptyMetrics();
    let recognized = 0;
    let journals = 0;
    let anomalies = 0;
    let agentId: string | null = null;

    for (const action of actions) {
      agentId = action.agentId ?? agentId;
      const row = await upsertAction(action);
      const commercial = await commercialForAction(String(row.id));
      const decision = decideRecognition(action, commercial);
      const journal = buildJournal(action, decision);
      const actionAnomalies = detectAnomalies(action, related);
      if (journal) {
        const posted = await postJournal(action.agentSlug, action.agentId ?? null, String(row.id), action.occurredAt, journal);
        if (posted) journals++;
      }
      await saveAnomalies(action.agentSlug, action.agentId ?? null, String(row.id), actionAnomalies);
      anomalies += actionAnomalies.length;
      if (action.actionType === "direct_payment") metrics.grossPaymentVolumeUsd += action.grossAmountUsd;
      if (decision.status === "recognized" && decision.journalType === "service_revenue") { metrics.recognizedRevenueUsd += decision.recognizedAmountUsd; metrics.collectedRevenueUsd += decision.recognizedAmountUsd; recognized++; }
      if (decision.journalType === "other_income") metrics.otherIncomeUsd += decision.recognizedAmountUsd;
      if (decision.status === "candidate" || decision.status === "unresolved") metrics.unresolvedInflowsUsd += action.grossAmountUsd;
      if (decision.status === "reversed") metrics.refundsUsd += Math.abs(decision.recognizedAmountUsd);
      if (action.actionType === "operating_expense") metrics.operatingExpensesUsd += action.grossAmountUsd;
    }

    metrics.anomalyCount = anomalies;
    metrics.grossProfitUsd = metrics.recognizedRevenueUsd - metrics.directCostsUsd;
    metrics.operatingProfitUsd = metrics.grossProfitUsd - metrics.operatingExpensesUsd;
    const evidenceCoverage = actions.length ? recognized / actions.length : 0;
    const integrityHash = snapshotIntegrityHash({ agentSlug: body.agent_slug, periodStart: body.period_start, periodEnd: body.period_end, metrics, policyVersions: { recognition: "zetta-cash-v1", actions: "canonical-action.v1" } });
    const snapshot = await saveSnapshot({ agentId, agentSlug: body.agent_slug, periodStart: body.period_start, periodEnd: body.period_end, metrics, evidenceCoverage, dataCompleteness: 1, integrityHash, publish: body.publish === true });

    return NextResponse.json({ ok: true, actions: actions.length, journals, anomalies, snapshot_id: snapshot.id, snapshot_status: snapshot.status, integrity_hash: integrityHash, metrics });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
