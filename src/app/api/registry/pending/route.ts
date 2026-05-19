import { NextRequest, NextResponse } from "next/server";
import { getPendingUpdates } from "@/lib/registry-db";

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const updates = await getPendingUpdates();
  return NextResponse.json({ ok: true, updates });
}
