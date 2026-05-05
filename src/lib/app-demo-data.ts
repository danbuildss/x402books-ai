import {
  enrichLedgerTransactions,
  getCategorySummary,
  getDailyFlows,
  getLedgerSummary,
} from "@/lib/ledger";
import type { LedgerTransaction, TimeRange } from "@/lib/ledger";

export const appWallets = [
  {
    address: "0xA1b2C3d4e5F60718293aBcD4567890eF1234C3d4",
    label: "0xA1b2...C3d4",
    status: "Active",
    balance: 124.5,
    transactions: 1248,
    lastScanned: "2m ago",
  },
  {
    address: "0xDaE5b12f901cA76B84D2e038041b725a9FaF6f97",
    label: "0xDaE5...F6g7",
    status: "Watching",
    balance: 42.8,
    transactions: 312,
    lastScanned: "1h ago",
  },
  {
    address: "0xH8i9a01234567890FfEeaB1234567890J0K1a222",
    label: "0xH8i9...J0K1",
    status: "Watching",
    balance: 0,
    transactions: 58,
    lastScanned: "1d ago",
  },
];

const now = Date.now();
const hour = 60 * 60 * 1000;

export const appTransactions = enrichLedgerTransactions([
  {
    txHash: "0x71fa9b90ce4f9fd90977ac914f25e8a6cc41b6d80f1ad481",
    timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
    amountUsdc: 0.42,
    direction: "expense",
    counterparty: "api.openrouter.ai",
    from: appWallets[0].address,
    to: "api.openrouter.ai",
  },
  {
    txHash: "0xf8c2d1408a45c7da80c2f99d967bdb31aa7889f13fca",
    timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
    amountUsdc: 1.2,
    direction: "expense",
    counterparty: "data.xyz",
    from: appWallets[0].address,
    to: "data.xyz",
  },
  {
    txHash: "0x0e9c12030c6b313978aa7246c5f35a5cc06f11abe72f",
    timestamp: new Date(now - hour).toISOString(),
    amountUsdc: 12.8,
    direction: "income",
    counterparty: "agentverse.xyz",
    from: "agentverse.xyz",
    to: appWallets[0].address,
  },
  {
    txHash: "0xaa8f90df0d7d0b7062a2dd412acd81092f88f9da2211",
    timestamp: new Date(now - 2 * hour).toISOString(),
    amountUsdc: 2.75,
    direction: "expense",
    counterparty: "compute.base.org",
    from: appWallets[0].address,
    to: "compute.base.org",
  },
  {
    txHash: "0xbb0e17dba4679902f1fe8a4f899b8000912a771ab214",
    timestamp: new Date(now - 3 * hour).toISOString(),
    amountUsdc: 8.5,
    direction: "income",
    counterparty: "aixbt.agent",
    from: "aixbt.agent",
    to: appWallets[0].address,
  },
  {
    txHash: "0xc0f9a66a2b48a9e72109884fab518905f984a17ddcda",
    timestamp: new Date(now - 4 * hour).toISOString(),
    amountUsdc: 0.8,
    direction: "expense",
    counterparty: "api.helius.xyz",
    from: appWallets[0].address,
    to: "api.helius.xyz",
  },
  {
    txHash: "0xdd8f3778fe9fc789019451ee9ce8911a278b713ddac0",
    timestamp: new Date(now - 5 * hour).toISOString(),
    amountUsdc: 0.35,
    direction: "expense",
    counterparty: "database.store",
    from: appWallets[0].address,
    to: "database.store",
  },
  {
    txHash: "0xef2330fa994fb3fbc119aa78cb0bb79ca1ff3011bd13",
    timestamp: new Date(now - 6 * hour).toISOString(),
    amountUsdc: 3.2,
    direction: "income",
    counterparty: "payme.agent",
    from: "payme.agent",
    to: appWallets[0].address,
  },
] satisfies LedgerTransaction[]);

export const appSummary = getLedgerSummary(appTransactions);
export const appCategories = getCategorySummary(appTransactions);
export const appFlows = getDailyFlows(appTransactions, "7d" as TimeRange).map((flow, index) => ({
  ...flow,
  spend: [7, 13, 8, 14, 11, 19, 28][index] || flow.spend,
  income: [0, 5, 2, 9, 4, 12, 17][index] || flow.income,
}));

export const knownCategories = [
  { key: "api_call", label: "API Calls", color: "blue", trend: [18, 22, 20, 26, 24, 31] },
  { key: "data_access", label: "Data Access", color: "purple", trend: [9, 11, 12, 10, 15, 18] },
  { key: "compute", label: "Compute", color: "cyan", trend: [7, 6, 8, 12, 9, 14] },
  { key: "agent_service", label: "Agent Services", color: "green", trend: [4, 6, 5, 8, 11, 13] },
  { key: "unknown", label: "Unknown", color: "muted", trend: [2, 2, 1, 3, 2, 2] },
];

export function relativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function signedAmount(transaction: LedgerTransaction) {
  const sign = transaction.direction === "income" ? "+" : "-";
  return `${sign}${transaction.amountUsdc.toFixed(2)} USDC`;
}
