import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { validateManifest, parseManifest } from "@/lib/truth-engine/manifest-validator";
import { normalizeWalletGraph } from "@/lib/truth-engine/wallet-graph";
import { assessBooksEligibility } from "@/lib/truth-engine/books-eligibility";
import { ingestManifestTruth } from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { toSlug } from "@/lib/slug";

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

  const { manifest, repo_url, source_url, submitted_by } = body as {
    manifest?:     unknown;
    repo_url?:     string;
    source_url?:   string;
    submitted_by?: string;
  };

  if (!manifest || typeof manifest !== "object") {
    return NextResponse.json({ ok: false, error: "manifest is required (full JSON object)" }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    const validation = validateManifest(manifest);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, validation_errors: validation.errors }, { status: 422 });
    }
    const parsed   = parseManifest(manifest);
    const sourceRef = source_url ?? repo_url ?? ".agent/wallets.json";
    const graph    = normalizeWalletGraph(parsed, sourceRef);
    const snapshot = assessBooksEligibility(graph, new Date().toISOString().slice(0, 10));
    return NextResponse.json({
      ok: true, agent_slug: toSlug(parsed.agent), validation, graph, snapshot,
      note: "DB unavailable — truth computed but not persisted",
    });
  }

  const result = await ingestManifestTruth(manifest, { repoUrl: repo_url, sourceUrl: source_url, submittedBy: submitted_by });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    ok:             true,
    agent_slug:     result.agentSlug,
    agent_id:       result.agentId,
    manifest_digest: result.manifestDigest,
  });
}
