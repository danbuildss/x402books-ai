import { fetchBaseUsdcTransfers } from "@/lib/alchemy";
import { persistLedgerScan } from "@/lib/ledger-store";
import {
  TimeRange,
  enrichLedgerTransactions,
  getCategorySummary,
  getDailyFlows,
  getLedgerReport,
  getLedgerSummary,
} from "@/lib/ledger";

export async function buildLedgerScan(params: {
  wallet: string;
  range: TimeRange;
  persist?: boolean;
}) {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("Alchemy API key is not configured.");
  }

  const transactions = enrichLedgerTransactions(
    await fetchBaseUsdcTransfers({
      apiKey,
      wallet: params.wallet,
      range: params.range,
    }),
  );

  const summary = getLedgerSummary(transactions);
  const report = getLedgerReport({
    range: params.range,
    summary,
    transactions,
  });
  const categories = getCategorySummary(transactions);
  const dailyFlows = getDailyFlows(transactions, params.range);
  const persistence = params.persist
    ? await persistLedgerScan({
        wallet: params.wallet,
        range: params.range,
        transactions,
        report,
      })
    : { persisted: false, reason: "not_requested" };

  return {
    wallet: params.wallet,
    range: params.range,
    generatedAt: new Date().toISOString(),
    summary,
    report,
    categories,
    dailyFlows,
    persistence,
    transactions,
  };
}
