// POST /api/admin/confidence-label  — set human-verified confidence for an agent
// GET  /api/admin/confidence-label  — list all labels (admin view)
// Protected by ZETTA_INTERNAL_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { setConfidenceLabel, getAllConfidenceLabels, type ConfidenceLevel } from "@/lib/revenue-confidence";

const VALID_LEVELS: ConfidenceLevel[] = ["high", "medium", "low", "under_review"];

function auth(req: NextRequest): boolean {
  const s = req.headers.get("x-internal-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return !!s && s === process.env.X402BOOKS_INTERNAL_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const labels = await getAllConfidenceLabels();
  return NextResponse.json({ ok: true, labels });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json({ ok: true, slug, level });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
