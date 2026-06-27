import { NextRequest, NextResponse } from "next/server";
import { getB20Token, getB20Activity, buildActivitySummaryFromDb } from "@/lib/b20-db";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
  }

  try {
    const [token, events] = await Promise.allSettled([
      getB20Token(address),
      getB20Activity(address, 50),
    ]);

    const tokenData = token.status === "fulfilled" ? token.value : null;
    const eventData = events.status === "fulfilled" ? events.value : [];

    if (!tokenData) {
      return NextResponse.json(
        { error: `Token ${address} not indexed. Use POST /api/admin/index-b20 to index it.` },
        { status: 404 },
      );
    }

    const isTestnet = tokenData.chain === "base-sepolia";
    const activity = buildActivitySummaryFromDb(address, eventData);

    return NextResponse.json(
      {
        token: tokenData,
        is_testnet: isTestnet,
        ...(isTestnet && {
          testnet_warning:
            "This is a testnet B20 token (Base Sepolia). It is not production financial activity. It does not enter Agent Books, Agent GDP, or production B20 intelligence. For proof-of-pipeline use only.",
        }),
        activity,
        data_integrity: {
          books_eligible: false,
          token_contract_note: isTestnet
            ? "Testnet token — not books-eligible under any circumstances"
            : "Token contract is not an operator wallet",
          issuer_wallet_note:
            tokenData.manifest_status === "attributed"
              ? "Issuer wallet is manifest-attributed"
              : "Issuer wallet is not attributed — financial books require .agent/wallets.json",
          revenue_note: "Token transfers are not operating revenue",
          gdp_note: isTestnet
            ? "Testnet B20 activity is excluded from Agent GDP"
            : "B20 activity is excluded from Agent GDP",
        },
        generated_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err) {
    console.error("[api/b20/tokens/[address]]", err);
    return NextResponse.json({ error: "Failed to load token profile" }, { status: 500 });
  }
}
