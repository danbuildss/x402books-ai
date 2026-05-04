export type TimeRange = "7d" | "30d";

export type LedgerTransaction = {
  txHash: string;
  timestamp: string;
  amountUsdc: number;
  direction: "income" | "expense" | "internal";
  counterparty: string;
  from: string;
  to: string;
  category?: LedgerCategory;
  confidenceScore?: number;
  memo?: string;
  isLikelyX402?: boolean;
  riskFlag?: LedgerRiskFlag;
  x402Reason?: string;
};

export type LedgerSummary = {
  totalSpend: number;
  totalIncome: number;
  netFlow: number;
  transactionCount: number;
  likelyX402Count: number;
  topCategory: LedgerCategory;
  topCounterparties: CounterpartySummary[];
};

export type LedgerCategory =
  | "api_call"
  | "data_access"
  | "compute"
  | "agent_service"
  | "subscription"
  | "unknown"
  | "income"
  | "refund"
  | "internal_transfer";

export type LedgerRiskFlag =
  | "none"
  | "duplicate"
  | "unusual_amount"
  | "high_frequency"
  | "unknown_counterparty";

export type CounterpartySummary = {
  address: string;
  count: number;
  totalUsdc: number;
};

export type CategorySummary = {
  category: LedgerCategory;
  label: string;
  count: number;
  totalUsdc: number;
};

export type DailyFlow = {
  date: string;
  spend: number;
  income: number;
};

export type LedgerReport = {
  title: string;
  rangeLabel: string;
  topCategory: string;
  likelyX402Count: number;
  topCounterparty: string;
  budgetStatus: "healthy" | "watch" | "negative";
  narrative: string;
};

export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const categoryLabels: Record<LedgerCategory, string> = {
  api_call: "API call",
  data_access: "Data access",
  compute: "Compute",
  agent_service: "Agent service",
  subscription: "Subscription",
  unknown: "Unknown",
  income: "Income",
  refund: "Refund",
  internal_transfer: "Internal transfer",
};

