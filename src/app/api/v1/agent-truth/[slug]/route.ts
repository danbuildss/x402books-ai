import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import {
  getWalletClaims,
  getLatestEligibilitySnapshot,
  getLatestManifestSubmission,
  getAgentEvidencePackets,
  getRevenueEvents,
} from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await v1Auth(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { slug } = await params;
  const agentSlug = slug.toLowerCase().trim();

  if (auth.agentScope && auth.agentScope !== agentSlug) {
    return NextResponse.json(
      { error: `This API key is scoped to agent '${auth.agentScope}', not '${agentSlug}'. Use a key scoped to this agent, or an unscoped key.` },
      { status: 403 },
    );
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });
  }

  try {
    const [walletClaims, eligibilitySnapshot, manifestSubmission, evidencePackets, revenueEvents] =
      await Promise.all([
        getWalletClaims(agentSlug),
        getLatestEligibilitySnapshot(agentSlug),
        getLatestManifestSubmission(agentSlug),
        getAgentEvidencePackets(agentSlug),
        getRevenueEvents(agentSlug, { limit: 200 }),
      ]);

    const booksEligible =
      eligibilitySnapshot != null &&
      Array.isArray((eligibilitySnapshot as { eligible_wallets?: unknown[] }).eligible_wallets) &&
      ((eligibilitySnapshot as { eligible_wallets: unknown[] }).eligible_wallets.length ?? 0) > 0;

    // Conservative revenue summary — counts only, no dollar totals on ambiguous data
    type RevenueEvent = {
      classification:  string;
      confidence:      string;
      amount_usd:      number | null;
      chain:           string;
      asset_symbol:    string;
      observed_at:     string;
    };
    const events = revenueEvents as RevenueEvent[];

    const classificationCounts = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.classification] = (acc[e.classification] ?? 0) + 1;
      return acc;
    }, {});

    // Only count USD for high-confidence settlement_revenue (the only safe bucket)
    const confirmedRevenueUsd = events
      .filter((e) => e.classification === "settlement_revenue" && e.confidence === "high" && e.amount_usd != null)
      .reduce((s, e) => s + (e.amount_usd ?? 0), 0);

    const feeReceivedCount = classificationCounts["fee_received"] ?? 0;
    const distinctFeeSenders = new Set(
      events
        .filter((e) => e.classification === "fee_received")
        .map((e) => (e as unknown as Record<string, string>)["evidence_packet"]
          ? JSON.stringify((e as unknown as Record<string, unknown>)["evidence_packet"])
          : "unknown"
        )
    ).size;

    return NextResponse.json({
      ok:          true,
      agent_slug:  agentSlug,
      books_eligible: booksEligible,
      manifest: manifestSubmission
        ? {
            reference_id:        (manifestSubmission as Record<string, unknown>).reference_id,
            verification_status: (manifestSubmission as Record<string, unknown>).verification_status,
            manifest_version:    (manifestSubmission as Record<string, unknown>).manifest_version,
            repo_url:            (manifestSubmission as Record<string, unknown>).repo_url,
            submitted_at:        (manifestSubmission as Record<string, unknown>).created_at,
          }
        : null,
      wallet_claims:        walletClaims,
      eligibility_snapshot: eligibilitySnapshot,
      evidence_summary: {
        packet_count:    evidencePackets.length,
        latest_evidence: evidencePackets[0] ?? null,
      },
      revenue_summary: {
        total_events:              events.length,
        classification_counts:     classificationCounts,
        confirmed_revenue_usd:     confirmedRevenueUsd > 0 ? confirmedRevenueUsd : null,
        fee_received_count:        feeReceivedCount,
        distinct_fee_senders:      distinctFeeSenders,
        has_registry_settlement:   (classificationCounts["settlement_revenue"] ?? 0) > 0,
        note: "confirmed_revenue_usd counts only high-confidence settlement_revenue from registry wallets. fee_received is possible service income — medium confidence, not confirmed.",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error. Please try again." }, { status: 500 });
  }
}
