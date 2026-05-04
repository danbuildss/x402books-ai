"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { formatCategory, formatUsdc, shortenAddress } from "@/lib/ledger";
import type {
  CategorySummary,
  DailyFlow,
  LedgerReport,
  LedgerSummary,
  TimeRange,
} from "@/lib/ledger";

type ReportResponse = {
  wallet: string;
  range: TimeRange;
  generated_at: string;
  report: LedgerReport;
  summary: LedgerSummary;
  categories: CategorySummary[];
  daily_flows: DailyFlow[];
  error?: string;
};

const sampleWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

function getInitialWallet() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("wallet") || "";
}

function getInitialRange() {
  if (typeof window === "undefined") {
    return "30d";
  }

  const value = new URLSearchParams(window.location.search).get("range");
  return value === "7d" ? "7d" : "30d";
}

export default function ReportPage() {
  const [wallet, setWallet] = useState("");
  const [range, setRange] = useState<TimeRange>("30d");
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const reportJson = useMemo(() => {
    if (!reportData) {
      return "{}";
    }

    return JSON.stringify(
      {
        wallet: reportData.wallet,
        range: reportData.range,
        generated_at: reportData.generated_at,
        summary: reportData.summary,
        report: reportData.report,
      },
      null,
      2,
    );
  }, [reportData]);

  async function fetchReport(nextWallet = wallet, nextRange = range) {
    const normalizedWallet = nextWallet.trim();
    if (!normalizedWallet) {
      setError("Enter a Base wallet address.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/ledger/report?wallet=${encodeURIComponent(normalizedWallet)}&period=${nextRange}`,
      );
      const body = await response.json();

      if (!response.ok) {
        setError(body.error || "Could not load this report.");
        setReportData(null);
        return;
      }

      setReportData(body);
      window.history.replaceState(
        null,
        "",
        `/report?wallet=${encodeURIComponent(normalizedWallet)}&range=${nextRange}`,
      );
    } catch {
      setError("Could not load this report right now.");
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const initialWallet = getInitialWallet();
    const initialRange = getInitialRange();

    setWallet(initialWallet);
    setRange(initialRange);

    if (initialWallet) {
      fetchReport(initialWallet, initialRange);
    }
    // The first load should only read URL params once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchReport();
  }

  async function copyJson() {
    await window.navigator.clipboard.writeText(reportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function loadSample() {
    setWallet(sampleWallet);
    setRange("30d");
    fetchReport(sampleWallet, "30d");
  }

  return (
    <main className="dashboard-page report-page">
      <header className="dashboard-header">
        <Logo />
        <div className="report-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/">Waitlist</a>
        </div>
      </header>

      <section className="scanner-panel report-hero">
        <div>
          <p className="micro-label">Stage 1.7 report</p>
          <h1>Shareable wallet report.</h1>
          <p>
            Generate a clean Base USDC report that a builder can review and an
            agent can consume as structured JSON.
          </p>
        </div>

        <form className="scanner-form" onSubmit={onSubmit}>
          <label>
            <span>Wallet address</span>
            <input
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="0x..."
              required
            />
          </label>
          <div className="range-control" aria-label="Time range">
            {(["7d", "30d"] as TimeRange[]).map((value) => (
              <button
                className={range === value ? "active" : ""}
                key={value}
                type="button"
                onClick={() => setRange(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <button className="form-submit" disabled={isLoading} type="submit">
            {isLoading ? "Loading..." : "Generate"}
          </button>
          <button className="sample-button" type="button" onClick={loadSample}>
            Try sample
          </button>
        </form>
        {error ? <p className="form-message error">{error}</p> : null}
      </section>

      {reportData ? (
        <>
          <section className="report-document">
            <div className="report-document-header">
              <div>
                <p className="micro-label">{reportData.report.rangeLabel}</p>
                <h2>{reportData.report.title}</h2>
                <p>{reportData.report.narrative}</p>
              </div>
              <div>
                <span>Wallet</span>
                <strong>{shortenAddress(reportData.wallet)}</strong>
              </div>
            </div>

            <div className="dashboard-summary">
              <div>
                <span>Total Spend</span>
                <strong>{formatUsdc(reportData.summary.totalSpend)} USDC</strong>
              </div>
              <div>
                <span>Total Income</span>
                <strong>{formatUsdc(reportData.summary.totalIncome)} USDC</strong>
              </div>
              <div>
                <span>Net Flow</span>
                <strong>{formatUsdc(reportData.summary.netFlow)} USDC</strong>
              </div>
              <div>
                <span>Likely x402</span>
                <strong>{reportData.summary.likelyX402Count}</strong>
              </div>
            </div>

            <div className="report-detail-grid">
              <div>
                <span>Top category</span>
                <strong>{reportData.report.topCategory}</strong>
              </div>
              <div>
                <span>Budget status</span>
                <strong>{reportData.report.budgetStatus}</strong>
              </div>
              <div>
                <span>Generated</span>
                <strong>{new Date(reportData.generated_at).toLocaleString()}</strong>
              </div>
            </div>
          </section>

          <section className="insight-grid">
            <div className="chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Categories</p>
                  <h2>Where money moved</h2>
                </div>
              </div>
              <div className="category-bars">
                {reportData.categories.slice(0, 6).map((category) => {
                  const max = reportData.categories[0]?.totalUsdc || 1;
                  return (
                    <div key={category.category}>
                      <div>
                        <span>{category.label || formatCategory(category.category)}</span>
                        <strong>{formatUsdc(category.totalUsdc)} USDC</strong>
                      </div>
                      <span
                        style={{
                          width: `${Math.max(8, (category.totalUsdc / max) * 100)}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="api-panel report-json-panel">
              <div>
                <p className="micro-label">Agent JSON</p>
                <h2>Machine-readable output.</h2>
                <p>Copy this object into an agent workflow or budget monitor.</p>
                <button className="sample-button" type="button" onClick={copyJson}>
                  {copied ? "Copied" : "Copy JSON"}
                </button>
              </div>
              <pre>{reportJson}</pre>
            </div>
          </section>
        </>
      ) : (
        <section className="empty-report">
          <p className="micro-label">No report loaded</p>
          <h2>Paste a wallet to generate the report.</h2>
          <p>
            This page is built for private beta sharing. It keeps the output
            focused on readable books, not raw explorer noise.
          </p>
        </section>
      )}
    </main>
  );
}
