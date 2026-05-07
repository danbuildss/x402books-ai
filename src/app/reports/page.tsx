"use client";

import { useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchRange,
  StitchShell,
  StitchTransactionsTable,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

const CATEGORY_COLORS: Record<string, string> = {
  api_call:      "#47c78b",
  data_access:   "#7aa2ff",
  compute:       "#ffbdb3",
  agent_service: "#c4a0ff",
  subscription:  "#7aa2ff",
  income:        "#47c78b",
  unknown:       "#9ca69f",
};

export default function ReportsPage() {
  const ledger = useLedgerState();
  const [format, setFormat] = useState<"CSV" | "PDF">("CSV");
  const hasReport = ledger.hasLedger && ledger.transactions.length > 0;
  const reportUrl = `/report?wallet=${encodeURIComponent(ledger.wallet)}&range=${ledger.range}`;
  const previewTx = ledger.transactions.slice(0, 5);

  return (
    <StitchShell>
      <StitchHeader
        title="Reports"
        description="Generate and export clean financial reports."
        actions={
          <>
            <StitchWalletPill
              wallet={ledger.wallet}
              onCopy={() => ledger.copyText(ledger.wallet, "wallet")}
            />
          </>
        }
      />

      <section className="stitch-reports-grid">
        {/* ---- Left: Generate form ---- */}
        <div className="stitch-card stitch-form-card">
          <h3>Generate Report</h3>

          <label>
            <span>Reporting Period</span>
            <input
              readOnly
              value={`Last ${ledger.range === "7d" ? "7" : "30"} days`}
              style={{ cursor: "default" }}
            />
          </label>

          <label>
            <span>Export Format</span>
            <div className="stitch-radio-row">
              {(["CSV", "PDF"] as const).map((f) => (
                <label key={f}>
                  <input
                    type="radio"
                    name="format"
                    checked={format === f}
                    onChange={() => setFormat(f)}
                  />
                  {f}
                </label>
              ))}
            </div>
          </label>

          <label>
            <span>Report Scope</span>
            <select defaultValue="Standard Financial Summary">
              <option>Standard Financial Summary</option>
              <option>Detailed Transactions</option>
              <option>Income Only</option>
              <option>Expense Only</option>
            </select>
          </label>

          <button
            className="stitch-primary"
            type="button"
            disabled={!hasReport}
            onClick={() =>
              format === "CSV" ? ledger.exportCsv() : window.location.assign(reportUrl)
            }
            style={{ width: "100%", justifyContent: "center" }}
          >
            <StitchIcon name="description" /> Generate Report
          </button>

          {hasReport && (
            <button
              className="stitch-button"
              type="button"
              onClick={ledger.exportCsv}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <StitchIcon name="download" /> Download CSV
            </button>
          )}
        </div>

        {/* ---- Right: Financial Intelligence ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Summary header */}
          <div className="stitch-card">
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 4px" }}>
              Financial Intelligence
            </p>
            <p style={{ fontSize: "13px", color: "var(--s-muted)", margin: "0 0 16px" }}>
              Onchain reconciliation and performance reporting for the current epoch.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              {[
                { label: "Total Income", value: `$${formatUsdc(ledger.summary.totalIncome)}`, color: "var(--s-primary)" },
                { label: "Total Spend",  value: `$${formatUsdc(ledger.summary.totalSpend)}`,  color: "var(--s-negative)" },
                { label: "Net Flow",     value: `${ledger.summary.netFlow >= 0 ? "+" : ""}$${formatUsdc(Math.abs(ledger.summary.netFlow))}`,
                  color: ledger.summary.netFlow >= 0 ? "var(--s-primary)" : "var(--s-negative)" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "20px", fontWeight: 600, color: item.color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category split + counterparties */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="stitch-card">
              <div className="stitch-card-head">
                <h3>Category Split</h3>
                <a href="/categories">View all</a>
              </div>
              {ledger.categories.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {ledger.categories.slice(0, 4).map((cat) => {
                    const color = CATEGORY_COLORS[cat.category] ?? "#9ca69f";
                    return (
                      <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: "12px", color: "var(--s-ink)" }}>{cat.label}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--s-muted)" }}>
                          ${formatUsdc(cat.totalUsdc)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <StitchEmpty compact>Scan a wallet first.</StitchEmpty>
              )}
            </div>

            <div className="stitch-card">
              <div className="stitch-card-head">
                <h3>Top Counterparties</h3>
              </div>
              {ledger.summary.topCounterparties.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {ledger.summary.topCounterparties.slice(0, 4).map((cp) => (
                    <div key={cp.address} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--s-border)", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: "11px", fontFamily: "ui-monospace, monospace", color: "var(--s-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {shortenAddress(cp.address)}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--s-ink)" }}>
                        ${formatUsdc(cp.totalUsdc)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <StitchEmpty compact>No counterparty data.</StitchEmpty>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Ledger preview table ---- */}
      <div className="stitch-card">
        <div className="stitch-card-head">
          <h3>Ledger Preview — Top Transactions</h3>
          <StitchRange value={ledger.range} onChange={ledger.setRange} />
        </div>
        {previewTx.length ? (
          <>
            <StitchTransactionsTable compact transactions={previewTx} />
            <a
              href="/transactions"
              style={{ display: "block", textAlign: "center", fontSize: "12px", color: "var(--s-primary)", marginTop: "12px" }}
            >
              Expand Full Ledger View →
            </a>
          </>
        ) : (
          <StitchEmpty>Scan a wallet to preview your ledger report.</StitchEmpty>
        )}
      </div>

      {/* ---- Agent JSON export ---- */}
      {hasReport && (
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Agent-Readable JSON</h3>
            <button
              type="button"
              onClick={() => ledger.copyText(JSON.stringify(ledger.report, null, 2), "report-json")}
            >
              {ledger.copied === "report-json" ? "Copied!" : "Copy JSON"}
            </button>
          </div>
          <pre style={{
            background: "var(--s-surface-hover)",
            border: "1px solid var(--s-border)",
            borderRadius: "6px",
            padding: "16px",
            fontFamily: "ui-monospace, monospace",
            fontSize: "12px",
            color: "var(--s-api)",
            overflow: "auto",
            margin: 0,
            maxHeight: "240px",
            lineHeight: "1.7",
          }}>
            {JSON.stringify(ledger.report, null, 2)}
          </pre>
        </div>
      )}
    </StitchShell>
  );
}
