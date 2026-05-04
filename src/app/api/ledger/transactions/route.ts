import { NextResponse } from "next/server";
import { ledgerErrorResponse, parseLedgerParams } from "@/lib/api-utils";
import { buildLedgerScan } from "@/lib/ledger-service";

export async function GET(request: Request) {
  const params = parseLedgerParams(request);
  if (params.error) {
    return params.error;
  }

  try {
    const scan = await buildLedgerScan({
      wallet: params.wallet,
      range: params.range,
      persist: false,
    });

    return NextResponse.json({
      wallet: scan.wallet,
      range: scan.range,
      generated_at: scan.generatedAt,
      count: scan.transactions.length,
      transactions: scan.transactions.map((transaction) => ({
        tx_hash: transaction.txHash,
        timestamp: transaction.timestamp,
        direction: transaction.direction,
        counterparty: transaction.counterparty,
        amount_usdc: transaction.amountUsdc,
        category: transaction.category || "unknown",
        confidence_score: transaction.confidenceScore || 0,
        memo: transaction.memo || "",
        is_likely_x402: Boolean(transaction.isLikelyX402),
        x402_reason: transaction.x402Reason || "not enough signal",
        risk_flag: transaction.riskFlag || "none",
      })),
    });
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}
