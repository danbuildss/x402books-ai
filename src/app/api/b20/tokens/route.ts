import { NextResponse } from "next/server";
import { getB20Tokens, getB20Stats } from "@/lib/b20-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [tokens, stats] = await Promise.allSettled([getB20Tokens(), getB20Stats()]);

    return NextResponse.json(
      {
        tokens: tokens.status === "fulfilled" ? tokens.value : [],
        stats: stats.status === "fulfilled" ? stats.value : null,
        data_integrity: {
          books_eligible: false,
          note: "Token contracts are never books-eligible. Token transfers are not operating revenue.",
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
