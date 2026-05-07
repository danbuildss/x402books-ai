"use client";

import { useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchJsonDrawer,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function ReportsPage() {
  const ledger = useLedgerState();
  const [format, setFormat] = useState("CSV");
  const reportUrl = `/report?wallet=${encodeURIComponent(ledger.wallet)}&range=${ledger.range}`;
  const hasReport = ledger.hasLedger && ledger.transactions.length > 0;

  return (
    <StitchShell>
      <StitchHeader
        title="Reports"
        description="Generate and export clean financial reports."
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <button
              className="stitch-primary"
              type="button"
              onClick={() => window.location.assign(reportUrl)}
              disabled={!hasReport}
            >
              New Report
            </button>
          </>
        }
      />

      <section className="stitch-reports-grid">
        <div className="stitch-card stitch-form-card">
          <h3>Generate Report</h3>

          <label>
            <span>Wallet</span>
            <input
              value={ledger.walletInput}
              onChange={(e) => ledger.setWalletInput(e.target.value)}
              placeholder="0x..."
              style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}
            />
          </label>

          <label>
            <span>Date Range</span>
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </label>

          <label>
            <span>Report Type</span>
            <select defaultValue="Summary Report">
              <option>Summary Report</option>
              <option>Detailed Transactions</option>
              <option>Income Report</option>
            </select>
          </label>

          {/* Segmented format toggle */}
          <div>
            <span style={{ fontSize: "12px", color: "var(--st-muted)", display: "block", marginBottom: "8px" }}>
              Export Format
            </span>
            <div className="stitch-segmented" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {(["CSV", "PDF"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={format === f ? "active" : ""}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            className="stitch-primary"
            type="button"
            disabled={!hasReport}
            onClick={() => (format === "CSV" ? ledger.exportCsv() : window.location.assign(reportUrl))}
            style={{ marginTop: "4px" }}
          >
            Generate Report
          </button>
        </div>

        <div className="stitch-card">
          <h3>Recent Reports</h3>
          {hasReport ? (
            <div className="stitch-report-list">
              <div>
                <div>
                  <strong>{ledger.range === "7d" ? "7-day" : "30-day"} Summary Report</strong>
                  <p>{new Date(ledger.generatedAt).toLocaleDateString()} · {format}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (format === "CSV" ? ledger.exportCsv() : window.location.assign(reportUrl))}
                >
                  Download
                </button>
              </div>
              <div>
                <div>
                  <strong>Agent JSON</strong>
                  <p>Latest wallet ledger summary</p>
                </div>
                <button
                  type="button"
                  onClick={() => ledger.copyText(JSON.stringify(ledger.report, null, 2), "report-json")}
                >
                  {ledger.copied === "report-json" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <StitchEmpty compact>Scan a wallet to create your first report.</StitchEmpty>
          )}
        </div>
      </section>

      {/* Report preview grid */}
      <section className="stitch-card">
        <div className="stitch-card-head">
          <h3>Report Preview</h3>
          <StitchRange value={ledger.range} onChange={ledger.setRange} />
        </div>
        <div className="stitch-preview-grid">
          <div>
            <span>Total Spend</span>
            <strong style={{ fontFamily: "var(--st-mono)", color: "var(--st-red)" }}>
              ${formatUsdc(ledger.summary.totalSpend)}
            </strong>
          </div>
          <div>
            <span>Total Income</span>
            <strong style={{ fontFamily: "var(--st-mono)", color: "var(--st-green)" }}>
              ${formatUsdc(ledger.summary.totalIncome)}
            </strong>
          </div>
          <div>
            <span>Net Flow</span>
            <strong
              style={{
                fontFamily: "var(--st-mono)",
                color: ledger.summary.netFlow >= 0 ? "var(--st-green)" : "var(--st-red)",
              }}
            >
              {ledger.summary.netFlow >= 0 ? "+" : "-"}${formatUsdc(Math.abs(ledger.summary.netFlow))}
            </strong>
          </div>
          <div>
            <span>Transactions</span>
            <strong style={{ fontFamily: "var(--st-mono)" }}>{ledger.transactions.length}</strong>
          </div>
          <div>
            <span>Top Category</span>
            <strong>{ledger.categories[0]?.label || "Unknown"}</strong>
          </div>
          <div>
            <span>Top Counterparty</span>
            <strong style={{ fontFamily: "var(--st-mono)", fontSize: "13px" }}>
              {shortenAddress(ledger.summary.topCounterparties[0]?.address || "")}
            </strong>
          </div>
        </div>
      </section>

      {/* Stripe-style Developer Mode JSON drawer */}
      {hasReport && (
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Agent Output</h3>
            <StitchJsonDrawer
              data={ledger.report}
              copied={ledger.copied}
              onCopy={ledger.copyText}
            />
          </div>
          <p style={{ fontSize: "13px", color: "var(--st-muted)", lineHeight: "1.6", margin: 0 }}>
            {ledger.report.narrative}
          </p>
        </div>
      )}
    </StitchShell>
  );
}
