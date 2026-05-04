"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import {
  enrichLedgerTransactions,
  formatCategory,
  formatUsdc,
  getCategorySummary,
  getDailyFlows,
  getLedgerReport,
  getLedgerSummary,
  shortenAddress,
} from "@/lib/ledger";
import type {
  DailyFlow,
  LedgerSummary,
  LedgerTransaction,
  TimeRange,
} from "@/lib/ledger";

type ScanResponse = {
  wallet: string;
  range: TimeRange;
  summary: LedgerSummary;
  transactions: LedgerTransaction[];
  provider?: "rules" | "openai";
  error?: string;
};

type HealthResponse = {
  ok: boolean;
  stage: string;
  services: {
    alchemy: boolean;
    supabase: boolean;
    openai: boolean;
  };
};

type RecentScan = {
  wallet: string;
  range: TimeRange;
  scannedAt: string;
};

const sampleWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const recentScansKey = "x402books_recent_scans";

const demoRows = enrichLedgerTransactions([
  {
    txHash: "0x-demo-api-call-1",
    timestamp: new Date().toISOString(),
    amountUsdc: 0.42,
    direction: "expense",
    counterparty: "0xabc0000000000000000000000000000000000000",
    from: "0xwallet",
    to: "0xabc0000000000000000000000000000000000000",
  },
  {
    txHash: "0x-demo-api-call-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    amountUsdc: 0.38,
    direction: "expense",
    counterparty: "0xabc0000000000000000000000000000000000000",
    from: "0xwallet",
    to: "0xabc0000000000000000000000000000000000000",
  },
  {
    txHash: "0x-demo-data",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    amountUsdc: 3.2,
    direction: "expense",
    counterparty: "0xdef0000000000000000000000000000000000000",
    from: "0xwallet",
    to: "0xdef0000000000000000000000000000000000000",
  },
  {
    txHash: "0x-demo-income",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    amountUsdc: 24.8,
    direction: "income",
    counterparty: "0xfeed000000000000000000000000000000000000",
    from: "0xfeed000000000000000000000000000000000000",
    to: "0xwallet",
  },
]);

function getRelativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function getChartPoints(flows: DailyFlow[]) {
  const width = 520;
  const height = 160;
  const maxValue = Math.max(
    1,
    ...flows.flatMap((flow) => [flow.spend, flow.income]),
  );

  return {
    income: flows
      .map((flow, index) => {
        const x = flows.length === 1 ? 0 : (index / (flows.length - 1)) * width;
        const y = height - (flow.income / maxValue) * height;
        return `${x},${y}`;
      })
      .join(" "),
    spend: flows
      .map((flow, index) => {
        const x = flows.length === 1 ? 0 : (index / (flows.length - 1)) * width;
        const y = height - (flow.spend / maxValue) * height;
        return `${x},${y}`;
      })
      .join(" "),
  };
}

function exportCsv(rows: LedgerTransaction[]) {
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
    ...rows.map((transaction) =>
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
      ]
        .map(escape)
        .join(","),
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

function getApiWallet(wallet: string, isDemoMode: boolean) {
  if (wallet.startsWith("0x")) {
    return wallet;
  }

  return isDemoMode ? sampleWallet : "0x...";
}

function getRecentScans() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(recentScansKey) || "[]") as RecentScan[];
  } catch {
    return [];
  }
}

function saveRecentScan(scan: RecentScan) {
  const nextScans = [
    scan,
    ...getRecentScans().filter((item) => item.wallet.toLowerCase() !== scan.wallet.toLowerCase()),
  ].slice(0, 4);

  window.localStorage.setItem(recentScansKey, JSON.stringify(nextScans));
  return nextScans;
}

