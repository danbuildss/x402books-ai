"use client";

import { FormEvent } from "react";
import {
  StitchDonut,
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchLineChart,
  StitchRange,
  StitchScanBar,
  StitchShell,
  StitchStat,
  StitchTransactionsTable,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, relativeTime, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function DashboardPage() {
  const ledger = useLedgerState();
  const recent = ledger.transactions.slice(0, 5);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await ledger.scanWallet();
  }

  const budgetTone =
    ledger.report.budgetStatus === "healthy"
      ? "primary"
      : ledger.report.budgetStatus === "negative"
        ? "red"
        : "primary";

  return (
    <StitchShell>
      <StitchHeader
        title="Overview"
        description="Financial overview for the selected Base wallet."
        actions={
          <>
            <StitchWalletPill
              wallet={ledger.wallet}
              onCopy={() => ledger.copyText(ledger.wallet, "wallet")}
            />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <StitchScanBar
        value={ledger.walletInput}
        onChange={ledger.setWalletInput}
        onSubmit={onSubmit}
        onCategorize={ledger.categorizeTransactions}
        onExport={ledger.exportCsv}
        loading={ledger.isLoading}
        categorizing={ledger.isCategorizing}
        error={ledger.error}
        status={ledger.status}
        hasTransactions={ledger.transactions.length > 0}
      />

      {/* ---- Summary cards ---- */}
      <section className="stitch-stats-grid">
        <StitchStat
          label="Total Spend"
          value={`$${formatUsdc(ledger.summary.totalSpend)}`}
          helper="Base USDC outflow"
          icon="south_east"
          tone="red"
        />
        <StitchStat
          label="Total Income"
          value={`$${formatUsdc(ledger.summary.totalIncome)}`}
          helper="Base USDC inflow"
          icon="north_east"
          tone="primary"
        />
        <StitchStat
          label="Net Flow"
          value={`${ledger.summary.netFlow >= 0 ? "+" : ""}$${formatUsdc(Math.abs(ledger.summary.netFlow))}`}
          helper={ledger.report.budgetStatus || "—"}
          icon="monitoring"
          tone={budgetTone}
        />
        <StitchStat
          label="Transactions"
          value={String(ledger.summary.transactionCount)}
          helper={`${ledger.summary.likelyX402Count} likely x402`}
          icon="receipt_long"
          tone="blue"
        />
      </section>

      {/* ---- Charts row ---- */}
      <section className="stitch-two-grid">
        <StitchLineChart flows={ledger.dailyFlows} />
        <StitchDonut categories={ledger.categories} />
      </section>

      {/* ---- Recent transactions + activity feed ---- */}
      <section className="stitch-lower-grid">
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Recent Transactions</h3>
            <a href="/transactions">View all ledger</a>
          </div>
          {recent.length ? (
            <StitchTransactionsTable compact transactions={recent} />
          ) : (
            <StitchEmpty compact>Scan a wallet to see recent USDC transfers.</StitchEmpty>
          )}
        </div>

        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Activity Feed</h3>
            <a href="/transactions">View all</a>
          </div>
          {recent.length ? (
            <div className="stitch-feed">
              {recent.slice(0, 5).map((tx) => (
                <div key={tx.txHash} className="stitch-feed-row">
                  <div className={`stitch-feed-icon ${tx.direction === "income" ? "income" : "expense"}`}>
                    <StitchIcon
                      name={tx.direction === "income" ? "north_east" : "south_east"}
                    />
                  </div>
                  <div className="stitch-feed-body">
                    <strong>
                      {tx.direction === "income" ? "Received" : "Spent"}{" "}
                      {formatUsdc(tx.amountUsdc)} USDC
                    </strong>
                    <span>{shortenAddress(tx.counterparty)}</span>
                  </div>
                  <span className="stitch-feed-time">{relativeTime(tx.timestamp)}</span>
                </div>
              ))}
            </div>
          ) : (
            <StitchEmpty compact>Wallet activity will appear here.</StitchEmpty>
          )}
        </div>
      </section>

      {/* ---- Status bar ---- */}
      <div className="stitch-status-bar">
        <span className="status-dot" />
        <strong>Automated Auditing Active</strong>
        <span>—</span>
        <span>
          Our AI continuously verifies your onchain ledger against protocol standards.
          {ledger.hasLedger
            ? ` ${ledger.summary.transactionCount} transactions scanned.`
            : " No wallet scanned yet."}
        </span>
      </div>
    </StitchShell>
  );
}
