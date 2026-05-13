import { fetchBaseErc20Transfers } from "@/lib/alchemy";
import { persistLedgerScan } from "@/lib/ledger-store";
import {
  TimeRange,
  enrichLedgerTransactions,
  getCategorySummary,
  getDailyFlows,
  getLedgerReport,
  getLedgerSummary,
  getPortfolioBreakdown,
} from "@/lib/ledger";
import { fetchTokenPrices, isStablecoin, isAgentToken } from "@/lib/tokens";

export async function buildLedgerScan(params: {
  wallet: string;
  range: TimeRange;
  persist?: boolean;
}) {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("Alchemy API key is not configured.");
  }

  const rawTransactions = await fetchBaseErc20Transfers({
    apiKey,
    wallet: params.wallet,
    range: params.range,
  });

  // Collect unique non-stablecoin addresses for price lookup
  const nonStableAddresses = [
    ...new Set(
      rawTransactions
        .map((tx) => tx.tokenAddress)
        .filter((a) => a && !isStablecoin(a)),
    ),
  ];

  const prices = await fetchTokenPrices(nonStableAddresses);

  // Enrich each transaction with its USD value
  const priceEnriched = rawTransactions.map((tx) => {
    const addr = tx.tokenAddress.toLowerCase();
    const price = isStablecoin(addr) ? 1 : (prices.get(addr) ?? 0);
    return {
      ...tx,
      usdValue: tx.amountUsdc * price,
      isAgentToken: isAgentToken(tx.tokenSymbol),
    };
  });

  const transactions = enrichLedgerTransactions(priceEnriched);
  const portfolio = getPortfolioBreakdown(transactions, prices);

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
    portfolio,
    persistence,
    transactions,
  };
}
