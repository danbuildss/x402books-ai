// GET /api/v1/luca/surplus/challenge?address=0x...
//
// Step 1 of Luca's Surplus self-registration flow.
// Returns the SIWE challenge message Luca must sign with its private key
// to get a persistent inf_ buyer key.
//
// Luca calls this, signs the returned message on Hermes, then posts
// { message, signature } to /api/v1/luca/surplus/buyer-key.

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";

export const dynamic = "force-dynamic";

const SURPLUS_BASE = "https://api.surplusintelligence.ai";

export async function GET(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address || !/^0x[0-9a-fA-F]{40}$/i.test(address)) {
    auth.finish(400, 0, "/api/v1/luca/surplus/challenge");
    return NextResponse.json({ error: "address query param required (0x wallet address)" }, { status: 400 });
  }

  const t0 = Date.now();
  try {
    const res = await fetch(
      `${SURPLUS_BASE}/v1/buyer/auth/challenge?address=${encodeURIComponent(address)}`,
      { headers: { "Content-Type": "application/json" } },
    );

    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      auth.finish(res.status, Date.now() - t0, "/api/v1/luca/surplus/challenge");
      return NextResponse.json({ error: "Surplus challenge failed", detail: data }, { status: res.status });
    }

    auth.finish(200, Date.now() - t0, "/api/v1/luca/surplus/challenge");
    return NextResponse.json({
      ok: true,
      address,
      message: data.message,
      nonce: data.nonce,
      next_step: "Sign this message with your wallet private key, then POST { message, signature } to /api/v1/luca/surplus/buyer-key",
    });
  } catch (e) {
    auth.finish(502, Date.now() - t0, "/api/v1/luca/surplus/challenge");
    return NextResponse.json({ error: "Could not reach Surplus", detail: String(e) }, { status: 502 });
  }
}
