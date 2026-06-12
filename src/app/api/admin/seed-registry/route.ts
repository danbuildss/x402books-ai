import { NextRequest, NextResponse } from "next/server";
import { seedRegistryFromStaticData } from "@/lib/registry-db";
import { internalAuth } from "@/lib/internal-auth";

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedRegistryFromStaticData();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Registry seeded from static data." });
}
