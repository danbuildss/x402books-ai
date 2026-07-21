import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { validateManifest, parseManifest } from "@/lib/truth-engine/manifest-validator";
import { normalizeWalletGraph } from "@/lib/truth-engine/wallet-graph";
import { assessBooksEligibility } from "@/lib/truth-engine/books-eligibility";
import { buildManifestEvidencePacket, buildWalletClaimEvidencePacket } from "@/lib/truth-engine/evidence";
import {
  upsertManifestSubmission,
  upsertWalletClaims,
  insertEligibilitySnapshot,
  insertEvidencePacket,
} from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    manifest,
    repo_url,
    source_url,
    submitted_by,
  } = body as {
    manifest?:     unknown;
    repo_url?:     string;
    source_url?:   string;
    submitted_by?: string;
  };

  if (!manifest || typeof manifest !== "object") {
    return NextResponse.json(
      { ok: false, error: "manifest is required (full JSON object)" },
      { status: 400 },
    );
  }

  // Validate
  const validation = validateManifest(manifest);
  const parsed     = parseManifest(manifest);
  const agentSlug  = toSlug(parsed.agent);
  const sourceRef  = source_url ?? repo_url ?? ".agent/wallets.json";

  if (!hasSupabaseAdminEnv()) {
    if (!validation.ok) {
      return NextResponse.json({ ok: false, validation_errors: validation.errors }, { status: 422 });
    }
    const graph    = normalizeWalletGraph(parsed, sourceRef);
    const snapshot = assessBooksEligibility(graph, new Date().toISOString().slice(0, 10));
    return NextResponse.json({
      ok:         true,
      agent_slug: agentSlug,
      validation,
      graph,
      snapshot,
      note:       "DB unavailable — truth computed but not persisted",
    });
  }

  // Persist manifest submission regardless of validation — record errors too
  const referenceId = `manifest:${agentSlug}`;
  try {
    await upsertManifestSubmission({
      reference_id:        referenceId,
      agent_slug:          agentSlug,
      ecosystem:           parsed.ecosystem,
      repo_url,
      manifest_path:       source_url ? new URL(source_url).pathname.split("/").pop() : ".agent/wallets.json",
      manifest_version:    parsed.version,
      submitted_by,
      verification_status: validation.ok ? "validated" : "invalid",
      parsed_manifest:     manifest,
      validation_errors:   validation.errors,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, agent_slug: agentSlug, validation_errors: validation.errors },
      { status: 422 },
    );
  }

  // Build truth graph + eligibility snapshot
  const graph    = normalizeWalletGraph(parsed, sourceRef);
  const snapshot = assessBooksEligibility(graph, new Date().toISOString().slice(0, 10));

  try {
    await upsertWalletClaims(graph);
    await insertEligibilitySnapshot(snapshot);

    // Evidence: one agent-level packet + one per wallet
    const agentEvidence = buildManifestEvidencePacket(agentSlug, parsed, sourceRef);
    await insertEvidencePacket(agentEvidence);

    for (const wallet of graph.wallets) {
      const walletEvidence = buildWalletClaimEvidencePacket(agentSlug, wallet, sourceRef);
      await insertEvidencePacket(walletEvidence);
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  return NextResponse.json({
    ok:                  true,
    agent_slug:          agentSlug,
    reference_id:        referenceId,
    wallet_count:        graph.wallets.length,
    books_eligible:      snapshot.eligible_wallets.length > 0,
    eligible_count:      snapshot.eligible_wallets.length,
    ineligible_count:    snapshot.ineligible_wallets.length,
    validation,
    snapshot_period:     snapshot.period_label,
  });
}
