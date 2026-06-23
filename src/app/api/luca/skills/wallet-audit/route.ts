import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { classifyAddressBatch } from "@/lib/address-classifier";
import { getWalletStableBalance } from "@/lib/treasury-balance";
import { BOOKS_ELIGIBLE_ADDRESS_TYPES } from "@/lib/wallet-eligibility";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function POST(req: NextRequest) {
  const auth = await v1Auth(req);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  const endpoint = "/api/luca/skills/wallet-audit";

  let body: { address?: string; chain?: string };
  try {
    body = await req.json() as { address?: string; chain?: string };
  } catch {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = (body.address ?? "").trim();
  if (!ADDRESS_RE.test(address)) {
    auth.finish(400, Date.now() - start, endpoint);
    return NextResponse.json({ error: "address must be a valid 0x Ethereum address (42 chars)" }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    auth.finish(500, Date.now() - start, endpoint);
    return NextResponse.json({ error: "ALCHEMY_API_KEY not configured" }, { status: 500 });
  }

  try {
    const [classified] = await classifyAddressBatch([address], apiKey);
    const addressType = classified.address_type;
    const booksCompatible = BOOKS_ELIGIBLE_ADDRESS_TYPES.has(addressType);

    let stableBalanceUsd: number | null = null;
    if (booksCompatible) {
      stableBalanceUsd = await getWalletStableBalance(address);
    }

    const notes: string[] = [];
    if (booksCompatible) {
      notes.push(
        `${addressType} wallets are books-compatible — declare this address in your agent manifest (evidenceSource: manifest) to enable financial attribution`,
      );
    } else {
      notes.push(`${addressType} wallets are excluded from books regardless of manifest declaration`);
      if (addressType === "token_contract") {
        notes.push("Token contracts are excluded to prevent inflating revenue figures with token issuance events");
      } else if (addressType === "smart_contract" || addressType === "proxy_contract") {
        notes.push("Only eoa and treasury_contract (Gnosis Safe) address types qualify for books attribution");
      }
    }

    auth.finish(200, Date.now() - start, endpoint);
    return NextResponse.json({
      skill: "wallet-audit",
      address: address.toLowerCase(),
      chain: body.chain ?? "base",
      address_type: addressType,
      books_compatible: booksCompatible,
      books_compatible_note: booksCompatible
        ? "This address type is eligible for books attribution when declared in the agent manifest"
        : "This address type is excluded from books regardless of manifest declaration",
      stable_balance_usd: stableBalanceUsd,
      notes,
      classified_at: new Date().toISOString(),
    });
  } catch (e) {
    auth.finish(502, Date.now() - start, endpoint);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Address classification failed" },
      { status: 502 },
    );
  }
}
