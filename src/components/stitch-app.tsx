"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ThemeToggle } from "@/components/effects";
import {
  formatCategory,
  formatUsdc,
  relativeTime,
  shortenAddress,
  signedAmount,
} from "@/lib/ledger";
import type { CategorySummary, DailyFlow, LedgerCategory, LedgerTransaction, TimeRange } from "@/lib/ledger";

const navGroups = [
  {
    label: "Agent",
    items: [
      { href: "/dashboard",  label: "My Agent",   icon: "manage_accounts" },
      { href: "/registry",   label: "Registry",   icon: "list_alt" },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/dashboard/keys",  label: "Developer",  icon: "code" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const pageNames: Record<string, string> = {
  "/dashboard":  "My Agent",
  "/registry":   "Registry",
  "/dashboard/keys":  "Developer",
  "/settings":   "Settings",
};

const allNavItems = navGroups.flatMap((g) => g.items);

const CATEGORY_ICONS: Record<string, string> = {
  api_call:          "electrical_plug",
  data_access:       "database",
  compute:           "memory",
  agent_service:     "smart_toy",
  subscription:      "autorenew",
  income:            "north_east",
  refund:            "undo",
  internal_transfer: "swap_horiz",
  unknown:           "help_outline",
};

// ---- Theme helpers ----

const THEME_KEY = "zetta_theme";
// Legacy keys accepted as fallback during migration (note: old code used both dash and underscore variants)
const THEME_KEY_LEGACY = ["x402books_theme", "x402books-theme"];
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(THEME_KEY)
    ?? THEME_KEY_LEGACY.map((k) => localStorage.getItem(k)).find(Boolean);
  return (v as Theme) || "dark";
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

// ---- Primitives ----

export function StitchIcon({ name }: { name: string }) {
  return <span className="material-symbols-outlined stitch-icon">{name}</span>;
}

// ---- Inline copy button ----

export function CopyBtn({
  value,
  label,
  onCopy,
  copied,
}: {
  value: string;
  label: string;
  onCopy: (v: string, k: string) => void;
  copied: string;
}) {
  const done = copied === label;
  return (
    <button
      type="button"
      className="stitch-copy-btn"
      onClick={() => onCopy(value, label)}
      title={done ? "Copied!" : "Copy"}
      aria-label="Copy"
    >
      <StitchIcon name={done ? "check" : "content_copy"} />
    </button>
  );
}

// ---- Shell ----

export function StitchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const page = pageNames[pathname] || allNavItems.find((i) => pathname.startsWith(i.href))?.label || "Overview";
  const { logout: privyLogout, user } = usePrivy();

  const initials = (() => {
    const email =
      user?.email?.address ||
      (user?.linkedAccounts?.find((a) => a.type === "email") as { address?: string } | undefined)?.address;
    if (email) return email.split("@")[0].replace(/[._-]/g, " ").trim().charAt(0).toUpperCase();
    const twitter = (user?.linkedAccounts?.find((a) => a.type === "twitter_oauth") as { username?: string } | undefined)?.username;
    if (twitter) return twitter.replace(/^@/, "").charAt(0).toUpperCase();
    return "A";
  })();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.label, true]))
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  async function handleSignOut() {
    await fetch("/api/access", { method: "DELETE" });
    try { await privyLogout(); } catch { /* ignore */ }
    window.location.assign("/");
  }

  return (
    <div className="stitch-shell">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div className="stitch-sidebar-backdrop" onClick={closeSidebar} />
      )}

      <aside className={`stitch-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="stitch-brand">
          <img src="/logo.svg" alt="Zetta" width={32} height={32} style={{ borderRadius: "7px", flexShrink: 0 }} />
          <div>
            <strong>Zetta</strong>
            <span>Onchain Ledger</span>
          </div>
          {/* Close button (mobile only) */}
          <button type="button" className="stitch-sidebar-close" onClick={closeSidebar} aria-label="Close menu">
            <StitchIcon name="close" />
          </button>
        </div>

        <nav className="stitch-nav" aria-label="App navigation">
          {navGroups.map((group) => {
            const isOpen = openGroups[group.label] ?? true;
            return (
              <div key={group.label} className="stitch-nav-group">
                <button
                  type="button"
                  className="stitch-nav-section"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                >
                  <span>{group.label}</span>
                  <StitchIcon name={isOpen ? "expand_less" : "expand_more"} />
                </button>
                <div className={`stitch-nav-items ${isOpen ? "open" : ""}`}>
                  {group.items.map((item) => {
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
                </div>
              </div>
            );
          })}
        </nav>

        <div className="stitch-sidebar-panel">
          <div className="stitch-sidebar-panel-row">
            <div className="stitch-user-badge">
              <span className="stitch-user-initials">{initials}</span>
            </div>
            <ThemeToggle />
            <button type="button" className="stitch-signout" onClick={handleSignOut}>
              <StitchIcon name="logout" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <header className="stitch-topbar">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="stitch-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <StitchIcon name="menu" />
        </button>
        <div>
          <h1>{page}</h1>
          <span className="stitch-live-dot">Base Network</span>
        </div>
        <div className="stitch-topbar-actions">
          <Link href="/api" className="stitch-topbar-link">
            <StitchIcon name="api" /> <span className="stitch-topbar-label">API Docs</span>
          </Link>
          <Link href="/dashboard" className="stitch-scan-pill">
            <StitchIcon name="search" /> <span className="stitch-topbar-label">Scan Wallet</span>
          </Link>
        </div>
      </header>

      <main className="stitch-main">{children}</main>
    </div>
  );
}

// ---- Page header ----

export function StitchHeader({
  title: _title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="stitch-page-header">
      {description && <p className="stitch-page-desc">{description}</p>}
      {actions ? <div className="stitch-page-actions">{actions}</div> : null}
    </div>
  );
}

// ---- Wallet pill ----

export function StitchWalletPill({ wallet, onCopy }: { wallet: string; onCopy: () => void }) {
  return (
    <div className="stitch-wallet-pill">
      <span>Wallet</span>
      <strong style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}>
        {wallet ? shortenAddress(wallet) : "No wallet"}
      </strong>
      <button type="button" onClick={onCopy} aria-label="Copy wallet address">
        <StitchIcon name="content_copy" />
      </button>
    </div>
  );
}

// ---- Date range ----

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7d", "14d": "14d", "30d": "30d", "90d": "90d",
};

export function StitchRange({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="stitch-range">
      {(["7d", "14d", "30d", "90d"] as TimeRange[]).map((range) => (
        <button
          className={value === range ? "active" : ""}
          key={range}
          type="button"
          onClick={() => onChange(range)}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}

// ---- AI Summary card ----

export function StitchAiSummary({
  summary,
  isLoading,
  onRefresh,
}: {
  summary: string;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="stitch-card stitch-ai-summary">
      <div className="stitch-card-head">
        <h3>
          <StitchIcon name="auto_awesome" />
          AI Insight
        </h3>
        <button type="button" className="stitch-button" onClick={onRefresh} disabled={isLoading}
          style={{ fontSize: "11px", minHeight: "26px", padding: "0 10px" }}>
          {isLoading ? "Generating…" : "Refresh"}
        </button>
      </div>
      {isLoading ? (
        <p className="stitch-ai-loading">Analysing your transactions…</p>
      ) : summary ? (
        <p className="stitch-ai-text">{summary}</p>
      ) : (
        <p className="stitch-ai-empty">Scan a wallet to generate an AI financial summary.</p>
      )}
    </section>
  );
}

// ---- Scanner bar ----

export function StitchScanBar({
  value,
  onChange,
  onSubmit,
  onCategorize,
  onExport,
  onExportPdf,
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
  onExportPdf: () => void;
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
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x..."
          spellCheck={false}
          autoComplete="off"
          style={{ fontFamily: "var(--st-mono)", fontSize: "13px" }}
        />
      </label>
      <button className="stitch-primary" disabled={loading} type="submit">
        {loading ? (
          <>
            <span style={{ display: "inline-block", animation: "spin 0.7s linear infinite", fontSize: "16px" }}>
              <StitchIcon name="sync" />
            </span>
            Scanning…
          </>
        ) : (
          <><StitchIcon name="search" /> Scan Wallet</>
        )}
      </button>
      <button className="stitch-button" disabled={categorizing || !hasTransactions} type="button" onClick={onCategorize}>
        {categorizing ? "Categorizing…" : "AI Categorize"}
      </button>
      <button className="stitch-button" disabled={!hasTransactions} type="button" onClick={onExport}>
        <StitchIcon name="download" /> CSV
      </button>
      <button className="stitch-button" disabled={!hasTransactions} type="button" onClick={onExportPdf}>
        <StitchIcon name="picture_as_pdf" /> PDF
      </button>
      {error  ? <p className="stitch-message error">{error}</p>   : null}
      {status ? <p className="stitch-message success">{status}</p> : null}
    </form>
  );
}

// ---- Stat card ----

export function StitchStat({
  label,
  value,
  helper,
  icon,
  tone = "primary",
  usd,
}: {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone?: "primary" | "blue" | "red";
  usd?: string;
}) {
  return (
    <article className="stitch-stat">
      <div>
        <span>{label}</span>
        <strong style={{ fontFamily: "var(--st-mono)", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </strong>
        {usd && <span className="stitch-stat-usd">{usd}</span>}
        <small className={`tone-${tone}`}>{helper}</small>
      </div>
      <i className={`stitch-stat-icon tone-${tone}`}>
        <StitchIcon name={icon} />
      </i>
    </article>
  );
}

// ---- Coinbase-style line chart ----

export function StitchLineChart({
  flows,
  title = "Spend Over Time",
}: {
  flows: DailyFlow[];
  title?: string;
}) {
  const visible = flows.length >= 2 ? flows : [];
  const max = Math.max(1, ...visible.map((f) => f.spend));

  const W = 640; const H = 220;
  const PL = 12; const PR = 12; const PT = 16; const PB = 24;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;

  const pts = visible.map((f, i) => ({
    x: PL + (i / (visible.length - 1)) * plotW,
    y: PT + plotH - (f.spend / max) * plotH,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = pts.length >= 2
    ? `${linePath} L${pts[pts.length - 1].x},${PT + plotH} L${pts[0].x},${PT + plotH} Z`
    : "";

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => PT + plotH * (1 - f));
  const step = Math.max(1, Math.ceil(visible.length / 7));
  const labelIdx = visible.map((_, i) => i).filter((i) => i % step === 0 || i === visible.length - 1);

  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    if (!svgRef.current || visible.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let minDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < minDist) { minDist = d; closest = i; }
    });
    setHoverIdx(closest);
  }

  const hovered = hoverIdx !== null ? visible[hoverIdx] : null;
  const hoveredPt = hoverIdx !== null ? pts[hoverIdx] : null;

  // Clamp tooltip so it doesn't overflow the SVG viewBox
  const tooltipW = 110;
  const tooltipX = hoveredPt
    ? Math.min(Math.max(hoveredPt.x - tooltipW / 2, PL), W - PR - tooltipW)
    : 0;
  const tooltipY = hoveredPt ? Math.max(hoveredPt.y - 52, PT) : 0;

  return (
    <section className="stitch-card stitch-chart-card">
      <div className="stitch-card-head">
        <h3>{title}</h3>
        <span style={{ fontSize: "11px", color: "var(--st-muted)", fontFamily: "var(--st-mono)" }}>USDC · Base</span>
      </div>
      {visible.length >= 2 ? (
        <>
          <svg
            ref={svgRef}
            className="stitch-line"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: "200px" }}
          >
            <defs>
              <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#6DB874" stopOpacity="0.30" />
                <stop offset="85%" stopColor="#6DB874" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {gridYs.map((y) => (
              <line key={y} x1={PL} y1={y} x2={W - PR} y2={y} className="stitch-grid-dash" />
            ))}
            {areaPath && <path d={areaPath} className="stitch-area-fill" />}
            <path d={linePath} className="stitch-line-stroke" />
            {pts.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y} r={hoverIdx === i ? "6" : "4"}
                className="stitch-line-dot"
                style={{ opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.35, transition: "r 100ms ease, opacity 100ms ease" }}
              />
            ))}

            {/* Crosshair */}
            {hoveredPt && (
              <line
                x1={hoveredPt.x} y1={PT} x2={hoveredPt.x} y2={PT + plotH}
                stroke="var(--st-primary)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3"
              />
            )}

            {/* Tooltip box */}
            {hovered && hoveredPt && (
              <g>
                <rect
                  x={tooltipX} y={tooltipY}
                  width={tooltipW} height={40}
                  rx="5" ry="5"
                  fill="var(--st-container)"
                  stroke="var(--st-line)"
                  strokeWidth="1"
                />
                <text
                  x={tooltipX + tooltipW / 2} y={tooltipY + 14}
                  textAnchor="middle"
                  fill="var(--st-muted)"
                  fontSize="9"
                  fontFamily="var(--st-mono)"
                >
                  {new Date(`${hovered.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </text>
                <text
                  x={tooltipX + tooltipW / 2} y={tooltipY + 30}
                  textAnchor="middle"
                  fill="var(--st-primary)"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="var(--st-mono)"
                >
                  ${formatUsdc(hovered.spend)} USDC
                </text>
              </g>
            )}

            {/* Invisible hover capture layer */}
            <rect
              x={PL} y={PT} width={plotW} height={plotH}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ cursor: "crosshair" }}
            />
          </svg>
          <div className="stitch-axis">
            {labelIdx.map((i) => (
              <span key={i} style={{ fontFamily: "var(--st-mono)", fontSize: "10px" }}>
                {new Date(`${visible[i].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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

// ---- Donut with centre total ----

export function StitchDonut({ categories }: { categories: CategorySummary[] }) {
  const total = categories.reduce((s, c) => s + c.totalUsdc, 0);
  const rows = categories.slice(0, 5);

  return (
    <section className="stitch-card stitch-donut-card">
      <div className="stitch-card-head">
        <h3>Top Categories</h3>
        <button type="button">By Spend</button>
      </div>
      {rows.length ? (
        <div className="stitch-donut-layout">
          <div className="stitch-donut-wrap">
            <div className="stitch-donut" />
            <div className="stitch-donut-centre">
              <strong>${formatUsdc(total)}</strong>
              <span>total</span>
            </div>
          </div>
          <div className="stitch-legend">
            {rows.map((cat, i) => {
              const pct = total ? Math.round((cat.totalUsdc / total) * 1000) / 10 : 0;
              return (
                <div key={cat.category}>
                  <span className={`dot-${i}`} />
                  <strong>{cat.label}</strong>
                  <small style={{ fontFamily: "var(--st-mono)" }}>${formatUsdc(cat.totalUsdc)}</small>
                  <em>{pct}%</em>
                  <div className="stitch-legend-bar">
                    <div className="stitch-legend-bar-fill" style={{
                      width: `${pct}%`,
                      color: ["var(--st-green)", "var(--st-blue)", "#8acaa6", "#c9a652", "#6e7a70"][i],
                    }} />
                  </div>
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

// ---- Stripe-style transaction table ----

const CATEGORY_LIST = Object.keys(CATEGORY_ICONS).filter((c) => c !== "income") as LedgerCategory[];

function CategoryCell({
  tx,
  onCategoryChange,
}: {
  tx: LedgerTransaction;
  onCategoryChange?: (txHash: string, category: LedgerCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cat = tx.category ?? "unknown";

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <button
        type="button"
        className={`stitch-chip ${cat}${onCategoryChange ? " stitch-chip-editable" : ""}`}
        onClick={() => onCategoryChange && setOpen((v) => !v)}
        title={onCategoryChange ? "Click to change category" : undefined}
      >
        <StitchIcon name={CATEGORY_ICONS[cat] ?? "help_outline"} />
        {formatCategory(cat)}
        {onCategoryChange && <StitchIcon name="edit" />}
      </button>
      {tx.isLikelyX402 && <span className="stitch-x402">x402</span>}
      {open && (
        <div className="stitch-category-dropdown">
          {CATEGORY_LIST.map((c) => (
            <button
              key={c}
              type="button"
              className={c === cat ? "active" : ""}
              onClick={() => { onCategoryChange?.(tx.txHash, c as LedgerCategory); setOpen(false); }}
            >
              <StitchIcon name={CATEGORY_ICONS[c] ?? "help_outline"} />
              {formatCategory(c)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StitchTransactionsTable({
  transactions,
  onSelect,
  onCategoryChange,
  notes = {},
  onNoteChange,
  compact = false,
}: {
  transactions: LedgerTransaction[];
  onSelect?: (tx: LedgerTransaction) => void;
  onCategoryChange?: (txHash: string, category: LedgerCategory) => void;
  notes?: Record<string, string>;
  onNoteChange?: (txHash: string, note: string) => void;
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
            {!compact && onNoteChange && <th>Note</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr
              key={tx.txHash}
              style={{ "--row-i": i } as React.CSSProperties}
              onClick={() => onSelect?.(tx)}
            >
              {!compact && (
                <td style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}>
                  {shortenAddress(tx.txHash)}
                </td>
              )}
              <td className={tx.direction === "income" ? "income" : "expense"}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <StitchIcon name={tx.direction === "income" ? "north_east" : "south_east"} />
                  {tx.direction === "income" ? "Income" : "Spend"}
                </span>
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <CategoryCell tx={tx} onCategoryChange={onCategoryChange} />
              </td>
              <td style={{ fontFamily: "var(--st-mono)", fontSize: "12px", color: "var(--st-muted)" }}>
                {shortenAddress(tx.counterparty)}
              </td>
              <td className={`amount ${tx.direction === "income" ? "income" : "expense"}`}
                style={{ textAlign: "right", fontFamily: "var(--st-mono)", fontVariantNumeric: "tabular-nums" }}>
                {signedAmount(tx)}
              </td>
              <td style={{ color: "var(--st-muted)", fontSize: "12px" }}>{relativeTime(tx.timestamp)}</td>
              {!compact && (
                <td style={{ color: "var(--st-muted)", fontSize: "12px" }}>{tx.confidenceScore ?? 0}%</td>
              )}
              {!compact && onNoteChange && (
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    className="stitch-note-input"
                    type="text"
                    placeholder="Add note…"
                    value={notes[tx.txHash] ?? ""}
                    onChange={(e) => onNoteChange(tx.txHash, e.target.value)}
                    maxLength={120}
                  />
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
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? 0 : (i / (values.length - 1)) * 100;
    const y = 34 - (v / max) * 30;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="stitch-mini-trend" viewBox="0 0 100 36" preserveAspectRatio="none">
      <polyline points={pts} />
    </svg>
  );
}

// ---- Empty state ----

export function StitchEmpty({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={compact ? "stitch-empty compact" : "stitch-empty"}>{children}</div>;
}

// ---- Developer Mode JSON Drawer ----

export function StitchJsonDrawer({
  data,
  copied,
  onCopy,
}: {
  data: unknown;
  copied: string;
  onCopy: (text: string, key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(data, null, 2);

  return (
    <div>
      <button
        type="button"
        className={`stitch-dev-toggle ${open ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dev-dot" />
        {"{ }"} Developer Mode
        <StitchIcon name={open ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
      </button>
      <div className={`stitch-json-drawer ${open ? "open" : ""}`}>
        <div className="stitch-json-inner">
          <div className="stitch-json-toolbar">
            <span>Agent-Readable JSON · Zetta</span>
            <button type="button" onClick={() => onCopy(json, "json-drawer")}>
              <StitchIcon name={copied === "json-drawer" ? "check" : "content_copy"} />
              {copied === "json-drawer" ? "Copied!" : "Copy JSON"}
            </button>
          </div>
          <pre className="stitch-json-pre">{json}</pre>
        </div>
      </div>
    </div>
  );
}