export function isValidWalletAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function getRangeStart(range: TimeRange) {
  const days = range === "7d" ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function getLedgerSummary(transactions: LedgerTransaction[]): LedgerSummary {
  const totalSpend = transactions
    .filter((transaction) => transaction.direction === "expense")
    .reduce((sum, transaction) => sum + transaction.amountUsdc, 0);

  const totalIncome = transactions
    .filter((transaction) => transaction.direction === "income")
    .reduce((sum, transaction) => sum + transaction.amountUsdc, 0);

  const categoryTotals = getCategorySummary(transactions);

  return {
    totalSpend,
    totalIncome,
    netFlow: totalIncome - totalSpend,
    transactionCount: transactions.length,
    likelyX402Count: transactions.filter((transaction) => transaction.isLikelyX402).length,
    topCategory: categoryTotals[0]?.category || "unknown",
    topCounterparties: getTopCounterparties(transactions),
  };
}

export function shortenAddress(address: string) {
  if (!address || address.length < 12) {
    return address || "Unknown";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUsdc(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value < 1 ? 2 : 2,
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatCategory(category: LedgerCategory) {
  return categoryLabels[category] || "Unknown";
}

function getCounterpartyStats(transactions: LedgerTransaction[]) {
  const stats = new Map<string, CounterpartySummary>();

  transactions.forEach((transaction) => {
    if (!transaction.counterparty) {
      return;
    }

    const current = stats.get(transaction.counterparty) || {
      address: transaction.counterparty,
      count: 0,
      totalUsdc: 0,
    };

    current.count += 1;
    current.totalUsdc += transaction.amountUsdc;
    stats.set(transaction.counterparty, current);
  });

  return stats;
}

export function getTopCounterparties(transactions: LedgerTransaction[]) {
  return Array.from(getCounterpartyStats(transactions).values())
    .sort((a, b) => b.count - a.count || b.totalUsdc - a.totalUsdc)
    .slice(0, 5);
}

export function enrichLedgerTransactions(transactions: LedgerTransaction[]) {
  const counterpartyStats = getCounterpartyStats(transactions);
  const hashCounts = transactions.reduce<Record<string, number>>((counts, transaction) => {
    counts[transaction.txHash] = (counts[transaction.txHash] || 0) + 1;
    return counts;
  }, {});

  return transactions.map((transaction) => {
    const stats = counterpartyStats.get(transaction.counterparty);
    const repeatedCounterparty = (stats?.count || 0) >= 2;
    const smallPayment = transaction.amountUsdc > 0 && transaction.amountUsdc <= 5;
    const tinyPayment = transaction.amountUsdc > 0 && transaction.amountUsdc < 1;
    const isLikelyX402 =
      transaction.direction === "expense" &&
      smallPayment &&
      (repeatedCounterparty || tinyPayment);

    const category = getRuleCategory(transaction, {
      isLikelyX402,
      repeatedCounterparty,
    });

    return {
      ...transaction,
      category,
      confidenceScore: getRuleConfidence(transaction, category, {
        isLikelyX402,
        repeatedCounterparty,
      }),
      memo: getRuleMemo(transaction, category, isLikelyX402),
      isLikelyX402,
      riskFlag: getRiskFlag(transaction, category, {
        duplicate: hashCounts[transaction.txHash] > 1,
        repeatedCounterparty,
      }),
      x402Reason: isLikelyX402
        ? repeatedCounterparty
          ? "small repeated payment"
          : "small pay-per-request amount"
        : "not enough signal",
    } satisfies LedgerTransaction;
  });
}

function getRuleCategory(
  transaction: LedgerTransaction,
  signals: { isLikelyX402: boolean; repeatedCounterparty: boolean },
): LedgerCategory {
  if (transaction.direction === "internal") {
    return "internal_transfer";
  }

  if (transaction.direction === "income") {
    if (transaction.amountUsdc <= 5 && signals.repeatedCounterparty) {
      return "agent_service";
    }
    return "income";
  }

  if (transaction.amountUsdc < 1) {
    return "api_call";
  }

  if (signals.isLikelyX402 && transaction.amountUsdc <= 5) {
    return "data_access";
  }

  if (transaction.amountUsdc >= 5 && transaction.amountUsdc <= 25 && signals.repeatedCounterparty) {
    return "subscription";
  }

  if (transaction.amountUsdc > 25) {
    return "compute";
  }

  return "unknown";
}

function getRuleConfidence(
  transaction: LedgerTransaction,
  category: LedgerCategory,
  signals: { isLikelyX402: boolean; repeatedCounterparty: boolean },
) {
  if (category === "unknown") {
    return 35;
  }

  if (transaction.direction === "income" || transaction.direction === "internal") {
    return 78;
  }

  if (signals.isLikelyX402 && signals.repeatedCounterparty) {
    return 86;
  }

  if (signals.isLikelyX402) {
    return 72;
  }

  return 62;
}

function getRuleMemo(
  transaction: LedgerTransaction,
  category: LedgerCategory,
  isLikelyX402: boolean,
) {
  if (transaction.direction === "income") {
    return "Incoming USDC payment";
  }

  if (transaction.direction === "internal") {
    return "Wallet self-transfer";
  }

  if (isLikelyX402) {
    return "Likely agent micropayment";
  }

  return `${formatCategory(category)} expense`;
}

function getRiskFlag(
  transaction: LedgerTransaction,
  category: LedgerCategory,
  signals: { duplicate: boolean; repeatedCounterparty: boolean },
): LedgerRiskFlag {
  if (signals.duplicate) {
    return "duplicate";
  }

  if (transaction.direction === "expense" && transaction.amountUsdc > 100) {
    return "unusual_amount";
  }

  if (signals.repeatedCounterparty && transaction.amountUsdc < 1) {
    return "high_frequency";
  }

  if (category === "unknown") {
    return "unknown_counterparty";
  }

  return "none";
}

export function getCategorySummary(transactions: LedgerTransaction[]) {
  const totals = new Map<LedgerCategory, CategorySummary>();

  transactions.forEach((transaction) => {
    const category = transaction.category || "unknown";
    const current = totals.get(category) || {
      category,
      label: formatCategory(category),
      count: 0,
      totalUsdc: 0,
    };

    current.count += 1;
    current.totalUsdc += transaction.amountUsdc;
    totals.set(category, current);
  });

  return Array.from(totals.values()).sort(
    (a, b) => b.totalUsdc - a.totalUsdc || b.count - a.count,
  );
}

export function getDailyFlows(transactions: LedgerTransaction[], range: TimeRange) {
  const days = range === "7d" ? 7 : 30;
  const flows = new Map<string, DailyFlow>();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    flows.set(date, { date, spend: 0, income: 0 });
  }

  transactions.forEach((transaction) => {
    const date = new Date(transaction.timestamp).toISOString().slice(0, 10);
    const flow = flows.get(date);
    if (!flow) {
      return;
    }

    if (transaction.direction === "expense") {
      flow.spend += transaction.amountUsdc;
    }

    if (transaction.direction === "income") {
      flow.income += transaction.amountUsdc;
    }
  });

  return Array.from(flows.values());
}

export function getLedgerReport(params: {
  transactions: LedgerTransaction[];
  summary: LedgerSummary;
  range: TimeRange;
}) {
  const categories = getCategorySummary(params.transactions);
  const topCategory = categories[0]?.label || "Unknown";
  const topCounterparty = params.summary.topCounterparties[0]?.address || "No counterparty yet";
  const rangeLabel = params.range === "7d" ? "7-day" : "30-day";
  const budgetStatus =
    params.summary.netFlow >= 0
      ? "healthy"
      : params.summary.totalSpend > params.summary.totalIncome * 1.25
        ? "negative"
        : "watch";

  return {
    title: `${rangeLabel} Agent Spend Report`,
    rangeLabel,
    topCategory,
    likelyX402Count: params.summary.likelyX402Count,
    topCounterparty,
    budgetStatus,
    narrative:
      params.summary.transactionCount === 0
        ? "No Base USDC activity found in this range."
        : `This wallet shows ${params.summary.transactionCount} USDC transfers, ${params.summary.likelyX402Count} likely x402 payments, and ${topCategory.toLowerCase()} as the leading category.`,
  } satisfies LedgerReport;
}
