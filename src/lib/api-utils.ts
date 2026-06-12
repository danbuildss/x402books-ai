import { NextResponse } from "next/server";
import { TimeRange, isValidWalletAddress } from "@/lib/ledger";

export const VALID_RANGES = new Set(["7d", "30d"]);

export function parseLedgerParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = String(searchParams.get("wallet") || "").trim();
  const range = String(searchParams.get("range") || searchParams.get("period") || "30d") as TimeRange;

  if (!isValidWalletAddress(wallet)) {
    return {
      error: NextResponse.json(
        { error: "Enter a valid Base wallet address." },
        { status: 400 },
      ),
    };
  }

  if (!VALID_RANGES.has(range)) {
    return {
      error: NextResponse.json(
        { error: "Range must be 7d or 30d." },
        { status: 400 },
      ),
    };
  }

  return { wallet, range };
}

// Log the real error server-side; return a generic message to the client.
// Raw DB error strings can leak table names, constraints, and queries.
export function dbError(scope: string, error: unknown, status = 500) {
  console.error(`[${scope}]`, error);
  return NextResponse.json(
    {
      error: "Something went wrong. Please try again.",
      detail: process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : undefined,
    },
    { status },
  );
}

export function ledgerErrorResponse(error: unknown) {
  if (error instanceof Error && error.message.includes("Alchemy API key")) {
    return NextResponse.json(
      { error: "Alchemy API key is not configured." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Could not build ledger data right now.",
      detail: process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : undefined,
    },
    { status: 502 },
  );
}
