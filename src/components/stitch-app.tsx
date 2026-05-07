"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import {
  formatCategory,
  formatUsdc,
  relativeTime,
  shortenAddress,
  signedAmount,
} from "@/lib/ledger";
import type { CategorySummary, DailyFlow, LedgerTransaction, TimeRange } from "@/lib/ledger";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: "receipt_long" },
  { href: "/categories", label: "Categories", icon: "category" },
  { href: "/reports", label: "Reports", icon: "description" },
  { href: "/wallets", label: "Wallets", icon: "account_balance_wallet" },
  { href: "/api", label: "API", icon: "api" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const pageNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/transactions": "Transactions",
  "/categories": "Categories",
  "/reports": "Reports",
  "/wallets": "Wallets",
  "/api": "API",
  "/settings": "Settings",
};

export function StitchIcon({ name }: { name: string }) {
  return <span className="material-symbols-outlined stitch-icon">{name}</span>;
}

export function StitchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const page = pageNames[pathname] || "Overview";

  return (
    <div className="stitch-shell">
      <aside className="stitch-sidebar">
        <div className="stitch-brand">
          <div className="stitch-cube">
            <StitchIcon name="deployed_code" />
          </div>
          <div>
            <strong>x402Books AI</strong>
            <span>Onchain Ledger</span>
          </div>
        </div>

        <nav className="stitch-nav" aria-label="App navigation">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link className={active ? "active" : ""} href={item.href} key={item.href}>
                <StitchIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="stitch-sidebar-panel">
          <span>Private Beta</span>
          <strong>Stage 1</strong>
          <p>Wallet scans, reports, exports, and agent ledger APIs.</p>
        </div>
      </aside>

      <header className="stitch-topbar">
        <div>
          <h1>{page}</h1>
          <p>Financial visibility for AI agents.</p>
        </div>
        <div className="stitch-topbar-actions">
          <Link href="/dashboard">Scan Wallet</Link>
          <Link href="/api">API Docs</Link>
        </div>
      </header>

      <main className="stitch-main">{children}</main>
    </div>
  );
}

export function StitchHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="stitch-page-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="stitch-page-actions">{actions}</div> : null}
    </div>
  );
}

export function StitchWalletPill({ wallet, onCopy }: { wallet: string; onCopy: () => void }) {
  return (
    <div className="stitch-wallet-pill">
      <span>Wallet</span>
      <strong>{wallet ? shortenAddress(wallet) : "No wallet"}</strong>
      <button type="button" onClick={onCopy} aria-label="Copy wallet">
        <StitchIcon name="content_copy" />
      </button>
    </div>
  );
}

export function StitchRange({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="stitch-range">
      {(["7d", "30d"] as const).map((range) => (
        <button
          className={value === range ? "active" : ""}
          key={range}
          type="button"
          onClick={() => onChange(range)}
        >
          {range === "7d" ? "Last 7 days" : "Last 30 days"}
        </button>
      ))}
    </div>
  );
}

export function StitchScanBar({
  value,
  onChange,
  onSubmit,
  onCategorize,
  onExport,
  loading,
  categorizing,
  error,
  status,
  hasTransactions,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCategorize: () => void;
  onExport: () => void;
  loading: boolean;
  categorizing: boolean;
  error: string;
  status: string;
  hasTransactions: boolean;
}) {
  return (
    <form className="stitch-scanbar" onSubmit={onSubmit}>
      <label>
        <span>Base wallet</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="0x..." />
      </label>
      <button className="stitch-primary" disabled={loading} type="submit">
        {loading ? "Scanning..." : "Scan Wallet"}
      </button>
      <button className="stitch-button" disabled={categorizing || !hasTransactions} type="button" onClick={onCategorize}>
        {categorizing ? "Categorizing..." : "AI Categorize"}
      </button>
      <button className="stitch-button" disabled={!hasTransactions} type="button" onClick={onExport}>
        Export CSV
      </button>
      {error ? <p className="stitch-message error">{error}</p> : null}
      {status ? <p className="stitch-message success">{status}</p> : null}
    </form>
  );
}

export function StitchStat({
  label,
  value,
  helper,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone?: "primary" | "blue" | "red";
}) {
  return (
    <article className="stitch-stat">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={`tone-${tone}`}>{helper}</small>
      </div>
      <i className={`stitch-stat-icon tone-${tone}`}>
        <StitchIcon name={icon} />
      </i>
    </article>
  );
}

