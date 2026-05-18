"use client";

import { useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchJsonDrawer,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

const RANGE_LABELS: Record<string, string> = {
  "7d": "7-day", "14d": "14-day", "30d": "30-day", "90d": "90-day",
};

export default function ReportsPage() {
  const ledger = useLedgerState();
  const [format, setFormat] = useState<"CSV" | "PDF">("PDF");
  const hasReport = ledger.hasLedger && ledger.transactions.length > 0;

  function handleGenerate() {
    if (format === "CSV") ledger.exportCsv();
    else ledger.exportPdf();
  }

  const topCounterparties = ledger.summary.topCounterparties?.slice(0, 5) ?? [];
  const incomeTotal = ledger.summary.totalIncome;
  const spendTotal = ledger.summary.totalSpend;
  const gross = incomeTotal + spendTotal;

  return (
    <StitchShell>
      <StitchHeader
        title="Reports"
        description="Generate and export clean financial reports."
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <section className="stitch-reports-grid">
        {/* Generate card */}
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

          <div>
            <span style={{ fontSize: "12px", color: "var(--st-muted)", display: "block", marginBottom: "8px" }}>
              Export Format
            </span>
            <div className="stitch-segmented" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {(["PDF", "CSV"] as const).map((f) => (
                <button key={f} type="button" className={format === f ? "active" : ""} onClick={() => setFormat(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            className="stitch-primary"
            type="button"
            disabled={!hasReport}
            onClick={handleGenerate}
            style={{ marginTop: "4px" }}
          >
            <StitchIcon name={format === "PDF" ? "picture_as_pdf" : "download"} />
            Download {format}
          </button>
        </div>

        {/* Recent reports */}
        <div className="stitch-card">
          <h3>Exports</h3>
          {hasReport ? (
            <div className="stitch-report-list">
              <div>
                <div>
                  <strong>{RANGE_LABELS[ledger.range] ?? ledger.range} PDF Report</strong>
                  <p>{new Date(ledger.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <button type="button" onClick={() => ledger.exportPdf()}>
                  <StitchIcon name="picture_as_pdf" /> PDF
                </button>
              </div>
              <div>
                <div>
                  <strong>{RANGE_LABELS[ledger.range] ?? ledger.range} CSV Export</strong>
                  <p>{ledger.transactions.length} transactions</p>
                </div>
                <button type="button" onClick={() => ledger.exportCsv()}>
                  <StitchIcon name="download" /> CSV
                </button>
              </div>
              <div>
                <div>
                  <strong>Agent JSON</strong>
                  <p>Structured ledger report</p>
                </div>
                <button
                  type="button"
                  onClick={() => ledger.copyText(JSON.stringify(ledger.report, null, 2), "report-json")}
                >
                  {ledger.copied === "report-json" ? <><StitchIcon name="check" /> Copied</> : <><StitchIcon name="content_copy" /> Copy</>}
                </button>
              </div>
            </div>
          ) : (
            <StitchEmpty compact>Scan a wallet to create your first report.</StitchEmpty>
          )}
        </div>
      </section>

      {/* Summary stats preview */}
      <section className="stitch-card">
        <div className="stitch-card-head">
          <h3>Summary Preview</h3>
          <span style={{ fontSize: "11px", color: "var(--st-muted)", fontFamily: "var(--st-mono)" }}>
            {RANGE_LABELS[ledger.range] ?? ledger.range} · {ledger.wallet ? shortenAddress(ledger.wallet) : "No wallet"}
          </span>
        </div>
        <div className="stitch-preview-grid">
          <div>
            <span>Total Spend</span>
            <strong style={{ fontFamily: "var(--st-mono)", color: "var(--st-red)" }}>
              {formatUsdc(spendTotal)} USDC
            </strong>
          </div>
          <div>
            <span>Total Income</span>
            <strong style={{ fontFamily: "var(--st-mono)", color: "var(--st-green)" }}>
              {formatUsdc(incomeTotal)} USDC
            </strong>
          </div>
          <div>
            <span>Net Flow</span>
            <strong style={{ fontFamily: "var(--st-mono)", color: ledger.summary.netFlow >= 0 ? "var(--st-green)" : "var(--st-red)" }}>
              {ledger.summary.netFlow >= 0 ? "+" : ""}{formatUsdc(ledger.summary.netFlow)} USDC
            </strong>
          </div>
          <div>
            <span>Transactions</span>
            <strong style={{ fontFamily: "var(--st-mono)" }}>{ledger.transactions.length}</strong>
          </div>
          <div>
            <span>Top Category</span>
            <strong>{ledger.categories[0]?.label || "—"}</strong>
          </div>
          <div>
            <span>Flagged</span>
            <strong style={{ fontFamily: "var(--st-mono)", color: "var(--st-red)" }}>
              {ledger.transactions.filter((tx) => tx.riskFlag && tx.riskFlag !== "none").length}
            </strong>
          </div>
        </div>
      </section>

      {/* Income vs Spend breakdown */}
      {hasReport && gross > 0 && (
        <section className="stitch-card">
          <div className="stitch-card-head"><h3>Income vs Spend</h3></div>
          <div className="stitch-flow-bar-wrap">
            <div
              className="stitch-flow-bar-income"
              style={{ width: `${(incomeTotal / gross) * 100}%` }}
              title={`Income: ${formatUsdc(incomeTotal)} USDC`}
            />
            <div
              className="stitch-flow-bar-spend"
              style={{ width: `${(spendTotal / gross) * 100}%` }}
              title={`Spend: ${formatUsdc(spendTotal)} USDC`}
            />
          </div>
          <div className="stitch-flow-bar-legend">
            <span style={{ color: "var(--st-green)" }}>
              <span className="stitch-flow-dot income" />
              Income {((incomeTotal / gross) * 100).toFixed(1)}%
            </span>
            <span style={{ color: "var(--st-red)" }}>
              <span className="stitch-flow-dot spend" />
              Spend {((spendTotal / gross) * 100).toFixed(1)}%
            </span>
          </div>
        </section>
      )}

      {/* Top counterparties */}
      {topCounterparties.length > 0 && (
        <section className="stitch-card">
          <div className="stitch-card-head"><h3>Top Counterparties</h3></div>
          <div className="stitch-table-wrap">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Transactions</th>
                  <th>Total USDC</th>
                </tr>
              </thead>
              <tbody>
                {topCounterparties.map((cp, i) => (
                  <tr key={cp.address}>
                    <td style={{ color: "var(--st-muted)", fontFamily: "var(--st-mono)" }}>{i + 1}</td>
                    <td>
                      <a
                        href={`https://basescan.org/address/${cp.address}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: "var(--st-mono)", fontSize: "12px", color: "var(--st-primary)" }}
                      >
                        {shortenAddress(cp.address)}
                      </a>
                    </td>
                    <td style={{ fontFamily: "var(--st-mono)" }}>{cp.count}</td>
                    <td style={{ fontFamily: "var(--st-mono)", color: "var(--st-text)" }}>{formatUsdc(cp.totalUsdc)} USDC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Agent JSON drawer */}
      {hasReport && (
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Agent Output</h3>
            <StitchJsonDrawer data={ledger.report} copied={ledger.copied} onCopy={ledger.copyText} />
          </div>
          <p style={{ fontSize: "13px", color: "var(--st-muted)", lineHeight: "1.6", margin: 0 }}>
            {ledger.report.narrative}
          </p>
        </div>
      )}
    </StitchShell>
  );
}
