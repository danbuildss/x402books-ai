import { NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { buildLedgerScan } from "@/lib/ledger-service";
import { categorizeWithAi } from "@/lib/ai-categorize";
import { isValidWalletAddress, type TimeRange } from "@/lib/ledger";

const VALID_RANGES = new Set(["7d", "14d", "30d", "90d"]);

export async function POST(request: Request) {
  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const start = Date.now();
  let wallet = "";

  try {
    const body = await request.json() as { wallet?: unknown; range?: unknown };
    wallet = String(body.wallet ?? "").trim();
    const range = String(body.range ?? "30d") as TimeRange;

    if (!isValidWalletAddress(wallet)) {
      return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
    }
    if (!VALID_RANGES.has(range)) {
      return NextResponse.json({ error: "Range must be 7d, 14d, 30d, or 90d." }, { status: 400 });
    }

    const scan = await buildLedgerScan({ wallet, range, persist: false });
    const categorized = await categorizeWithAi(scan.transactions);

    const response = {
      wallet,
      range,
      generated_at: new Date().toISOString(),
      provider: categorized.provider,
      transaction_count: categorized.transactions.length,
      transactions: categorized.transactions.map((tx) => ({
        tx_hash: tx.txHash,
        timestamp: tx.timestamp,
        direction: tx.direction,
        counterparty: tx.counterparty,
        token_symbol: tx.tokenSymbol,
        amount_usd: tx.usdValue ?? tx.amountUsdc,
        category: tx.category ?? "unknown",
        confidence_score: tx.confidenceScore ?? 0,
        memo: tx.memo ?? "",
        is_likely_x402: Boolean(tx.isLikelyX402),
      })),
    };

    auth.finish(200, Date.now() - start, "/api/v1/categorize", wallet);
    return NextResponse.json(response);
  } catch (error) {
    auth.finish(502, Date.now() - start, "/api/v1/categorize", wallet);
    return NextResponse.json(
      { error: "Categorization failed.", detail: error instanceof Error ? error.message : undefined },
      { status: 502 },
    );
  }
}
