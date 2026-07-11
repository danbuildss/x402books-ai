"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/logo";
import type { AgentGDP } from "@/lib/agent-gdp";
import type { ResearchReport } from "@/lib/research-db";
import type { GDPSnapshot } from "@/lib/gdp-history";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ECO_COLORS: Record<string, string> = {
  BANKR: "#4AE8A0",
  Virtuals: "#5B8FA8",
  AEON: "#8B7CF6",
  EigenCloud: "#F97316",
  Base: "#5B9EF4",
};

// ── Sub-components ────────────────────────────────────────────────────────────


function GDPChart({ snapshots }: { snapshots: GDPSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--line)", borderRadius: 6 }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Not enough history yet</p>
      </div>
    );
  }
  const ordered = [...snapshots].sort((a, b) => new Date(a.snapshotted_at).getTime() - new Date(b.snapshotted_at).getTime());
  const vals = ordered.map((s) => s.total_revenue_usd);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 300, H = 80, PAD = 4;
  const pts = ordered.map((s, i) => {
    const x = PAD + (i / (ordered.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((s.total_revenue_usd - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const fillPts = `${PAD},${H} ` + pts + ` ${W - PAD},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
      <defs>
        <linearGradient id="gdp-fill-dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4AE8A0" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4AE8A0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#gdp-fill-dash)" />
      <polyline points={pts} fill="none" stroke="#4AE8A0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Nav icons ─────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg className="zetta-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" />
      <path d="M6 15V9h4v6" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg className="zetta-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconBar() {
  return (
    <svg className="zetta-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l4-5 3 3 2-4 3 2" />
      <path d="M1 15h14" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg className="zetta-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1" width="10" height="14" rx="1.5" />
      <path d="M6 5h4M6 8h4M6 11h2" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg className="zetta-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4L1 8l4 4M11 4l4 4-4 4" />
      <path d="M9.5 2.5l-3 11" />
    </svg>
  );
}

function IconBot() {
  return (
    <svg className="zetta-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="12" height="8" rx="2" />
      <circle cx="6" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="9" r="1" fill="currentColor" stroke="none" />
      <path d="M8 1v4M5 3h6" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  gdp: AgentGDP | null;
  reports: ResearchReport[];
  history: GDPSnapshot[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardShell({ gdp, reports, history }: DashboardShellProps) {
  const pathname = usePathname();

  const topAgents = gdp?.top_agents ?? [];

  const navItems = [
    { href: "/dashboard", label: "Home", icon: <IconHome />, soon: false },
    { href: "/registry", label: "Registry", icon: <IconGrid />, soon: false },
    { href: "/leaderboard", label: "Leaderboard", icon: <IconBar />, soon: false },
    { href: "/research", label: "Research", icon: <IconDoc />, soon: false },
    { href: "/dashboard/keys", label: "API", icon: <IconCode />, soon: false },
    { href: "/luca", label: "Luca", icon: <IconBot />, soon: true },
  ];

  const lucaTake = reports[0]?.summary
    ? reports[0].summary.slice(0, 120) + (reports[0].summary.length > 120 ? "…" : "")
    : "Agent economic activity is attributable, classifiable, and interpretable. Financial identity for autonomous systems starts here.";

  const lucaDate = reports[0]?.published_at ? fmtDate(reports[0].published_at) : "Jun 20, 2026";

  return (
    <div className="zetta-dashboard">
      {/* ── SIDEBAR ── */}
      <aside className="zetta-sidebar">
        <div className="zetta-sidebar-inner">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "4px 2px" }}>
            <LogoMark size={24} />
            <span style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink)" }}>ZETTA</span>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`zetta-nav-item${pathname === item.href ? " active" : ""}`}
                style={{ justifyContent: "space-between" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.icon}
                  {item.label}
                </span>
                {item.soon && (
                  <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 5px", borderRadius: 4, background: "rgba(74,232,160,0.12)", color: "#4AE8A0", letterSpacing: "0.05em", textTransform: "uppercase" }}>Soon</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Submit button */}
          <Link href="/registry#verify" className="zetta-submit-btn">Submit Agent</Link>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Luca card */}
          <div className="zetta-luca-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)" }}>Luca by Zetta</p>
              <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 5px", borderRadius: 4, background: "rgba(74,232,160,0.12)", color: "#4AE8A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Soon</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.45 }}>
              Chat with Luca — your financial analyst for agent books.
            </p>
            <Link href="/luca" style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)" }}>Preview →</Link>
          </div>

          {/* Bottom identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 0" }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>Z</div>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>zetta.ai</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="zetta-main">

        {/* ── Hero two-col ── */}
        <div style={{ padding: "48px 40px 0", borderBottom: "1px solid var(--line)" }}>
          <div className="zetta-dash-hero-grid">

            {/* Left: Headline */}
            <div>
              <p style={{ margin: "0 0 8px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Agent Economy Dashboard</p>
              <h1 style={{ margin: "0 0 12px", fontFamily: "var(--font-serif)", fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: "var(--ink)" }}>
                Financial intelligence<br />
                <em style={{ fontStyle: "italic", color: "#4AE8A0" }}>for the agent economy.</em>
              </h1>
              <p style={{ margin: "0 0 24px", fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.6, maxWidth: 460 }}>
                Live attribution data, revenue tracking, and ecosystem health signals across every indexed autonomous agent.
              </p>
              <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
                <Link href="/registry" className="lp-btn-primary">Explore Registry →</Link>
                <Link href="/research" className="lp-btn-ghost">View Research</Link>
              </div>

              {/* Trusted-by */}
              <div className="zetta-trusted-row" style={{ marginBottom: 32 }}>
                <span className="zetta-trusted-label">Active in</span>
                {[
                  { name: "BASE", color: "#5B9EF4" },
                  { name: "AEON", color: "#8B7CF6" },
                  { name: "BANKR", color: "#4AE8A0" },
                  { name: "EigenCloud", color: "#F97316" },
                  { name: "VIRTUALS", color: "#5B8FA8" },
                ].map((e) => (
                  <span key={e.name} className="zetta-trusted-item">
                    <span className="zetta-trusted-dot" style={{ background: e.color }} />
                    {e.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Economy Overview */}
            <div className="zetta-economy-card">
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Agent Economy Overview</span>
              </div>
              <div className="zetta-economy-grid">
                {[
                  { label: "Agent GDP", value: gdp ? fmtUSD(gdp.total_revenue_usd) : "$—" },
                  { label: "Net Income", value: gdp ? fmtUSD(gdp.total_net_income_usd) : "$—" },
                  { label: "Attributed Agents", value: gdp ? String(gdp.attributed_agents) : "—" },
                  { label: "Total Expenses", value: gdp ? fmtUSD(gdp.total_expenses_usd) : "$—" },
                ].map((s) => (
                  <div key={s.label} className="zetta-economy-stat">
                    <p className="zetta-stat-label">{s.label}</p>
                    <p className="zetta-stat-value" style={{ fontSize: "1rem" }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Three-column data grid ── */}
        <div className="zetta-data-grid">

          {/* Col 1: Top Growing Agents */}
          <div className="zetta-data-panel">
            <div className="zetta-panel-header">
              <span className="zetta-panel-title">Top Growing Agents</span>
              <Link href="/leaderboard" className="zetta-panel-link">View all →</Link>
            </div>
            <table className="zetta-agent-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Agent</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topAgents.length > 0 ? topAgents.slice(0, 6).map((agent, i) => {
                  const ecoColor = ECO_COLORS[agent.ecosystem] ?? "#4AE8A0";
                  return (
                    <tr key={agent.slug}>
                      <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ecoColor, flexShrink: 0, display: "inline-block" }} />
                          <Link href={`/registry/${agent.slug}`} style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.78rem" }}>{agent.name}</Link>
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "#4AE8A0", fontSize: "0.76rem" }}>{fmtUSD(agent.revenue_usd)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)", fontSize: "0.78rem", padding: "20px 8px" }}>
                      Financial data loads as agents submit wallet manifests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Col 2: Agent GDP Chart */}
          <div className="zetta-data-panel">
            <div className="zetta-panel-header">
              <span className="zetta-panel-title">Agent GDP (30d)</span>
              <Link href="/research" className="zetta-panel-link">Reports →</Link>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                {gdp ? fmtUSD(gdp.total_revenue_usd) : "$—"}
              </p>
            </div>
            <GDPChart snapshots={history} />
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="zetta-economy-stat">
                <p className="zetta-stat-label">Total Expenses</p>
                <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {gdp ? fmtUSD(gdp.total_expenses_usd) : "$—"}
                </p>
              </div>
              <div className="zetta-economy-stat">
                <p className="zetta-stat-label">Net Income</p>
                <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#4AE8A0" }}>
                  {gdp ? fmtUSD(gdp.total_net_income_usd) : "$—"}
                </p>
              </div>
            </div>
          </div>

          {/* Col 3: Latest Research */}
          <div className="zetta-data-panel">
            <div className="zetta-panel-header">
              <span className="zetta-panel-title">Latest Research</span>
              <Link href="/research" className="zetta-panel-link">All reports →</Link>
            </div>
            {reports.length > 0 ? reports.slice(0, 3).map((r) => (
              <div key={r.id} className="zetta-report-item">
                <span className="zetta-type-badge">{r.type}</span>
                <p style={{ margin: "4px 0 4px", fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>
                  <Link href={`/research/${r.slug}`} style={{ color: "var(--ink)" }}>{r.title}</Link>
                </p>
                <p style={{ margin: "0 0 4px", fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  {r.summary.slice(0, 100)}{r.summary.length > 100 ? "…" : ""}
                </p>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{fmtDate(r.published_at)}</span>
              </div>
            )) : (
              <p style={{ margin: "12px 0", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
                Research publishes weekly. No reports yet.
              </p>
            )}
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="zetta-bottom-grid">
          {/* Attribution Coverage */}
          <div className="zetta-bottom-panel">
            <p style={{ margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Attribution Coverage</p>
            <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, color: "var(--ink)" }}>
              {gdp && gdp.total_agents > 0
                ? `${Math.round((gdp.attributed_agents / gdp.total_agents) * 100)}%`
                : "—%"
              } attributed
            </h3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Indexed</p>
                <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{gdp ? `${gdp.total_agents}+` : "—"}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Wallets Attributed</p>
                <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{gdp ? String(gdp.attributed_wallets) : "—"}</p>
              </div>
            </div>
            <Link href="/registry#verify" className="lp-btn-primary" style={{ fontSize: "0.8rem", height: 34 }}>Submit Your Agent →</Link>
          </div>

          {/* What is Zetta */}
          <div className="zetta-bottom-panel">
            <p style={{ margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>What is Zetta?</p>
            <h3 style={{ margin: "0 0 14px", fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 700, color: "var(--ink)" }}>Financial infrastructure for autonomous agents.</h3>
            {[
              { icon: "◈", title: "Identity Layer", desc: "Wallet manifests, role attribution, ecosystem indexing." },
              { icon: "◉", title: "Classification Layer", desc: "Revenue, expenses, treasury — from raw on-chain data." },
              { icon: "◎", title: "Intelligence Layer", desc: "Luca reads attributed books and produces financial summaries." },
            ].map((f) => (
              <div key={f.title} className="zetta-feature-pill">
                <div className="zetta-feature-icon">
                  <span style={{ fontSize: "0.9rem" }}>{f.icon}</span>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 700, color: "var(--ink)" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── From the Research ── */}
        <div style={{ padding: "0 40px 40px" }}>
          <div className="zetta-data-panel">
            <div className="zetta-panel-header">
              <span className="zetta-panel-title">From the Research</span>
              <Link href="/luca" className="zetta-panel-link">Go to Luca →</Link>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: "0.85rem", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.65 }}>
              &ldquo;{lucaTake}&rdquo;
            </p>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Research &middot; {lucaDate}
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}
