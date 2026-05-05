"use client";

import { FormEvent } from "react";
import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import {
  CategoryDonut,
  MetricCard,
  SpendLineChart,
  TransactionsTable,
} from "@/components/product-widgets";
import { relativeTime } from "@/lib/app-demo-data";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function DashboardPage() {
  const ledger = useLedgerState();
  const recent = ledger.transactions.slice(0, 6);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ledger.scanWallet();
  }

  return (
    <AppShell>
      <PageHeader
        title="Overview"
        description="Financial overview for the selected wallet"
        actions={
          <>
            <WalletSelect
              wallet={ledger.wallet}
              onCopy={() => ledger.copyText(ledger.wallet, "wallet")}
            />
            <DateFilter range={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <form className="scan-strip" onSubmit={onSubmit}>
        <label>
          <span>Base wallet</span>
          <input
            value={ledger.walletInput}
            onChange={(event) => ledger.setWalletInput(event.target.value)}
            placeholder="0x..."
          />
        </label>
        <button className="primary-action" disabled={ledger.isLoading} type="submit">
          {ledger.isLoading ? "Scanning..." : "Scan Wallet"}
        </button>
        <button
          className="shell-button"
          disabled={ledger.isCategorizing || !ledger.transactions.length}
          type="button"
          onClick={ledger.categorizeTransactions}
        >
          {ledger.isCategorizing ? "Categorizing..." : "AI Categorize"}
        </button>
        <button className="shell-button" type="button" onClick={ledger.exportCsv}>
          Export CSV
        </button>
        {ledger.error ? <p className="form-message error">{ledger.error}</p> : null}
        {ledger.status ? <p className="form-message success">{ledger.status}</p> : null}
      </form>

      <section className="metrics-grid">
        <MetricCard
          label="Total Spend"
          value={`$${formatUsdc(ledger.summary.totalSpend)}`}
          delta="Base USDC outflow"
        />
        <MetricCard
          label="Total Income"
          value={`$${formatUsdc(ledger.summary.totalIncome)}`}
          delta="Base USDC inflow"
          tone="green"
        />
        <MetricCard
          label="Net Flow"
          value={`${ledger.summary.netFlow >= 0 ? "+" : "-"}$${formatUsdc(Math.abs(ledger.summary.netFlow))}`}
          delta={ledger.report.budgetStatus}
          tone="purple"
        />
        <MetricCard
          label="Transactions"
          value={String(ledger.summary.transactionCount)}
          delta={`${ledger.summary.likelyX402Count} likely x402`}
          tone="cyan"
        />
      </section>

      <section className="overview-grid">
        <SpendLineChart flows={ledger.dailyFlows} />
        <CategoryDonut categories={ledger.categories} />
      </section>

      <section className="overview-grid lower">
        <div className="content-card wide">
          <div className="card-heading">
            <h2>Recent Transactions</h2>
            <a href="/transactions">View all</a>
          </div>
          {recent.length ? (
            <TransactionsTable compact transactions={recent} />
          ) : (
            <div className="empty-state compact">No USDC transactions found for this range.</div>
          )}
        </div>

        <div className="content-card">
          <div className="card-heading">
            <h2>Activity Feed</h2>
            <a href="/transactions">View all</a>
          </div>
          {recent.length ? (
            <div className="activity-list">
              {recent.slice(0, 4).map((transaction) => (
                <div key={transaction.txHash}>
                  <span className={transaction.direction === "income" ? "feed-income" : "feed-spend"}>
                    {transaction.direction === "income" ? "↗" : "↘"}
                  </span>
                  <div>
                    <strong>
                      {transaction.direction === "income" ? "Received" : "Spent"}{" "}
                      {transaction.amountUsdc.toFixed(2)} USDC
                    </strong>
                    <p>{transaction.counterparty}</p>
                  </div>
                  <small>{relativeTime(transaction.timestamp)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">Scan a wallet to populate activity.</div>
          )}
        </div>
      </section>

      <section className="cta-strip">
        <div className="cta-icon" />
        <div>
          <h2>Generate clean reports in seconds</h2>
          <p>{ledger.report.narrative}</p>
        </div>
        <a href={`/report?wallet=${encodeURIComponent(ledger.wallet)}&range=${ledger.range}`}>
          Open Report
        </a>
      </section>
    </AppShell>
  );
}
