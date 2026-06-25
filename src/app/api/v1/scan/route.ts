import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "x402-next";
import { validateApiKey } from "@/lib/api-keys";
import { hasLucaBalance } from "@/lib/luca-balance";
import { buildLedgerScan } from "@/lib/ledger-service";
import { parseLedgerParams, ledgerErrorResponse } from "@/lib/api-utils";

// x402 pay-per-call: $0.01 USDC/call, 30% off for wallets holding ≥1,000 $LUCA on Base.
// Set ZETTA_PAYMENT_ADDRESS to enable — if unset the route falls back to open access.
// Legacy: X402BOOKS_PAYMENT_ADDRESS is also accepted during migration.

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
const PAYMENT_ADDRESS = ((process.env.ZETTA_PAYMENT_ADDRESS || process.env.X402BOOKS_PAYMENT_ADDRESS) ?? ZERO_ADDRESS) as `0x${string}`;
const PAYMENT_ENABLED = Boolean(process.env.ZETTA_PAYMENT_ADDRESS || process.env.X402BOOKS_PAYMENT_ADDRESS);

async function scanHandler(request: NextRequest): Promise<NextResponse> {
  const params = parseLedgerParams(request);
  if (params.error) return params.error as NextResponse;

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

const paywallHandler = withX402(
  scanHandler,
  PAYMENT_ADDRESS,
  async (req: NextRequest) => {
    const agentWallet = req.headers.get("x-agent-wallet") ?? undefined;
    const hasLuca = agentWallet ? await hasLucaBalance(agentWallet) : false;
    return {
      price: hasLuca ? "$0.007" : "$0.01",
      network: "base" as const,
      config: { description: "Zetta wallet scan — Luca financial intelligence on Base" },
    };
  }
);

export async function GET(request: NextRequest) {
  // Valid API key → free access
  const authHeader = request.headers.get("authorization") ?? "";
  const apiKeyHeader = request.headers.get("x-api-key") ?? "";
  const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : apiKeyHeader.trim();
  if (raw) {
    const result = await validateApiKey(raw);
    if (result.ok) return scanHandler(request);
  }

  // x402 pay-per-call
  if (PAYMENT_ENABLED) return paywallHandler(request);

  // Payment not configured (dev/staging) → open access matching /api/scan
  return scanHandler(request);
}
