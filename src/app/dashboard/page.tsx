"use client";

import { FormEvent } from "react";
import {
  StitchAiSummary,
  StitchDonut,
  StitchEmpty,
  StitchHeader,
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
  const recent = ledger.transactions.slice(0, 6);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ledger.scanWallet();
  }

  return (
    <StitchShell>
      <StitchHeader
        title="Overview"
        description={`Financial overview · Last ${{ "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days" }[ledger.range]}`}
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
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
        onExportPdf={ledger.exportPdf}
        loading={ledger.isLoading}
        categorizing={ledger.isCategorizing}
        error={ledger.error}
        status={ledger.status}
        hasTransactions={ledger.transactions.length > 0}
      />

      <section className="stitch-stats-grid">
        <StitchStat
          label="Total Spend"
          value={`${formatUsdc(ledger.summary.totalSpend)} USDC`}
          usd={`≈ $${formatUsdc(ledger.summary.totalSpend)} USD`}
          helper="Base USDC outflow"
          icon="south_east"
          tone="red"
        />
        <StitchStat
          label="Total Income"
          value={`${formatUsdc(ledger.summary.totalIncome)} USDC`}
          usd={`≈ $${formatUsdc(ledger.summary.totalIncome)} USD`}
          helper="Base USDC inflow"
          icon="north_east"
        />
        <StitchStat
          label="Net Flow"
          value={`${ledger.summary.netFlow >= 0 ? "+" : "-"}${formatUsdc(Math.abs(ledger.summary.netFlow))} USDC`}
          usd={`≈ ${ledger.summary.netFlow >= 0 ? "+" : "-"}$${formatUsdc(Math.abs(ledger.summary.netFlow))} USD`}
          helper={ledger.report.budgetStatus}
          icon="monitoring"
        />
        <StitchStat
          label="Transactions"
          value={String(ledger.summary.transactionCount)}
          helper={`${ledger.summary.likelyX402Count} likely x402`}
          icon="receipt_long"
          tone="blue"
        />
      </section>

      <StitchAiSummary
        summary={ledger.aiSummary}
        isLoading={ledger.isGeneratingSummary}
        onRefresh={ledger.generateAiSummary}
      />

      <section className="stitch-two-grid">
        <StitchLineChart flows={ledger.dailyFlows} />
        <StitchDonut categories={ledger.categories} />
      </section>

      <section className="stitch-lower-grid">
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Recent Transactions</h3>
            <a href="/transactions">View all</a>
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
              {recent.slice(0, 5).map((transaction) => (
                <div key={transaction.txHash}>
                  <span className={transaction.direction === "income" ? "income" : "expense"}>
                    {transaction.direction === "income" ? "north_east" : "south_east"}
                  </span>
                  <div>
                    <strong>
                      {transaction.direction === "income" ? "Received" : "Spent"} {formatUsdc(transaction.amountUsdc)} USDC
                    </strong>
                    <p>{shortenAddress(transaction.counterparty)}</p>
                  </div>
                  <small>{relativeTime(transaction.timestamp)}</small>
                </div>
              ))}
            </div>
          ) : (
            <StitchEmpty compact>Wallet activity will appear here.</StitchEmpty>
          )}
        </div>
      </section>
    </StitchShell>
  );
}

