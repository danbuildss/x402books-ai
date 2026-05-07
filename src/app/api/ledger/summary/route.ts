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
      total_spend: scan.summary.totalSpend,
      total_income: scan.summary.totalIncome,
      net_flow: scan.summary.netFlow,
      transaction_count: scan.summary.transactionCount,
      likely_x402_count: scan.summary.likelyX402Count,
      top_category: scan.summary.topCategory,
      top_counterparties: scan.summary.topCounterparties,
      budget_status: scan.report.budgetStatus,
    });
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}