export default function DashboardPage() {
  const [wallet, setWallet] = useState("");
  const [range, setRange] = useState<TimeRange>("30d");
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [copiedEndpoint, setCopiedEndpoint] = useState("");

  const rows = scan?.transactions.length ? scan.transactions : demoRows;
  const activeWallet = scan?.wallet || (isDemoMode ? "Sample wallet" : "No wallet scanned");
  const summary = useMemo(() => scan?.summary || getLedgerSummary(demoRows), [scan]);
  const categorySummary = useMemo(() => getCategorySummary(rows), [rows]);
  const dailyFlows = useMemo(() => getDailyFlows(rows, range), [range, rows]);
  const chartPoints = useMemo(() => getChartPoints(dailyFlows), [dailyFlows]);
  const report = useMemo(
    () => getLedgerReport({ range, summary, transactions: rows }),
    [range, rows, summary],
  );
  const apiWallet = getApiWallet(scan?.wallet || wallet, isDemoMode);
  const apiBase = `/api/ledger/summary?wallet=${apiWallet}&range=${range}`;
  const apiPreview = {
    total_spend: Number(summary.totalSpend.toFixed(6)),
    total_income: Number(summary.totalIncome.toFixed(6)),
    net_flow: Number(summary.netFlow.toFixed(6)),
    top_category: summary.topCategory,
    budget_status: report.budgetStatus,
  };
  const endpoints = [
    `/api/ledger/summary?wallet=${apiWallet}&range=${range}`,
    `/api/ledger/transactions?wallet=${apiWallet}&range=${range}`,
    `/api/ledger/report?wallet=${apiWallet}&period=${range}`,
  ];
  const reportHref = `/report?wallet=${encodeURIComponent(apiWallet)}&range=${range}`;

  useEffect(() => {
    setRecentScans(getRecentScans());

    fetch("/api/health")
      .then((response) => response.json())
      .then((body: HealthResponse) => setHealth(body))
      .catch(() => {
        setHealth(null);
      });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setStatus("");
    setScan(null);
    setIsDemoMode(false);

    try {
      const response = await fetch(
        `/api/scan?wallet=${encodeURIComponent(wallet)}&range=${range}`,
      );
      const body = await response.json();

      if (!response.ok) {
        setError(body.error || "Could not scan this wallet.");
        return;
      }

      setScan(body);
      setRecentScans(
        saveRecentScan({
          wallet,
          range,
          scannedAt: new Date().toISOString(),
        }),
      );
      setStatus(
        body.persistence?.persisted
          ? "Scan saved to Supabase."
          : "Scan complete. Supabase save skipped for now.",
      );
    } catch {
      setError("Could not scan this wallet right now.");
    } finally {
      setIsLoading(false);
    }
  }

  function useSampleWallet() {
    setWallet(sampleWallet);
    setScan(null);
    setError("");
    setStatus("Sample data loaded.");
    setIsDemoMode(true);
  }

  function loadRecentScan(scan: RecentScan) {
    setWallet(scan.wallet);
    setRange(scan.range);
    setStatus("Recent wallet loaded. Scan again for fresh data.");
    setError("");
  }

  async function copyEndpoint(endpoint: string) {
    const origin = window.location.origin;
    const url = `${origin}${endpoint}`;
    await window.navigator.clipboard.writeText(url);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(""), 1400);
  }

  async function categorizeRows() {
    if (!scan?.wallet) {
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
          wallet: scan.wallet,
          range,
          transactions: rows,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error || "Could not categorize transactions.");
        return;
      }

      setScan({
        wallet: scan.wallet,
        range,
        summary: body.summary,
        transactions: body.transactions,
        provider: body.provider,
      });
      setStatus(
        body.provider === "openai"
          ? "AI categorization complete."
          : "Rule categorization refreshed. Add OPENAI_API_KEY for AI.",
      );
    } catch {
      setError("Could not categorize transactions right now.");
    } finally {
      setIsCategorizing(false);
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Logo />
        <div>
          <a href="/">Back to waitlist</a>
        </div>
      </header>

      <section className="scanner-panel">
        <div>
          <p className="micro-label">Stage 1.7 report beta</p>
          <h1>Readable books for a Base wallet.</h1>
          <p>
            Scan USDC activity, identify likely x402 payments, and expose a
            clean financial summary for builders and AI agents.
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
            {isLoading ? "Scanning..." : "Scan Wallet"}
          </button>
          <button className="sample-button" type="button" onClick={useSampleWallet}>
            Try sample
          </button>
          <a className="sample-button report-link-button" href={reportHref}>
            Open report
          </a>
        </form>
        {error ? <p className="form-message error">{error}</p> : null}
        {status ? <p className="form-message success">{status}</p> : null}
      </section>

      <section className="system-panel">
        <div>
          <p className="micro-label">Stage 1.7 readiness</p>
          <h2>Private beta checks.</h2>
        </div>
        <div className="service-list">
          {[
            { label: "Alchemy", enabled: health?.services.alchemy },
            { label: "Supabase", enabled: health?.services.supabase },
            { label: "OpenAI", enabled: health?.services.openai },
          ].map(({ label, enabled }) => (
            <span className={enabled ? "status-good" : "status-muted"} key={label}>
              {label}: {enabled ? "ready" : "optional"}
            </span>
          ))}
        </div>
        {recentScans.length ? (
          <div className="recent-scans">
            <span>Recent</span>
            {recentScans.map((item) => (
              <button
                key={`${item.wallet}-${item.scannedAt}`}
                type="button"
                onClick={() => loadRecentScan(item)}
              >
                {shortenAddress(item.wallet)} · {item.range}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="dashboard-summary">
        <div>
          <span>Total Spend</span>
          <strong>{formatUsdc(summary.totalSpend)} USDC</strong>
        </div>
        <div>
          <span>Total Income</span>
          <strong>{formatUsdc(summary.totalIncome)} USDC</strong>
        </div>
        <div>
          <span>Net Flow</span>
          <strong>{formatUsdc(summary.netFlow)} USDC</strong>
        </div>
        <div>
          <span>Likely x402</span>
          <strong>{summary.likelyX402Count}</strong>
        </div>
      </section>

      <section className="insight-grid">
        <div className="chart-panel">
          <div className="panel-heading">
            <div>
              <p className="micro-label">Flow</p>
              <h2>Spend over time</h2>
            </div>
            <div className="chart-legend">
              <span>Spend</span>
              <span>Income</span>
            </div>
          </div>
          <svg
            aria-label="Spend and income over time"
            className="flow-chart"
            preserveAspectRatio="none"
            viewBox="0 0 520 160"
          >
            <polyline className="spend-line" points={chartPoints.spend} />
            <polyline className="income-line" points={chartPoints.income} />
          </svg>
        </div>

        <div className="chart-panel">
          <div className="panel-heading">
            <div>
              <p className="micro-label">Categories</p>
              <h2>Breakdown</h2>
            </div>
            <span className="panel-pill">{summary.transactionCount} tx</span>
          </div>
          <div className="category-bars">
            {categorySummary.slice(0, 5).map((category) => {
              const max = categorySummary[0]?.totalUsdc || 1;
              return (
                <div key={category.category}>
                  <div>
                    <span>{category.label}</span>
                    <strong>{formatUsdc(category.totalUsdc)}</strong>
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
      </section>

      <section className="report-panel">
        <div>
          <p className="micro-label">Report</p>
          <h2>{report.title}</h2>
          <p>{report.narrative}</p>
        </div>
        <div className="report-metrics">
          <div>
            <span>Top category</span>
            <strong>{report.topCategory}</strong>
          </div>
          <div>
            <span>Top counterparty</span>
            <strong>{shortenAddress(report.topCounterparty)}</strong>
          </div>
          <div>
            <span>Budget status</span>
            <strong>{report.budgetStatus}</strong>
          </div>
        </div>
      </section>

      <section className="api-panel">
        <div>
          <p className="micro-label">Agent API</p>
          <h2>JSON your agent can read.</h2>
          <p>
            Phase 1.5 adds wallet ledger endpoints for summary, transactions,
            and reports. Use the same wallet and range from this scan.
          </p>
          <div className="endpoint-list">
            {[apiBase, ...endpoints.slice(1)].map((endpoint) => (
              <button key={endpoint} type="button" onClick={() => copyEndpoint(endpoint)}>
                <code>GET {endpoint}</code>
                <span>{copiedEndpoint === endpoint ? "Copied" : "Copy"}</span>
              </button>
            ))}
          </div>
        </div>
        <pre>{JSON.stringify(apiPreview, null, 2)}</pre>
      </section>

      <section className="ledger-panel">
        <div className="ledger-heading">
          <div>
            <p className="micro-label">{scan ? "Live scan" : "Preview data"}</p>
            <h2>{activeWallet.startsWith("0x") ? shortenAddress(activeWallet) : activeWallet}</h2>
          </div>
          <div className="ledger-actions">
            <span>{range}</span>
            <button
              disabled={!scan || isCategorizing}
              type="button"
              onClick={categorizeRows}
            >
              {isCategorizing ? "Categorizing..." : "AI categorize"}
            </button>
            <button type="button" onClick={() => exportCsv(rows)}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="ledger-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>Type</th>
                <th>Category</th>
                <th>Counterparty</th>
                <th>Time</th>
                <th>x402</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((transaction) => (
                <tr key={`${transaction.txHash}-${transaction.counterparty}`}>
                  <td>{formatUsdc(transaction.amountUsdc)} USDC</td>
                  <td>{transaction.direction}</td>
                  <td>{formatCategory(transaction.category || "unknown")}</td>
                  <td>{shortenAddress(transaction.counterparty)}</td>
                  <td>{getRelativeTime(transaction.timestamp)}</td>
                  <td>
                    <span className={transaction.isLikelyX402 ? "status-good" : "status-muted"}>
                      {transaction.isLikelyX402 ? "likely" : "unknown"}
                    </span>
                  </td>
                  <td>{transaction.riskFlag || "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
