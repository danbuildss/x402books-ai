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

const NAV = [
  { href: "/dashboard",    label: "Overview",      icon: "dashboard" },
  { href: "/transactions", label: "Transactions",  icon: "receipt_long" },
  { href: "/categories",   label: "Categories",    icon: "category" },
  { href: "/reports",      label: "Reports",       icon: "description" },
  { href: "/wallets",      label: "Wallets",       icon: "account_balance_wallet" },
  { href: "/api",          label: "API",           icon: "api" },
  { href: "/settings",     label: "Settings",      icon: "settings" },
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard":    "Overview",
  "/transactions": "Transactions",
  "/categories":   "Categories",
  "/reports":      "Reports",
  "/wallets":      "Wallets",
  "/api":          "API",
  "/settings":     "Settings",
};

const DONUT_COLORS = ["#47c78b", "#7aa2ff", "#ffbdb3", "#c4a0ff", "#9ca69f"];

// ---- Primitives ----

export function StitchIcon({ name, style }: { name: string; style?: string }) {
  const cls = ["material-symbols-outlined", style].filter(Boolean).join(" ");
  return <span className={cls}>{name}</span>;
}

// ---- Shell ----

export function StitchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const page = PAGE_LABELS[pathname] ?? "Overview";

  return (
    <div className="stitch-shell">
      {/* Sidebar */}
      <aside className="stitch-sidebar">
        <div className="stitch-brand">
          <div className="stitch-cube">
            <StitchIcon name="auto_stories" />
          </div>
          <div>
            <strong>x402Books AI</strong>
            <span>Onchain Ledger</span>
          </div>
        </div>

        <nav className="stitch-nav" aria-label="App navigation">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <StitchIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="stitch-sidebar-cta">
          <Link href="/dashboard">
            <StitchIcon name="search" />
            Scan Wallet
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="stitch-content">
        <header className="stitch-topbar">
          <div className="stitch-topbar-left">
            <span>x402Books AI</span>
            <StitchIcon name="chevron_right" />
            <span className="current-page">{page.toUpperCase()}</span>
          </div>
          <div className="stitch-topbar-right">
            <button className="stitch-icon-btn" aria-label="Notifications">
              <StitchIcon name="notifications" />
            </button>
            <button className="stitch-icon-btn" aria-label="Help">
              <StitchIcon name="help" />
            </button>
            <div className="stitch-avatar">AI</div>
          </div>
        </header>

        <main className="stitch-main">{children}</main>
      </div>
    </div>
  );
}

// ---- Page header ----

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

// ---- Wallet pill ----

export function StitchWalletPill({ wallet, onCopy }: { wallet: string; onCopy: () => void }) {
  return (
    <div className="stitch-wallet-pill">
      <span>Wallet</span>
      <strong>{wallet ? shortenAddress(wallet) : "—"}</strong>
      <button type="button" onClick={onCopy} aria-label="Copy wallet address">
        <StitchIcon name="content_copy" />
      </button>
    </div>
  );
}

// ---- Date range ----

export function StitchRange({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  return (
    <div className="stitch-range">
      {(["7d", "30d"] as const).map((r) => (
        <button
          key={r}
          type="button"
          className={value === r ? "active" : ""}
          onClick={() => onChange(r)}
        >
          {r === "7d" ? "7 Days" : "30 Days"}
        </button>
      ))}
    </div>
  );
}

// ---- Scanner bar ----

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
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
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
        <span>Base Wallet</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste 0x address..."
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <button className="stitch-primary" type="submit" disabled={loading}>
        {loading ? (
          <>
            <StitchIcon name="sync" /> Scanning…
          </>
        ) : (
          <>
            <StitchIcon name="search" /> Scan
          </>
        )}
      </button>
      <button
        className="stitch-button"
        type="button"
        disabled={categorizing || !hasTransactions}
        onClick={onCategorize}
      >
        {categorizing ? "Categorizing…" : "AI Categorize"}
      </button>
      <button
        className="stitch-button"
        type="button"
        disabled={!hasTransactions}
        onClick={onExport}
      >
        <StitchIcon name="download" /> CSV
      </button>
      {error  ? <p className="stitch-message error">{error}</p>   : null}
      {status ? <p className="stitch-message success">{status}</p> : null}
    </form>
  );
}

// ---- Stat card ----

function helperTone(tone: "primary" | "blue" | "red"): string {
  if (tone === "red")  return "red";
  if (tone === "blue") return "blue";
  return "green";
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
  const t = helperTone(tone);
  return (
    <article className="stitch-stat">
      <div className="stitch-stat-body">
        <span className="stitch-stat-label">{label}</span>
        <span className="stitch-stat-value">{value}</span>
        {helper ? <span className={`stitch-stat-helper ${t}`}>{helper}</span> : null}
      </div>
      <div className={`stitch-stat-icon ${t}`}>
        <StitchIcon name={icon} />
      </div>
    </article>
  );
}

// ---- Spend-over-time area chart ----

