// GET /api/v1/luca/surplus/models
//
// Returns the list of models available through Surplus inference,
// including model IDs, context windows, and capability flags.

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";

export const dynamic = "force-dynamic";

const SURPLUS_BASE = "https://api.surplusintelligence.ai";

export async function GET(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const key = process.env.LUCA_SURPLUS_BUYER_KEY || process.env.SURPLUS_API_KEY;

  const t0 = Date.now();
  try {
    const res = await fetch(`${SURPLUS_BASE}/v1/models`, {
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "Authorization": `Bearer ${key}` } : {}),
      },
    });

    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      auth.finish(res.status, Date.now() - t0, "/api/v1/luca/surplus/models");
      return NextResponse.json({ error: "Surplus models fetch failed", detail: data }, { status: res.status });
    }

    auth.finish(200, Date.now() - t0, "/api/v1/luca/surplus/models");
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    auth.finish(502, Date.now() - t0, "/api/v1/luca/surplus/models");
    return NextResponse.json({ error: "Could not reach Surplus", detail: String(e) }, { status: 502 });
  }
}
