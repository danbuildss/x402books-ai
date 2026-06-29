// GET /api/v1/luca/surplus/status
//
// Returns Luca's Surplus buyer account status: USDC balance, allowance,
// settlement contract address, and active inf_ keys.
//
// Uses LUCA_SURPLUS_BUYER_KEY if set (Luca's own key).
// Falls back to SURPLUS_API_KEY for shared access (read-only profile view).
//
// Query params:
//   key=inf_xxx  — override which key to query (useful during setup)

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";

export const dynamic = "force-dynamic";

const SURPLUS_BASE = "https://api.surplusintelligence.ai";

export async function GET(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  // Key resolution: query param > Luca buyer key > shared key
  const keyParam = req.nextUrl.searchParams.get("key")?.trim();
  const lucaKey  = process.env.LUCA_SURPLUS_BUYER_KEY;
  const sharedKey = process.env.SURPLUS_API_KEY;

  const activeKey = keyParam || lucaKey || sharedKey;

  if (!activeKey) {
    auth.finish(503, 0, "/api/v1/luca/surplus/status");
    return NextResponse.json(
      { error: "No Surplus key configured. Set LUCA_SURPLUS_BUYER_KEY or SURPLUS_API_KEY." },
      { status: 503 },
    );
  }

  const t0 = Date.now();
  try {
    const res = await fetch(`${SURPLUS_BASE}/v1/buyer/me`, {
      headers: {
        "Authorization": `Bearer ${activeKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      auth.finish(res.status, Date.now() - t0, "/api/v1/luca/surplus/status");
      return NextResponse.json({ error: "Surplus status check failed", detail: data }, { status: res.status });
    }

    auth.finish(200, Date.now() - t0, "/api/v1/luca/surplus/status");
    return NextResponse.json({
      ok: true,
      key_source: keyParam ? "query_param" : lucaKey ? "LUCA_SURPLUS_BUYER_KEY" : "SURPLUS_API_KEY",
      ...data,
    });
  } catch (e) {
    auth.finish(502, Date.now() - t0, "/api/v1/luca/surplus/status");
    return NextResponse.json({ error: "Could not reach Surplus", detail: String(e) }, { status: 502 });
  }
}