export function StitchLineChart({
  flows,
  title = "Spend Over Time",
}: {
  flows: DailyFlow[];
  title?: string;
}) {
  const W = 560;
  const H = 140;
  const PL = 4; const PR = 4; const PT = 12; const PB = 8;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const visible = flows.length >= 2 ? flows : [];
  const max = Math.max(0.01, ...visible.map((f) => f.spend));

  const pts = visible.map((f, i) => ({
    x: PL + (i / (visible.length - 1)) * plotW,
    y: PT + plotH - (f.spend / max) * plotH,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath =
    pts.length >= 2
      ? `${linePath} L${pts[pts.length - 1].x},${PT + plotH} L${pts[0].x},${PT + plotH} Z`
      : "";

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => PT + plotH * (1 - f));

  // Show every Nth label so they don't overlap
  const maxLabels = 8;
  const step = Math.max(1, Math.ceil(visible.length / maxLabels));
  const labelIndices = visible.map((_, i) => i).filter((i) => i % step === 0 || i === visible.length - 1);

  return (
    <section className="stitch-card stitch-chart-card">
      <div className="stitch-card-head">
        <h3>{title}</h3>
        <span style={{ fontSize: "11px", color: "var(--s-muted)" }}>USDC Spend</span>
      </div>

      {visible.length >= 2 ? (
        <>
          <svg
            className="stitch-line-svg"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#47c78b" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#47c78b" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {gridLines.map((y) => (
              <line key={y} x1={PL} y1={y} x2={W - PR} y2={y} className="stitch-grid-line" />
            ))}

            {areaPath && <path d={areaPath} className="stitch-area-path" />}
            <path d={linePath} className="stitch-line-path" />

            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" className="stitch-dot" />
            ))}
          </svg>

          <div className="stitch-axis">
            {labelIndices.map((i) => (
              <span key={i}>
                {new Date(`${visible[i].date}T00:00:00`).toLocaleDateString("en-US", {
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

// ---- Donut chart ----

export function StitchDonut({ categories }: { categories: CategorySummary[] }) {
  const total = categories.reduce((s, c) => s + c.totalUsdc, 0);
  const rows   = categories.slice(0, 5);

  const R   = 38;
  const CX  = 50;
  const CY  = 50;
  const CIRC = 2 * Math.PI * R;
  const GAP  = total > 0 ? 2 : 0;

  let cursor = 0;
  const segments = rows.map((cat, i) => {
    const pct   = total > 0 ? (cat.totalUsdc / total) * 100 : 0;
    const len   = Math.max(0, (pct / 100) * CIRC - GAP);
    const offset = -cursor;
    cursor += (pct / 100) * CIRC;
    return { pct, len, offset, color: DONUT_COLORS[i], label: cat.label, spend: cat.totalUsdc };
  });

  return (
    <section className="stitch-card stitch-donut-card">
      <div className="stitch-card-head">
        <h3>Top Categories</h3>
        <span style={{ fontSize: "11px", color: "var(--s-muted)" }}>By Spend</span>
      </div>

      {rows.length ? (
        <div className="stitch-donut-layout">
          <svg className="stitch-donut-svg" viewBox="0 0 100 100">
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--s-border)"
              strokeWidth="12"
            />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${seg.len} ${CIRC - seg.len}`}
                strokeDashoffset={seg.offset}
                transform={`rotate(-90 ${CX} ${CY})`}
              />
            ))}
          </svg>

          <div className="stitch-legend">
            {segments.map((seg, i) => (
              <div key={i}>
                <span className="stitch-legend-dot" style={{ background: seg.color }} />
                <strong>{seg.label}</strong>
                <em>{seg.pct.toFixed(1)}%</em>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <StitchEmpty compact>Categories appear after a wallet scan.</StitchEmpty>
      )}
    </section>
  );
}

// ---- Transactions table ----

export function StitchTransactionsTable({
  transactions,
  onSelect,
  compact = false,
}: {
  transactions: LedgerTransaction[];
  onSelect?: (tx: LedgerTransaction) => void;
  compact?: boolean;
}) {
  return (
    <div className="stitch-table-wrap">
      <table className="stitch-table">
        <thead>
          <tr>
            {!compact && <th>Tx Hash</th>}
            <th>Type</th>
            <th>Category</th>
            <th>Counterparty</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th>{compact ? "Time" : "Timestamp"}</th>
            {!compact && <th>Confidence</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.txHash} onClick={() => onSelect?.(tx)}>
              {!compact && <td className="mono">{shortenAddress(tx.txHash)}</td>}
              <td>
                <span className={`stitch-dir ${tx.direction === "income" ? "income" : "expense"}`}>
                  <StitchIcon name={tx.direction === "income" ? "north_east" : "south_east"} />
                  {tx.direction === "income" ? "Income" : "Spend"}
                </span>
              </td>
              <td>
                <span className={`stitch-chip ${tx.category ?? "unknown"}`}>
                  {formatCategory(tx.category ?? "unknown")}
                </span>
                {tx.isLikelyX402 && <span className="stitch-x402">x402</span>}
              </td>
              <td className="mono">{shortenAddress(tx.counterparty)}</td>
              <td className={`amount ${tx.direction === "income" ? "income" : "expense"}`}>
                {signedAmount(tx)}
              </td>
              <td style={{ color: "var(--s-muted)", fontSize: "12px" }}>
                {relativeTime(tx.timestamp)}
              </td>
              {!compact && (
                <td style={{ color: "var(--s-muted)", fontSize: "12px" }}>
                  {tx.confidenceScore ?? 0}%
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Mini sparkline ----

export function StitchMiniTrend({ values }: { values: number[] }) {
  const max = Math.max(0.01, ...values);
  const pts = values
    .map((v, i) => {
      const x = values.length <= 1 ? 40 : (i / (values.length - 1)) * 80;
      const y = 22 - (v / max) * 20;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="stitch-mini-trend" viewBox="0 0 80 26" preserveAspectRatio="none">
      <polyline points={pts} />
    </svg>
  );
}

// ---- Empty state ----

export function StitchEmpty({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? "stitch-empty compact" : "stitch-empty"}>
      {children}
    </div>
  );
}
