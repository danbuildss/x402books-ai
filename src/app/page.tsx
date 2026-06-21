import Link from "next/link";
import { FadeContent } from "@/components/effects";
import { HomeHeader } from "./home-header";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedGlobe } from "@/components/animated-globe";
import { HomeSignals } from "@/components/home-signals";
import { getAgentGDP } from "@/lib/agent-gdp";
import { listReports } from "@/lib/research-db";
import { getGDPHistory } from "@/lib/gdp-history";
import type { AgentGDP } from "@/lib/agent-gdp";
import type { ResearchReport } from "@/lib/research-db";
import type { GDPSnapshot } from "@/lib/gdp-history";

export const revalidate = 3600;

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
  BANKR: "#6DB874",
  Virtuals: "#5B8FA8",
  AEON: "#8B5CF6",
  EigenCloud: "#F97316",
  Base: "#4F46E5",
};



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
        <linearGradient id="gdp-fill-lp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6DB874" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6DB874" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#gdp-fill-lp)" />
      <polyline points={pts} fill="none" stroke="#6DB874" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let gdp: AgentGDP | null = null;
  let reports: ResearchReport[] = [];
  let history: GDPSnapshot[] = [];

  try { gdp = await getAgentGDP(); } catch { /* unavailable */ }
  try { reports = await listReports(3); } catch { /* unavailable */ }
  try { history = await getGDPHistory(30); } catch { /* unavailable */ }

  const topAgents = gdp?.top_agents ?? [];

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 40px 0" }}>
        <div className="zetta-hero-grid">
          {/* Left: Copy */}
          <div>
            <FadeContent>
              <p className="lp-eyebrow">Zetta · Financial Intelligence Platform</p>
              <h1 className="lp-h1" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", maxWidth: 540 }}>
                Financial Intelligence<br />
                for the{" "}
                <em style={{ fontStyle: "italic", color: "#6DB874" }}>Agent Economy.</em>
              </h1>
              <p className="lp-hero-sub">
                Autonomous agents earn, spend, and manage capital on-chain. Zetta is the attribution layer that turns wallet activity into auditable books: revenue, expenses, treasury, and net income — per agent.
              </p>
              <div className="lp-hero-actions" style={{ marginBottom: 28 }}>
                <Link href="/registry" className="lp-btn-primary lp-btn-lg">Explore Registry →</Link>
                <Link href="/research" className="lp-btn-ghost lp-btn-lg">View Research</Link>
              </div>

              {/* Trusted-by row */}
              <div className="zetta-trusted-row">
                <span className="zetta-trusted-label">Active in</span>
                {[
                  { name: "BASE", color: "#4F46E5" },
                  { name: "AEON", color: "#8B5CF6" },
                  { name: "BANKR", color: "#6DB874" },
                  { name: "EigenCloud", color: "#F97316" },
                  { name: "VIRTUALS", color: "#5B8FA8" },
                ].map((e) => (
                  <span key={e.name} className="zetta-trusted-item">
                    <span className="zetta-trusted-dot" style={{ background: e.color }} />
                    {e.name}
                  </span>
                ))}
              </div>
            </FadeContent>
          </div>

          {/* Right: Globe + card */}
          <div style={{ position: "relative" }}>
            {/* Animated Globe */}
            <AnimatedGlobe />

            {/* Economy Overview card */}
            <div className="zetta-economy-card" style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Economy Overview</span>
              </div>
              <div className="zetta-economy-grid">
                {[
                  { label: "Agent GDP", value: gdp ? fmtUSD(gdp.total_revenue_usd) : "$—" },
                  { label: "Attributed Agents", value: gdp ? String(gdp.attributed_agents) : "—" },
                  { label: "Net Income", value: gdp ? fmtUSD(gdp.total_net_income_usd) : "$—" },
                  { label: "Research Reports", value: reports.length > 0 ? String(reports.length) : "—" },
                ].map((s) => (
                  <div key={s.label} className="zetta-economy-stat">
                    <p className="zetta-stat-label">{s.label}</p>
                    <p className="zetta-stat-value" style={{ fontSize: "1.1rem" }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="zetta-stats-bar" style={{ marginTop: 48 }}>
        {[
          { label: "Attributed Agents", value: gdp ? String(gdp.attributed_agents) : "—" },
          { label: "Agent GDP (30d)", value: gdp ? fmtUSD(gdp.total_revenue_usd) : "$—" },
          { label: "Net Income", value: gdp ? fmtUSD(gdp.total_net_income_usd) : "$—" },
          { label: "Research Reports", value: reports.length > 0 ? String(reports.length) : "—" },
        ].map((s) => (
          <div key={s.label} className="zetta-stats-bar-item">
            <p className="zetta-stat-label">{s.label}</p>
            <p className="zetta-stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── ZETTA STACK ── */}
      <section className="zetta-stack-section">
        <div className="zetta-stack-inner">
          <p className="zetta-stack-eyebrow">How Zetta Works</p>
          <div className="zetta-stack-flow">
            {[
              { step: "Attribution", desc: "Wallet manifests declare which addresses belong to each agent. This is the foundation — no attribution, no books.", color: "#6DB874" },
              { step: "Books",       desc: "Attributed transactions are classified into operating revenue, expenses, treasury, and net income per agent.", color: "#5B8FA8" },
              { step: "History",     desc: "Books are snapshotted across reporting periods to track trends, growth, and operational health over time.", color: "#8B5CF6" },
              { step: "Economy",     desc: "All attributed agents are aggregated into the Agent GDP — the financial pulse of the autonomous economy.", color: "#F97316" },
              { step: "Intelligence", desc: "Luca reads the attributed books and produces financial verdicts: signals, verdicts, confidence levels.", color: "#6DB874" },
            ].map((item, i, arr) => (
              <div key={item.step} className="zetta-stack-item">
                <div className="zetta-stack-step-head">
                  <span className="zetta-stack-num" style={{ color: item.color }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="zetta-stack-label" style={{ color: item.color }}>{item.step}</span>
                </div>
                <p className="zetta-stack-desc">{item.desc}</p>
                {i < arr.length - 1 && <span className="zetta-stack-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THREE-COLUMN DATA GRID ── */}
      <div className="zetta-data-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px" }}>

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
                const ecoColor = ECO_COLORS[agent.ecosystem] ?? "#6DB874";
                return (
                  <tr key={agent.slug}>
                    <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ecoColor, flexShrink: 0, display: "inline-block" }} />
                        <Link href={`/registry/${agent.slug}`} style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.78rem" }}>{agent.name}</Link>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "#6DB874", fontSize: "0.76rem" }}>{fmtUSD(agent.revenue_usd)}</td>
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
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#6DB874" }}>
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

      {/* ── BOTTOM GRID ── */}
      <div className="zetta-bottom-grid" style={{ maxWidth: 1200, margin: "0 auto" }}>
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
          <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 700, color: "var(--ink)" }}>Financial infrastructure for autonomous agents.</h3>
          <div>
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
      </div>

      {/* ── LIVE SIGNALS (tabbed) ── */}
      <HomeSignals liveSignals={topAgents.length > 0 ? topAgents.slice(0, 4).map((agent, i) => ({
        eco: agent.ecosystem,
        color: ECO_COLORS[agent.ecosystem] ?? "#6DB874",
        text: `${agent.name} attributed ${fmtUSD(agent.revenue_usd)} in operating revenue over 30 days.`,
        ago: `${(i + 1) * 12}m ago`,
      })) : undefined} />

      <div style={{ height: 48 }} />

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}
