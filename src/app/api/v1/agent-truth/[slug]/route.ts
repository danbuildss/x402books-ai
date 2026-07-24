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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agentSlug = slug.toLowerCase().trim();
  const auth = await v1Auth(req, { agentSlug });
  if (!auth.ok) return auth.response;
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });

  try {
    const [walletClaims, eligibilitySnapshot, manifestSubmission, evidencePackets, revenueEvents] = await Promise.all([
      getWalletClaims(agentSlug),
      getLatestEligibilitySnapshot(agentSlug),
      getLatestManifestSubmission(agentSlug),
      getAgentEvidencePackets(agentSlug),
      getRevenueEvents(agentSlug, { limit: 200 }),
    ]);

    const booksEligible = eligibilitySnapshot != null &&
      Array.isArray((eligibilitySnapshot as { eligible_wallets?: unknown[] }).eligible_wallets) &&
      (eligibilitySnapshot as { eligible_wallets: unknown[] }).eligible_wallets.length > 0;

    type RevenueEvent = { classification: string; amount_usd: number | null; recognition_status?: string };
    const events = revenueEvents as RevenueEvent[];
    const classificationCounts = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.classification] = (acc[event.classification] ?? 0) + 1;
      return acc;
    }, {});
    const candidateValueUsd = events
      .filter((event) => event.classification === "revenue_candidate" && event.amount_usd != null)
      .reduce((sum, event) => sum + (event.amount_usd ?? 0), 0);
    const unresolvedValueUsd = events
      .filter((event) => event.classification === "unresolved_inflow" && event.amount_usd != null)
      .reduce((sum, event) => sum + (event.amount_usd ?? 0), 0);

    return NextResponse.json({
      ok: true,
      agent_slug: agentSlug,
      books_eligible: booksEligible,
      manifest: manifestSubmission ? {
        reference_id: (manifestSubmission as Record<string, unknown>).reference_id,
        agent_id: (manifestSubmission as Record<string, unknown>).agent_id ?? null,
        verification_status: (manifestSubmission as Record<string, unknown>).verification_status,
        manifest_version: (manifestSubmission as Record<string, unknown>).manifest_version,
        manifest_digest: (manifestSubmission as Record<string, unknown>).manifest_digest ?? null,
        repo_url: (manifestSubmission as Record<string, unknown>).repo_url,
        submitted_at: (manifestSubmission as Record<string, unknown>).created_at,
      } : null,
      wallet_claims: walletClaims,
      eligibility_snapshot: eligibilitySnapshot,
      evidence_summary: { packet_count: evidencePackets.length, latest_evidence: evidencePackets[0] ?? null },
      revenue_summary: {
        total_events: events.length,
        classification_counts: classificationCounts,
        recognized_revenue_usd: null,
        revenue_candidate_usd: candidateValueUsd || null,
        unresolved_inflow_usd: unresolvedValueUsd || null,
        revenue_candidate_count: classificationCounts.revenue_candidate ?? 0,
        unresolved_inflow_count: classificationCounts.unresolved_inflow ?? 0,
        accounting_basis: "onchain_activity_only",
        note: "Onchain settlement and manifest attribution do not prove earned revenue. Recognized revenue remains unavailable until commercial, delivery, allocation, and recognition evidence is linked.",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error. Please try again." }, { status: 500 });
  }
}
