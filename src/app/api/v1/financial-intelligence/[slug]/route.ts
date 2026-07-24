import { NextRequest, NextResponse } from "next/server";
import { latestPublishedSnapshot } from "@/lib/financial-intelligence-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  const { slug } = await params;
  try {
    const snapshot = await latestPublishedSnapshot(slug);
    if (!snapshot) return NextResponse.json({ ok: false, error: "No published financial snapshot" }, { status: 404 });
    return NextResponse.json({ ok: true, agent_slug: slug, period: { start: snapshot.period_start, end: snapshot.period_end }, accounting_basis: snapshot.accounting_basis, status: snapshot.status, metrics: snapshot.metrics, evidence_coverage: Number(snapshot.evidence_coverage), data_completeness: Number(snapshot.data_completeness), integrity_hash: snapshot.integrity_hash, policy_versions: snapshot.policy_versions, published_at: snapshot.published_at });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
