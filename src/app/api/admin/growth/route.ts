import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import {
  getTodayMetrics,
  get7DayMetrics,
  getTopScannedWallets,
  getRecentFailedScans,
  getRecentRegistryEvents,
} from "@/lib/growth-db";

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [today, sevenDay, topWallets, failedScans, registryEvents] = await Promise.all([
      getTodayMetrics(),
      get7DayMetrics(),
      getTopScannedWallets(),
      getRecentFailedScans(),
      getRecentRegistryEvents(),
    ]);
    return NextResponse.json({ ok: true, today, sevenDay, topWallets, failedScans, registryEvents });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