export function StitchLineChart({ flows, title = "Spend Over Time" }: { flows: DailyFlow[]; title?: string }) {
  const visible = flows.length ? flows : [];
  const max = Math.max(1, ...visible.map((flow) => flow.spend));
  const points = visible
    .map((flow, index) => {
      const x = visible.length === 1 ? 12 : 12 + (index / (visible.length - 1)) * 616;
      const y = 202 - (flow.spend / max) * 174;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="stitch-card stitch-chart-card">
      <div className="stitch-card-head">
        <h3>{title}</h3>
        <button type="button">By Spend</button>
      </div>
      {visible.length ? (
        <>
          <svg className="stitch-line" viewBox="0 0 640 220" preserveAspectRatio="none">
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1="12" x2="628" y1={32 + line * 48} y2={32 + line * 48} />
            ))}
            <polyline points={points} />
            {visible.map((flow, index) => {
              const x = visible.length === 1 ? 12 : 12 + (index / (visible.length - 1)) * 616;
              const y = 202 - (flow.spend / max) * 174;
              return <circle cx={x} cy={y} key={flow.date} r="4" />;
            })}
          </svg>
          <div className="stitch-axis">
            {visible.map((flow) => (
              <span key={flow.date}>
                {new Date(`${flow.date}T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ))}
          </div>
        </>
      ) : (
        <StitchEmpty compact>Scan a wallet to chart Base USDC spend.</StitchEmpty>
      )}
    </section>
  );
}

export function StitchDonut({ categories }: { categories: CategorySummary[] }) {
  const total = categories.reduce((sum, category) => sum + category.totalUsdc, 0);
  const rows = categories.slice(0, 5);

  return (
    <section className="stitch-card stitch-donut-card">
      <div className="stitch-card-head">
        <h3>Top Categories</h3>
        <button type="button">By Spend</button>
      </div>
      {rows.length ? (
        <div className="stitch-donut-layout">
          <div className="stitch-donut" />
          <div className="stitch-legend">
            {rows.map((category, index) => {
              const percent = total ? Math.round((category.totalUsdc / total) * 1000) / 10 : 0;
              return (
                <div key={category.category}>
                  <span className={`dot-${index}`} />
                  <strong>{category.label}</strong>
                  <small>${formatUsdc(category.totalUsdc)}</small>
                  <em>{percent}%</em>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <StitchEmpty compact>Categories appear after a wallet scan.</StitchEmpty>
      )}
    </section>
  );
}

export function StitchTransactionsTable({
  transactions,
  onSelect,
  compact = false,
}: {
  transactions: LedgerTransaction[];
  onSelect?: (transaction: LedgerTransaction) => void;
  compact?: boolean;
}) {
  return (
    <div className="stitch-table-wrap">
      <table className="stitch-table">
        <thead>
          <tr>
            {!compact ? <th>Tx Hash</th> : null}
            <th>Type</th>
            <th>Category</th>
            <th>Counterparty</th>
            <th>Amount</th>
            <th>{compact ? "Time" : "Timestamp"}</th>
            {!compact ? <th>AI Confidence</th> : null}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.txHash} onClick={() => onSelect?.(transaction)}>
              {!compact ? <td className="mono">{shortenAddress(transaction.txHash)}</td> : null}
              <td className={transaction.direction === "income" ? "income" : "expense"}>
                {transaction.direction === "income" ? "Income" : "Spend"}
              </td>
              <td>
                <span className={`stitch-chip ${transaction.category || "unknown"}`}>
                  {formatCategory(transaction.category || "unknown")}
                </span>
              </td>
              <td className="mono">{shortenAddress(transaction.counterparty)}</td>
              <td className={transaction.direction === "income" ? "income amount" : "expense amount"}>
                {signedAmount(transaction)}
              </td>
              <td>{relativeTime(transaction.timestamp)}</td>
              {!compact ? <td>{transaction.confidenceScore || 0}%</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StitchEmpty({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={compact ? "stitch-empty compact" : "stitch-empty"}>{children}</div>;
}

export function StitchMiniTrend({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 34 - (value / max) * 30;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="stitch-mini-trend" viewBox="0 0 100 36" preserveAspectRatio="none">
      <polyline points={points} />
    </svg>
  );
}

