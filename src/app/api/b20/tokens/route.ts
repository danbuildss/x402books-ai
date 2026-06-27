import { NextRequest, NextResponse } from "next/server";
import { getB20Tokens, getB20Stats } from "@/lib/b20-db";

export const dynamic = "force-dynamic";

const VALID_CHAINS = ["base", "base-sepolia"] as const;
type B20Chain = (typeof VALID_CHAINS)[number];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("chain") ?? "base";
  const chain: B20Chain = (VALID_CHAINS as readonly string[]).includes(raw)
    ? (raw as B20Chain)
    : "base";
  const isTestnet = chain !== "base";

  try {
    const [tokens, stats] = await Promise.allSettled([
      getB20Tokens(chain),
      getB20Stats(chain),
    ]);

    return NextResponse.json(
      {
        chain,
        is_testnet: isTestnet,
        ...(isTestnet && {
          testnet_warning:
            "Testnet data is for demo/proof only. It is not production financial activity. Testnet tokens do not enter Agent Books, Agent GDP, or production B20 intelligence.",
        }),
        tokens: tokens.status === "fulfilled" ? tokens.value : [],
        stats: stats.status === "fulfilled" ? stats.value : null,
        data_integrity: {
          books_eligible: false,
          note: isTestnet
            ? "Testnet tokens are never books-eligible. This data is for demo only."
            : "Token contracts are never books-eligible. Token transfers are not operating revenue.",
        },
        generated_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err) {
    console.error("[api/b20/tokens]", err);
    return NextResponse.json({ tokens: [], stats: null }, { status: 500 });
  }
}
