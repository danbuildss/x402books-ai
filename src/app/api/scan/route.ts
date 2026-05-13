import { NextResponse } from "next/server";
import { ledgerErrorResponse, parseLedgerParams } from "@/lib/api-utils";
import { buildLedgerScan } from "@/lib/ledger-service";
import { resolveToWallet } from "@/lib/alchemy";

export async function GET(request: Request) {
  const params = parseLedgerParams(request);
  if (params.error) {
    return params.error;
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ALCHEMY_API_KEY is not set. Add it to your Vercel environment variables." },
      { status: 500 },
    );
  }

  try {
    // Resolve token contracts → deployer wallet before scanning
    const wallet = await resolveToWallet(params.wallet, apiKey);

    const scan = await buildLedgerScan({
      wallet,
      range: params.range,
      persist: true,
    });

    // Surface the resolved wallet so the UI can show it
    return NextResponse.json({ ...scan, resolvedFrom: wallet !== params.wallet ? params.wallet : undefined });
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}
