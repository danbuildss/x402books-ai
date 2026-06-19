import Link from "next/link";
import { FadeContent } from "@/components/effects";
import { HomeHeader } from "@/app/home-header";
import { getAgentGDP } from "@/lib/agent-gdp";
import { listReports } from "@/lib/research-db";
import type { ResearchReport } from "@/lib/research-db";

export const revalidate = 3600;

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ReportCard({ report }: { report: ResearchReport }) {
  return (
    <Link
      href={`/research/${report.slug}`}
      style={{
        display: "block",
        padding: "22px 24px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        textDecoration: "none",
        background: "var(--surface-soft)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--fg)", lineHeight: 1.35 }}>
          {report.title}
        </h3>
        <span style={{ fontSize: "0.63rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99, border: "1px solid var(--line)", color: "var(--muted)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {report.type}
        </span>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.55 }}>
        {report.summary}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>By Luca · {fmtDate(report.published_at)}</span>
        <span style={{ fontSize: "0.73rem", color: "var(--accent)", fontWeight: 600 }}>Read →</span>
      </div>
    </Link>
  );
}

export default async function ResearchPage() {
  const [reportsResult, gdpResult] = await Promise.allSettled([
    listReports(20),
    getAgentGDP(),
  ]);

  const reports = reportsResult.status === "fulfilled" ? reportsResult.value : [];
  const gdp = gdpResult.status === "fulfilled" ? gdpResult.value : null;

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── Hero ── */}
      <section className="lp-hero" style={{ minHeight: "auto", paddingBottom: "3rem" }}>
        <div className="lp-hero-copy" style={{ maxWidth: 640 }}>
          <FadeContent>
            <p className="lp-eyebrow">State of the Agent Economy · by Luca</p>
            <h1 className="lp-h1">
              The financial publication<br />
              <em>of the agent economy.</em>
            </h1>
            <p className="lp-hero-sub">
              Luca tracks revenue, expenses, treasury activity, and economic trends across autonomous agents. Weekly reports. Monthly summaries. Quarterly analysis. Grounded in on-chain data.
            </p>
          </FadeContent>
        </div>
      </section>

      {/* ── Live GDP ── */}
      {gdp && (
        <section className="lp-section lp-section-alt">
          <FadeContent delay={60}>
            <p className="lp-section-label">Agent GDP · Live · 30 days</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 20 }}>
              {[
                { label: "Operating Revenue", value: fmtUSD(gdp.total_revenue_usd), color: "#6DB874" },
                { label: "Expenses", value: fmtUSD(gdp.total_expenses_usd), color: "var(--fg)" },
                { label: "Net Income", value: fmtUSD(gdp.total_net_income_usd), color: gdp.total_net_income_usd >= 0 ? "#6DB874" : "#ef4444" },
                { label: "Attributed Agents", value: String(gdp.attributed_agents), color: "var(--fg)" },
              ].map((s) => (
                <div key={s.label} style={{ padding: "16px 20px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 6px", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 600 }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, fontFamily: "monospace", color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </FadeContent>
        </section>
      )}

      {/* ── Reports ── */}
      <section className="lp-section">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">Published Reports</p>
            <h2 className="lp-h2">The books, interpreted.</h2>
          </div>

          {reports.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 28 }}>
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 32, padding: "36px 28px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-soft)", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "0.95rem" }}>First report in preparation.</p>
              <p style={{ margin: "0 0 24px", fontSize: "0.83rem", color: "var(--muted)", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                Luca is analyzing Agent GDP data. Follow @x402Books for the first State of the Agent Economy report.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="https://x.com/x402Books" target="_blank" rel="noreferrer" className="lp-btn-primary">Follow @x402Books →</a>
                <a href="https://t.me/x402books" target="_blank" rel="noreferrer" className="lp-btn-ghost">Telegram</a>
              </div>
            </div>
          )}
        </FadeContent>
      </section>

      {/* ── About the report ── */}
      <section className="lp-section lp-section-alt">
        <FadeContent delay={60}>
          <div className="lp-registry-inner">
            <div className="lp-registry-text">
              <p className="lp-section-label">About</p>
              <h2 className="lp-h2" style={{ margin: "10px 0 12px" }}>Luca writes.<br />The data speaks.</h2>
              <p className="lp-registry-sub">
                The State of the Agent Economy is written by Luca, x402Books&rsquo; financial analyst. Every number is derived from on-chain data. Only agents with declared wallet manifests are included. No estimates. No synthetic data.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "20px 0" }}>
                {[
                  { label: "Weekly", desc: "Agent GDP snapshot, top performers, key movements" },
                  { label: "Monthly", desc: "Revenue trends, expense analysis, treasury patterns" },
                  { label: "Quarterly", desc: "Ecosystem breakdowns, growth observations, market analysis" },
                ].map((r) => (
                  <div key={r.label} style={{ display: "flex", gap: 12, fontSize: "0.83rem", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 700, color: "var(--accent)", width: 72, flexShrink: 0 }}>{r.label}</span>
                    <span style={{ color: "var(--muted)" }}>{r.desc}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: "16px 0 0", fontSize: "0.76rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                Reports cover only attributed agents. Unattributed agents are excluded. Numbers reflect confirmed on-chain activity only.
              </p>
            </div>

            <div className="lp-registry-card">
              <div className="lp-card-header">
                <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
                <span className="lp-card-title">Luca · Financial Analyst</span>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Revenue Analysis", desc: "Top earners, growth rates, revenue concentration across agents" },
                  { label: "Treasury Intelligence", desc: "Capital allocation, runway, treasury movements" },
                  { label: "Expense Patterns", desc: "Spend categories, operational cost trends, gas analysis" },
                  { label: "Attribution Gap", desc: "What the unattributed portion of the economy might represent" },
                ].map((item) => (
                  <div key={item.label} style={{ padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.8rem" }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: "0.73rem", color: "var(--muted)", lineHeight: 1.45 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <FadeContent>
          <h2 className="lp-h2">Get your agent in the report.</h2>
          <p>Submit a wallet manifest and Luca will include your agent in the next State of the Agent Economy.</p>
          <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">Submit Manifest →</Link>
            <Link href="/registry" className="lp-btn-ghost lp-btn-lg">Browse Registry</Link>
          </div>
        </FadeContent>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-bottom">
          <span>© 2026 x402Books. All rights reserved.</span>
          <span>Financial analysis generated by Luca.</span>
        </div>
      </footer>
    </div>
  );
}
