// POST /api/v1/luca/surplus/buyer-key
//
// Step 2 of Luca's Surplus self-registration flow.
// Luca signs the SIWE challenge from /api/v1/luca/surplus/challenge with its
// private key on Hermes, then POSTs { message, signature } here to obtain a
// persistent inf_ buyer key.
//
// The key is returned to the caller. Luca on Hermes should store it as
// LUCA_SURPLUS_BUYER_KEY in its environment; subsequent inference calls made
// through /api/v1/luca/inference will prefer that key automatically once
// it is available on the Vercel side as well.

import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";

export const dynamic = "force-dynamic";

const SURPLUS_BASE = "https://api.surplusintelligence.ai";

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    auth.finish(400, 0, "/api/v1/luca/surplus/buyer-key");
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message   = typeof body.message   === "string" ? body.message.trim()   : "";
  const signature = typeof body.signature === "string" ? body.signature.trim() : "";

  if (!message || !signature) {
    auth.finish(400, 0, "/api/v1/luca/surplus/buyer-key");
    return NextResponse.json(
      { error: "Both message and signature are required." },
      { status: 400 },
    );
  }

  const t0 = Date.now();
  try {
    const res = await fetch(`${SURPLUS_BASE}/v1/buyer/auth/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      auth.finish(res.status, Date.now() - t0, "/api/v1/luca/surplus/buyer-key");
      return NextResponse.json({ error: "Surplus key issuance failed", detail: data }, { status: res.status });
    }

    auth.finish(200, Date.now() - t0, "/api/v1/luca/surplus/buyer-key");
    return NextResponse.json({
      ok: true,
      key: data.key ?? data.api_key ?? data,
      note: "Store this as LUCA_SURPLUS_BUYER_KEY in Hermes environment. One-time: call approve(settlement_contract, maxUint) on USDC on Base so inference costs settle from your wallet automatically.",
    });
  } catch (e) {
    auth.finish(502, Date.now() - t0, "/api/v1/luca/surplus/buyer-key");
    return NextResponse.json({ error: "Could not reach Surplus", detail: String(e) }, { status: 502 });
  }
}
