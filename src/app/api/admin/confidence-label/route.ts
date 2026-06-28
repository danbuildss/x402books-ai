// POST /api/admin/confidence-label  — set human-verified confidence for an agent
// GET  /api/admin/confidence-label  — list all labels (admin view)
// Protected by ZETTA_INTERNAL_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { setConfidenceLabel, getAllConfidenceLabels, type ConfidenceLevel } from "@/lib/revenue-confidence";
import { internalAuthDetailed, logAdminAccess } from "@/lib/internal-auth";

const VALID_LEVELS: ConfidenceLevel[] = ["high", "medium", "low", "under_review"];

export async function GET(req: NextRequest) {
  const start = Date.now();
  const auth = internalAuthDetailed(req);
  if (!auth.ok) {
    logAdminAccess({ via: "raw_secret", endpoint: "/api/admin/confidence-label GET", statusCode: 401, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const labels = await getAllConfidenceLabels();
  logAdminAccess({ via: auth.via!, endpoint: "/api/admin/confidence-label GET", statusCode: 200, durationMs: Date.now() - start });
  return NextResponse.json({ ok: true, labels });
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const auth = internalAuthDetailed(req);
  if (!auth.ok) {
    logAdminAccess({ via: "raw_secret", endpoint: "/api/admin/confidence-label POST", statusCode: 401, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, level, public_note, internal_reason, reviewed_by } = body as {
    slug?: string; level?: string;
    public_note?: string; internal_reason?: string; reviewed_by?: string;
  };

  if (!slug || typeof slug !== "string")
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!level || !VALID_LEVELS.includes(level as ConfidenceLevel))
    return NextResponse.json({ error: `level must be one of: ${VALID_LEVELS.join(", ")}` }, { status: 400 });

  try {
    await setConfidenceLabel(slug, level as ConfidenceLevel, { public_note, internal_reason, reviewed_by });
    logAdminAccess({ via: auth.via!, endpoint: "/api/admin/confidence-label POST", statusCode: 200, durationMs: Date.now() - start });
    return NextResponse.json({ ok: true, slug, level });
  } catch {
    logAdminAccess({ via: auth.via!, endpoint: "/api/admin/confidence-label POST", statusCode: 500, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
