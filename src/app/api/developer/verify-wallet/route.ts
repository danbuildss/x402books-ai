// POST /api/developer/verify-wallet
// Signature-verified wallet linking, two steps:
//
//   1. { keyId, walletAddress }            → returns a challenge message to sign
//   2. { keyId, walletAddress, signature } → verifies the signature, links the
//      wallet, checks $LUCA balance, and upgrades the tier
//
// Pasting an address you don't control no longer works — the wallet must sign.

import { NextResponse } from "next/server";
import { issueLinkChallenge, verifyAndLinkWallet, keyBelongsTo } from "@/lib/api-keys";
import { isValidWalletAddress } from "@/lib/ledger";
import { TIER_LABELS, TIER_LIMITS } from "@/lib/luca-token";
import { internalAuth } from "@/lib/internal-auth";
import { getSessionCodeId } from "@/lib/access-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      keyId?: unknown;
      walletAddress?: unknown;
      signature?: unknown;
    };
    const keyId = String(body.keyId ?? "").trim();
    const walletAddress = String(body.walletAddress ?? "").trim();
    const signature = body.signature ? String(body.signature).trim() : null;

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required." }, { status: 400 });
    }
    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
    }

    // Only the key's owner (or admin) may link a wallet to it
    if (!internalAuth(request)) {
      const codeId = getSessionCodeId(request);
      if (!codeId || !(await keyBelongsTo(keyId, codeId))) {
        return NextResponse.json(
          { error: "Sign in with the session that owns this key.", signin: "/access" },
          { status: 401 },
        );
      }
    }

    // Step 1 — no signature yet: issue the challenge
    if (!signature) {
      const challenge = await issueLinkChallenge(keyId, walletAddress);
      if (!challenge) {
        return NextResponse.json({ error: "Could not issue challenge. Check the key ID." }, { status: 500 });
      }
      return NextResponse.json({
        challenge: challenge.message,
        expires_at: challenge.expires_at,
        instructions: "Sign this exact message with the wallet, then POST again with the signature.",
      });
    }

    // Step 2 — verify and link
    const result = await verifyAndLinkWallet(keyId, walletAddress, signature);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      tier: result.tier,
      tier_label: TIER_LABELS[result.tier],
      rate_limit_per_day: TIER_LIMITS[result.tier],
      luca_balance: result.balance,
      wallet_address: walletAddress.toLowerCase(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
