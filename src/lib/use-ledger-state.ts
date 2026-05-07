"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCategorySummary,
  getDailyFlows,
  getLedgerReport,
  getLedgerSummary,
  isValidWalletAddress,
} from "@/lib/ledger";
import type {
  CategorySummary,
  DailyFlow,
  LedgerReport,
  LedgerSummary,
  LedgerTransaction,
  TimeRange,
} from "@/lib/ledger";

const storageKey = "x402books_active_ledger";
const recentWalletsKey = "x402books_recent_wallets";

type StoredLedger = {
  wallet: string;
  range: TimeRange;
  generatedAt: string;
  summary: LedgerSummary;
  report: LedgerReport;
  categories: CategorySummary[];
  dailyFlows: DailyFlow[];
  transactions: LedgerTransaction[];
};

type RecentWallet = {
  address: string;
  label: string;
  status: string;
  balance: number;
  transactions: number;
  lastScanned: string;
};

function readStoredLedger() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as StoredLedger) : null;
  } catch {
    return null;
  }
}

function writeStoredLedger(value: StoredLedger) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function readRecentWallets() {
  if (typeof window === "undefined") return [] as RecentWallet[];
  try {
    const value = window.localStorage.getItem(recentWalletsKey);
    return value ? (JSON.parse(value) as RecentWallet[]) : [];
  } catch {
    return [];
  }
}

function saveRecentWallet(wallet: string, ledger: StoredLedger) {
  const nextWallets = [
    {
      address: wallet,
      label: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
      status: "Active",
      balance: ledger.summary.netFlow,
      transactions: ledger.summary.transactionCount,
      lastScanned: "just now",
    },
    ...readRecentWallets().filter(
      (item) => item.address.toLowerCase() !== wallet.toLowerCase(),
    ),
  ].slice(0, 5);

  window.localStorage.setItem(recentWalletsKey, JSON.stringify(nextWallets));
  return nextWallets;
}

function emptyLedger(range: TimeRange): StoredLedger {
  const transactions: LedgerTransaction[] = [];
  const summary = getLedgerSummary(transactions);
  const report = getLedgerReport({ range, summary, transactions });

  return {
    wallet: "",
    range,
    generatedAt: new Date().toISOString(),
    summary,
    report,
    categories: [],
    dailyFlows: getDailyFlows(transactions, range),
    transactions,
  };
}

