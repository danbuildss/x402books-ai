// POST /api/developer/verify-wallet
// Two-step wallet linking with signature proof:
//   1. { keyId, walletAddress }            → returns a challenge message to sign
//   2. { keyId, walletAddress, signature } → verifies signature, links wallet, upgrades tier
//
// Pasting someone else's address never works — the signature proves control.
// EOA signatures only (ERC-1271 smart wallets not yet supported).

import { NextResponse } from "next/server";
import { issueLinkChallenge, verifyAndLinkWallet, keyBelongsTo } from "@/lib/api-keys";
import { getSessionCodeId } from "@/lib/access-auth";
import { internalAuth } from "@/lib/internal-auth";
import { isValidWalletAddress } from "@/lib/ledger";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { TIER_LABELS, TIER_LIMITS } from "@/lib/luca-token";

export async function POST(request: Request) {
  if (!rateLimit("verify-wallet", clientIp(request), 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = await request.json() as { keyId?: unknown; walletAddress?: unknown; signature?: unknown };
    const keyId = String(body.keyId ?? "").trim();
    const walletAddress = String(body.walletAddress ?? "").trim();
    const signature = String(body.signature ?? "").trim();

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required." }, { status: 400 });
    }
    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
    }

    // Only the key's owner (or admin) may link a wallet to it
    if (!internalAuth(request)) {
      const codeId = getSessionCodeId(request);
      if (!codeId) {
        return NextResponse.json({ error: "Sign in to link a wallet." }, { status: 401 });
      }
      if (!(await keyBelongsTo(keyId, codeId))) {
        return NextResponse.json({ error: "Key not found or not yours." }, { status: 404 });
      }
    }

    // Step 1: no signature yet → issue a challenge
    if (!signature) {
      const challenge = await issueLinkChallenge(keyId, walletAddress);
      if (!challenge) {
        return NextResponse.json({ error: "Could not create challenge." }, { status: 500 });
      }
      return NextResponse.json({ step: "sign", message: challenge.message });
    }

    // Step 2: verify the signature and link
    const result = await verifyAndLinkWallet(keyId, walletAddress, signature);
    if (!result) {
      return NextResponse.json({ error: "Could not link wallet." }, { status: 500 });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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
