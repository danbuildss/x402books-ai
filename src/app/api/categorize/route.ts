import { NextResponse } from "next/server";
import { categorizeWithAi } from "@/lib/ai-categorize";
import { persistLedgerScan } from "@/lib/ledger-store";
import {
  TimeRange,
  LedgerTransaction,
  getLedgerReport,
  getLedgerSummary,
  isValidWalletAddress,
} from "@/lib/ledger";

const VALID_RANGES = new Set(["7d", "30d"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wallet = String(body.wallet || "").trim();
    const range = String(body.range || "30d") as TimeRange;
    const transactions = Array.isArray(body.transactions)
      ? (body.transactions as LedgerTransaction[])
      : [];

    if (!isValidWalletAddress(wallet)) {
      return NextResponse.json(
        { error: "Enter a valid Base wallet address before AI categorization." },
        { status: 400 },
      );
    }

    if (!VALID_RANGES.has(range)) {
      return NextResponse.json(
        { error: "Range must be 7d or 30d." },
        { status: 400 },
      );
    }

    const categorized = await categorizeWithAi(transactions);
    const summary = getLedgerSummary(categorized.transactions);
    const report = getLedgerReport({
      range,
      summary,
      transactions: categorized.transactions,
    });
    const persistence = await persistLedgerScan({
      wallet,
      range,
      transactions: categorized.transactions,
      report,
    });

    return NextResponse.json({
      provider: categorized.provider,
      summary,
      report,
      persistence,
      transactions: categorized.transactions,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not categorize these transactions right now." },
      { status: 502 },
    );
  }
}
