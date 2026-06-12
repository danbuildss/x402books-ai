import { NextRequest, NextResponse } from "next/server";
import { getPendingUpdates } from "@/lib/registry-db";
import { internalAuth } from "@/lib/internal-auth";

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const updates = await getPendingUpdates();
  return NextResponse.json({ ok: true, updates });
}
