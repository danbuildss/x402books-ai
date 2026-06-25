import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { normalizeWalletGraph } from "@/lib/truth-engine/wallet-graph";
import { assessBooksEligibility } from "@/lib/truth-engine/books-eligibility";
import { parseManifest } from "@/lib/truth-engine/manifest-validator";
import { getLatestManifestSubmission, insertEligibilitySnapshot } from "@/lib/truth-engine-db";
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

  const { agent_slug, period_label } = body as {
    agent_slug?:   string;
    period_label?: string;
  };

  if (!agent_slug || typeof agent_slug !== "string") {
    return NextResponse.json({ ok: false, error: "agent_slug is required" }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "DB unavailable" }, { status: 503 });
  }

  // Load the latest manifest for this agent
  let submission: { parsed_manifest: unknown } | null;
  try {
    submission = await getLatestManifestSubmission(agent_slug);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  if (!submission) {
    return NextResponse.json(
      { ok: false, error: `No manifest submission found for agent_slug: ${agent_slug}` },
      { status: 404 },
    );
  }

  const parsed   = parseManifest(submission.parsed_manifest);
  const graph    = normalizeWalletGraph(parsed);
  const label    = period_label ?? new Date().toISOString().slice(0, 10);
  const snapshot = assessBooksEligibility(graph, label);

  try {
    await insertEligibilitySnapshot(snapshot);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  return NextResponse.json({
    ok:               true,
    agent_slug,
    period_label:     label,
    wallet_count:     snapshot.wallet_count,
    eligible_count:   snapshot.eligible_wallets.length,
    ineligible_count: snapshot.ineligible_wallets.length,
    reasons:          snapshot.reasons,
  });
}
