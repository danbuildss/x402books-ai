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
import { fetchTokenMetrics, isStablecoin, isAgentToken } from "@/lib/tokens";
import { getEcosystemRegistry, type EcosystemRegistry } from "@/lib/ecosystem-tokens";

// Fallback registry used when live fetch times out or fails
const FALLBACK_REGISTRY: EcosystemRegistry = {
  addresses: new Set([
    "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b", // BNKR
    "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07", // CLAWD
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
    "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", // USDT
    "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI
    "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42", // EURC
  ]),
  symbols: new Set([
    "BNKR", "BANKR", "CLAWD",
    "VIRTUAL", "VIRTUALS", "LUNA", "AIXBT", "GAME", "VADER", "CLANKER",
    "SEKOIA", "ACOLYT", "SPORE", "MISATO", "LMAO", "NOOK",
    "CRED", "XBOOKS", "DEGEN", "MOCA",
    "USDC", "USDT", "DAI", "EURC",
  ]),
};

// Race the live registry against a 4s timeout; fall back to hardcoded if slow
async function getEcosystemRegistrySafe(): Promise<EcosystemRegistry> {
  const timeout = new Promise<EcosystemRegistry>((resolve) =>
    setTimeout(() => resolve(FALLBACK_REGISTRY), 4_000),
  );
  try {
    return await Promise.race([getEcosystemRegistry(), timeout]);
  } catch {
    return FALLBACK_REGISTRY;
  }
}

export async function buildLedgerScan(params: {
  wallet: string;
  range: TimeRange;
  persist?: boolean;
}) {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ALCHEMY_API_KEY is not set. Add it to your Vercel environment variables.",
    );
  }

  // Run Alchemy fetch and ecosystem registry in parallel; registry has 4s hard cap
  const [rawTransactions, ecosystem] = await Promise.all([
    fetchBaseErc20Transfers({
      apiKey,
      wallet: params.wallet,
      range: params.range,
    }),
    getEcosystemRegistrySafe(),
  ]);

  // Collect unique non-stablecoin addresses for price lookup
  const nonStableAddresses = [
    ...new Set(
      rawTransactions
        .map((tx) => tx.tokenAddress)
        .filter((a) => a && !isStablecoin(a)),
    ),
  ];

  const metrics = await fetchTokenMetrics(nonStableAddresses);

  // Enrich each transaction with its USD value and agent token flag
  const priceEnriched = rawTransactions.map((tx) => {
    const addr = tx.tokenAddress.toLowerCase();
    const price = isStablecoin(addr) ? 1 : (metrics.get(addr)?.price ?? 0);
    return {
      ...tx,
      usdValue: tx.amountUsdc * price,
      isAgentToken:
        isAgentToken(tx.tokenSymbol) ||
        ecosystem.symbols.has(tx.tokenSymbol.toUpperCase()),
    };
  });

  const transactions = enrichLedgerTransactions(priceEnriched);

  // Build price map for portfolio breakdown, add 24h change + volume
  const prices = new Map([...metrics.entries()].map(([a, m]) => [a, m.price]));
  const portfolio = getPortfolioBreakdown(transactions, prices, ecosystem, metrics);

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
