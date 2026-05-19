import { NextRequest, NextResponse } from "next/server";
import {
  getTodayMetrics,
  get7DayMetrics,
  getTopScannedWallets,
  getRecentFailedScans,
  getRecentRegistryEvents,
} from "@/lib/growth-db";

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [today, sevenDay, topWallets, failedScans, registryEvents] = await Promise.all([
    getTodayMetrics(),
    get7DayMetrics(),
    getTopScannedWallets(),
    getRecentFailedScans(),
    getRecentRegistryEvents(),
  ]);

  return NextResponse.json({ ok: true, today, sevenDay, topWallets, failedScans, registryEvents });
}
