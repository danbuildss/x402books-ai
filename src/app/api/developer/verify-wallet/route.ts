// POST /api/developer/verify-wallet
// Links a wallet address to an API key, checks $XBOOKS balance, and upgrades the tier.

import { NextResponse } from "next/server";
import { linkWalletToKey } from "@/lib/api-keys";
import { isValidWalletAddress } from "@/lib/ledger";
import { TIER_LABELS, TIER_LIMITS } from "@/lib/xbooks-token";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { keyId?: unknown; walletAddress?: unknown };
    const keyId = String(body.keyId ?? "").trim();
    const walletAddress = String(body.walletAddress ?? "").trim();

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required." }, { status: 400 });
    }
    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
    }

    const result = await linkWalletToKey(keyId, walletAddress);
    if (!result) {
      return NextResponse.json({ error: "Could not link wallet. Make sure the key ID is valid." }, { status: 500 });
    }

    return NextResponse.json({
      tier: result.tier,
      tier_label: TIER_LABELS[result.tier],
      rate_limit_per_day: TIER_LIMITS[result.tier],
      xbooks_balance: result.balance,
      wallet_address: walletAddress.toLowerCase(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
