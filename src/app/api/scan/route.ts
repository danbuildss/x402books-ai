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
      persist: true,
    });

    return NextResponse.json(scan);
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}
