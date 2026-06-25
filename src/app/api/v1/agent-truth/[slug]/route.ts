import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import {
  getWalletClaims,
  getLatestEligibilitySnapshot,
  getLatestManifestSubmission,
  getAgentEvidencePackets,
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

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });
  }

  try {
    const [walletClaims, eligibilitySnapshot, manifestSubmission, evidencePackets] =
      await Promise.all([
        getWalletClaims(agentSlug),
        getLatestEligibilitySnapshot(agentSlug),
        getLatestManifestSubmission(agentSlug),
        getAgentEvidencePackets(agentSlug),
      ]);

    const booksEligible =
      eligibilitySnapshot != null &&
      Array.isArray((eligibilitySnapshot as { eligible_wallets?: unknown[] }).eligible_wallets) &&
      ((eligibilitySnapshot as { eligible_wallets: unknown[] }).eligible_wallets.length ?? 0) > 0;

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
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
