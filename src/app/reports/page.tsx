"use client";

import { useState } from "react";
import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import { formatUsdc, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function ReportsPage() {
  const ledger = useLedgerState();
  const [format, setFormat] = useState("CSV");

  const reportUrl = `/report?wallet=${encodeURIComponent(ledger.wallet)}&range=${ledger.range}`;
  const hasReport = ledger.hasLedger && ledger.transactions.length > 0;

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Generate and export clean financial reports."
        actions={
          <>
            <WalletSelect wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <button className="primary-action" onClick={() => window.location.assign(reportUrl)}>
              New Report
            </button>
          </>
        }
      />

      <section className="reports-grid">
        <div className="content-card">
          <h2>Generate Report</h2>
          <label>
            <span>Wallet</span>
            <input
              value={ledger.walletInput}
              onChange={(event) => ledger.setWalletInput(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <label>
            <span>Date Range</span>
            <DateFilter range={ledger.range} onChange={ledger.setRange} />
          </label>
          <label>
            <span>Report Type</span>
            <select defaultValue="Summary Report">
              <option>Summary Report</option>
              <option>Detailed Transactions</option>
              <option>Income Report</option>
            </select>
          </label>
          <div className="radio-row">
            {["CSV", "PDF"].map((value) => (
              <label key={value}>
                <input
                  checked={format === value}
                  name="format"
                  type="radio"
                  onChange={() => setFormat(value)}
                />
                {value}
              </label>
            ))}
          </div>
          <button
            className="primary-action full-width"
            type="button"
            onClick={async () => {
              if (format === "CSV") ledger.exportCsv();
              else window.location.assign(reportUrl);
            }}
          >
            Generate Report
          </button>
        </div>

        <div className="content-card">
          <h2>Recent Reports</h2>
          {hasReport ? (
            <>
              <div className="report-row">
                <div>
                  <strong>{ledger.range === "7d" ? "7-day" : "30-day"} Summary Report</strong>
                  <p>{new Date(ledger.generatedAt).toLocaleDateString()} · {format}</p>
                </div>
                <button type="button" onClick={() => (format === "CSV" ? ledger.exportCsv() : window.location.assign(reportUrl))}>
                  Download
                </button>
              </div>
              <div className="report-row">
                <div>
                  <strong>Agent JSON</strong>
                  <p>Latest wallet ledger summary</p>
                </div>
                <button type="button" onClick={() => ledger.copyText(JSON.stringify(ledger.report, null, 2), "report-json")}>
                  {ledger.copied === "report-json" ? "Copied" : "Copy"}
                </button>
              </div>
              <a href={reportUrl}>View full report</a>
            </>
          ) : (
            <div className="empty-state compact">Scan a wallet to create your first report.</div>
          )}
        </div>
      </section>

      <section className="content-card report-preview-card">
        <div className="card-heading">
          <h2>Report Preview</h2>
          <DateFilter range={ledger.range} onChange={ledger.setRange} />
        </div>
        <div className="report-preview-grid">
          <div><span>Total Spend</span><strong>${formatUsdc(ledger.summary.totalSpend)}</strong></div>
          <div><span>Total Income</span><strong>${formatUsdc(ledger.summary.totalIncome)}</strong></div>
          <div><span>Net Flow</span><strong>{ledger.summary.netFlow >= 0 ? "+" : "-"}${formatUsdc(Math.abs(ledger.summary.netFlow))}</strong></div>
          <div><span>Transactions</span><strong>{ledger.transactions.length}</strong></div>
          <div><span>Top Category</span><strong>{ledger.categories[0]?.label || "Unknown"}</strong></div>
          <div><span>Top Counterparty</span><strong>{shortenAddress(ledger.summary.topCounterparties[0]?.address || "Unknown")}</strong></div>
        </div>
      </section>
    </AppShell>
  );
}
