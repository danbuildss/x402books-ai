"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { formatCategory, formatUsdc, shortenAddress } from "@/lib/ledger";
import type { CategorySummary, LedgerReport, LedgerSummary, TimeRange } from "@/lib/ledger";

const RANGE_LABELS: Record<string, string> = {
  "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days",
};

type ReportData = {
  wallet: string;
  range: TimeRange;
  generated_at: string;
  report: LedgerReport;
  summary: LedgerSummary;
  categories: CategorySummary[];
  error?: string;
};

export default function SharedReportPage() {
  const params = useParams();
  const wallet = decodeURIComponent(String(params.wallet ?? ""));
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  async function load(w: string, r: TimeRange) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ledger/report?wallet=${encodeURIComponent(w)}&period=${r}`);
      const body = await res.json();
      if (!res.ok) { setError(body.error || "Could not load this report."); setData(null); }
      else setData(body);
    } catch {
      setError("Could not load this report right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (wallet) load(wallet, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  function handleRange(r: TimeRange) {
    setRange(r);
    if (wallet) load(wallet, r);
  }

  async function handlePdf() {
    if (!data) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: data.wallet,
          range: data.range,
          summary: data.summary,
          categories: data.categories,
          transactions: [],
          generatedAt: data.generated_at,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `x402books-${data.wallet.slice(0, 8)}-${data.range}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  async function copyLink() {
    await window.navigator.clipboard.writeText(window.location.href);
  }

  const maxCatUsdc = Math.max(...(data?.categories.map((c) => c.totalUsdc) ?? [1]));

  return (
    <main className="pub-report-page">
      {/* Header */}
      <header className="pub-report-header">
        <a href="/" className="pub-report-brand">
          <Logo />
          <span>x402Books AI</span>
        </a>
        <div className="pub-report-header-actions">
          <div className="pub-report-range">
            {(["7d", "14d", "30d", "90d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={range === r ? "active" : ""}
                onClick={() => handleRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="pub-report-btn" type="button" onClick={copyLink}>
            Share
          </button>
          {data && (
            <button className="pub-report-btn primary" type="button" onClick={handlePdf} disabled={pdfLoading}>
              {pdfLoading ? "Generating…" : "Download PDF"}
            </button>
          )}
        </div>
      </header>

      <div className="pub-report-body">
        {loading && (
          <div className="pub-report-loading">
            <span style={{ display: "inline-block", animation: "spin 0.7s linear infinite", fontSize: "28px", color: "#6DB874" }}>⟳</span>
            <p>Loading report…</p>
          </div>
        )}

        {error && !loading && (
          <div className="pub-report-error">
            <p>{error}</p>
            <a href="/registry" className="pub-report-btn primary">Open Registry</a>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Wallet + title */}
            <div className="pub-report-hero">
              <div>
                <p className="pub-report-label">Onchain Ledger Report · Last {RANGE_LABELS[data.range] ?? data.range}</p>
                <h1>{data.report.title}</h1>
                <p className="pub-report-narrative">{data.report.narrative}</p>
              </div>
              <div className="pub-report-wallet-badge">
                <span>Wallet</span>
                <strong style={{ fontFamily: "monospace" }}>{shortenAddress(data.wallet)}</strong>
                <span style={{ fontSize: "11px", color: "#6B6960" }}>
                  Generated {new Date(data.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="pub-report-stats">
              {[
                { label: "Total Spend",   value: `${formatUsdc(data.summary.totalSpend)} USDC`,   tone: "red" },
                { label: "Total Income",  value: `${formatUsdc(data.summary.totalIncome)} USDC`,  tone: "green" },
                { label: "Net Flow",      value: `${data.summary.netFlow >= 0 ? "+" : ""}${formatUsdc(data.summary.netFlow)} USDC`, tone: data.summary.netFlow >= 0 ? "green" : "red" },
                { label: "Transactions",  value: String(data.summary.transactionCount),           tone: "default" },
              ].map((s) => (
                <div key={s.label} className="pub-report-stat">
                  <span>{s.label}</span>
                  <strong style={{ color: s.tone === "green" ? "#6DB874" : s.tone === "red" ? "#B85450" : "#E8E6E1" }}>
                    {s.value}
                  </strong>
                </div>
              ))}
            </div>

            {/* Categories */}
            {data.categories.length > 0 && (
              <div className="pub-report-section">
                <h2>Categories</h2>
                <div className="pub-report-cats">
                  {data.categories.slice(0, 8).map((cat) => (
                    <div key={cat.category} className="pub-report-cat-row">
                      <span className="pub-report-cat-label">{cat.label || formatCategory(cat.category)}</span>
                      <div className="pub-report-cat-bar-track">
                        <div
                          className="pub-report-cat-bar-fill"
                          style={{ width: `${Math.max(3, (cat.totalUsdc / maxCatUsdc) * 100)}%` }}
                        />
                      </div>
                      <span className="pub-report-cat-amount">{formatUsdc(cat.totalUsdc)} USDC</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget status */}
            <div className="pub-report-section pub-report-footer-info">
              <div>
                <span>Budget status</span>
                <strong>{data.report.budgetStatus}</strong>
              </div>
              <div>
                <span>Top category</span>
                <strong>{data.report.topCategory}</strong>
              </div>
              <div>
                <span>x402 payments</span>
                <strong>{data.summary.likelyX402Count}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="pub-report-footer">
        <span>x402Books AI · Onchain financial intelligence for Base USDC</span>
        <a href="/registry">Open Registry →</a>
      </footer>
    </main>
  );
}
