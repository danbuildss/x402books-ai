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
      report: scan.report,
      summary: scan.summary,
      categories: scan.categories,
      daily_flows: scan.dailyFlows,
    });
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}
