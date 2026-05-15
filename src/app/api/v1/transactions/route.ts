import { NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { parseLedgerParams, ledgerErrorResponse } from "@/lib/api-utils";
import { buildLedgerScan } from "@/lib/ledger-service";

export async function GET(request: Request) {
  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const params = parseLedgerParams(request);
  if (params.error) return params.error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const start = Date.now();
  try {
    const scan = await buildLedgerScan({ wallet: params.wallet, range: params.range, persist: false });

    const all = scan.transactions;
    const sliced = all.slice((page - 1) * limit, page * limit);

    const body = {
      wallet: scan.wallet,
      range: scan.range,
      generated_at: scan.generatedAt,
      pagination: {
        page,
        limit,
        total: all.length,
        pages: Math.ceil(all.length / limit),
      },
      transactions: sliced.map((tx) => ({
        tx_hash: tx.txHash,
        timestamp: tx.timestamp,
        direction: tx.direction,
        counterparty: tx.counterparty,
        token_symbol: tx.tokenSymbol,
        token_address: tx.tokenAddress,
        amount_native: tx.amountUsdc,
        amount_usd: tx.usdValue ?? tx.amountUsdc,
        category: tx.category ?? "unknown",
        is_likely_x402: Boolean(tx.isLikelyX402),
        is_agent_token: Boolean(tx.isAgentToken),
        risk_flag: tx.riskFlag ?? "none",
      })),
    };

    auth.finish(200, Date.now() - start, "/api/v1/transactions", params.wallet);
    return NextResponse.json(body);
  } catch (error) {
    auth.finish(502, Date.now() - start, "/api/v1/transactions", params.wallet);
    return ledgerErrorResponse(error);
  }
}
