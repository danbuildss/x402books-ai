import { NextRequest, NextResponse } from "next/server";
import { seedRegistryFromStaticData } from "@/lib/registry-db";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedRegistryFromStaticData();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Registry seeded from static data." });
}