function exportCsv(transactions: LedgerTransaction[]) {
  const headers = [
    "tx_hash",
    "timestamp",
    "direction",
    "amount_usdc",
    "category",
    "counterparty",
    "is_likely_x402",
    "risk_flag",
    "memo",
  ];
  const escape = (value: string | number | boolean | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.join(","),
    ...transactions.map((transaction) =>
      [
        transaction.txHash,
        transaction.timestamp,
        transaction.direction,
        transaction.amountUsdc,
        transaction.category || "unknown",
        transaction.counterparty,
        Boolean(transaction.isLikelyX402),
        transaction.riskFlag || "none",
        transaction.memo || "",
      ].map(escape).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "x402books-ledger.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useLedgerState() {
  const [range, setRangeValue] = useState<TimeRange>("30d");
  const [walletInput, setWalletInput] = useState("");
  const [ledger, setLedger] = useState<StoredLedger | null>(null);
  const [recentWallets, setRecentWallets] = useState<RecentWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const stored = readStoredLedger();
    if (stored) {
      setLedger(stored);
      setRangeValue(stored.range);
      setWalletInput(stored.wallet);
    } else {
      setLedger(emptyLedger("30d"));
    }
    setRecentWallets(readRecentWallets());
  }, []);

  const activeLedger = ledger || emptyLedger(range);
  const transactions = activeLedger.transactions;
  const summary = activeLedger.summary || getLedgerSummary(transactions);
  const categories = activeLedger.categories?.length
    ? activeLedger.categories
    : getCategorySummary(transactions);
  const dailyFlows = activeLedger.dailyFlows?.length
    ? activeLedger.dailyFlows
    : getDailyFlows(transactions, range);
  const report = activeLedger.report || getLedgerReport({ range, summary, transactions });
  const apiWallet = activeLedger.wallet || walletInput;
  const endpoints = useMemo(
    () => [
      `/api/ledger/summary?wallet=${apiWallet || "0x..."}&range=${range}`,
      `/api/ledger/transactions?wallet=${apiWallet || "0x..."}&range=${range}`,
      `/api/ledger/report?wallet=${apiWallet || "0x..."}&period=${range}`,
    ],
    [apiWallet, range],
  );

  async function scanWallet(nextWallet = walletInput, nextRange = range) {
    const wallet = nextWallet.trim();
    if (!isValidWalletAddress(wallet)) {
      setError("Enter a valid Base wallet address.");
      return null;
    }

    setIsLoading(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch(
        `/api/scan?wallet=${encodeURIComponent(wallet)}&range=${nextRange}`,
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Could not scan this wallet.");
        return null;
      }

      const nextLedger: StoredLedger = {
        wallet: body.wallet,
        range: body.range,
        generatedAt: body.generatedAt,
        summary: body.summary,
        report: body.report,
        categories: body.categories || getCategorySummary(body.transactions || []),
        dailyFlows: body.dailyFlows || getDailyFlows(body.transactions || [], body.range),
        transactions: body.transactions || [],
      };

      setLedger(nextLedger);
      setRangeValue(nextLedger.range);
      setWalletInput(nextLedger.wallet);
      writeStoredLedger(nextLedger);
      setRecentWallets(saveRecentWallet(nextLedger.wallet, nextLedger));
      setStatus(
        nextLedger.transactions.length
          ? `Scan complete: ${nextLedger.transactions.length} USDC transfers found.`
          : "Scan complete: no Base USDC transfers found in this range.",
      );
      return nextLedger;
    } catch {
      setError("Could not scan this wallet right now.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function categorizeTransactions() {
    if (!isValidWalletAddress(activeLedger.wallet)) {
      setError("Scan a wallet before running AI categorization.");
      return;
    }

    setIsCategorizing(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: activeLedger.wallet,
          range,
          transactions,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Could not categorize transactions.");
        return;
      }

      const nextLedger: StoredLedger = {
        ...activeLedger,
        summary: body.summary,
        report: body.report,
        categories: getCategorySummary(body.transactions || []),
        dailyFlows: getDailyFlows(body.transactions || [], range),
        transactions: body.transactions || [],
      };

      setLedger(nextLedger);
      writeStoredLedger(nextLedger);
      setStatus(
        body.provider === "claude"
          ? "AI categorization complete (Claude)."
          : "Rule-based categorization applied. Add ANTHROPIC_API_KEY for live AI.",
      );
    } catch {
      setError("Could not categorize transactions right now.");
    } finally {
      setIsCategorizing(false);
    }
  }

  async function copyText(value: string, label = value) {
    if (!value || value.includes("0x...")) {
      setError("Scan a wallet before copying this value.");
      return;
    }
    await window.navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1400);
  }

  function updateRange(nextRange: TimeRange) {
    setRangeValue(nextRange);
    if (activeLedger.wallet && isValidWalletAddress(activeLedger.wallet)) {
      scanWallet(activeLedger.wallet, nextRange);
    } else {
      setLedger(emptyLedger(nextRange));
    }
  }

  return {
    walletInput,
    setWalletInput,
    wallet: activeLedger.wallet,
    range,
    setRange: updateRange,
    transactions,
    summary,
    categories,
    dailyFlows,
    report,
    generatedAt: activeLedger.generatedAt,
    endpoints,
    recentWallets,
    isLoading,
    isCategorizing,
    error,
    status,
    copied,
    hasLedger: Boolean(activeLedger.wallet),
    scanWallet,
    categorizeTransactions,
    exportCsv: () => exportCsv(transactions),
    copyText,
  };
}
