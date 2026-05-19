import { NextRequest, NextResponse } from "next/server";
import { approvePendingUpdate, rejectPendingUpdate } from "@/lib/registry-db";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be an object" }, { status: 400 });
  }

  const { id, action, notes } = body as {
    id?: unknown;
    action?: unknown;
    notes?: unknown;
  };

  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { ok: false, error: 'action must be "approve" or "reject"' },
      { status: 400 }
    );
  }

  const reviewerNotes = typeof notes === "string" ? notes : undefined;

  // ── Execute ───────────────────────────────────────────────────────────────
  let result: { ok: boolean; error?: string };

  if (action === "approve") {
    result = await approvePendingUpdate(id);
  } else {
    result = await rejectPendingUpdate(id, reviewerNotes);
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action, id });
}
