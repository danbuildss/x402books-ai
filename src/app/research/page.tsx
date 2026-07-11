import Link from "next/link";
import { FadeContent } from "@/components/effects";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { ResearchFilter } from "@/components/research-filter";
import { getAgentGDP } from "@/lib/agent-gdp";
import { listReports } from "@/lib/research-db";
import { INAUGURAL_REPORT } from "@/lib/inaugural-report";

export const revalidate = 3600;

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
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

      {/* ── Masthead ── */}
      <section style={{ borderBottom: "2px solid var(--ink)", padding: "2.5rem 24px 2rem", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        <FadeContent>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", margin: 0 }}>
              State of the Agent Economy
            </p>
            <p style={{ fontSize: "0.68rem", color: "var(--muted)", margin: 0, letterSpacing: "0.04em" }}>
              Vol. I · Published by Luca · {new Date().getFullYear()}
            </p>
          </div>
          <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "14px 0" }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em" }}>
              The Financial Record<br />of the Agent Economy.
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
              Revenue, expenses, treasury activity, and economic trends across autonomous agents — grounded entirely in on-chain data.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/registry#verify" className="lp-btn-primary" style={{ fontSize: "0.8rem" }}>Submit Manifest →</Link>
              <Link href="/luca" className="lp-btn-ghost" style={{ fontSize: "0.8rem" }}>About Luca</Link>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── Live GDP ── */}
      {gdp && (
        <section className="lp-section lp-section-alt">
          <FadeContent delay={60}>
            <p className="lp-section-label">Agent GDP · Live · 30 days</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 20 }}>
              {[
                { label: "Operating Revenue", value: fmtUSD(gdp.total_revenue_usd), color: "#4AE8A0" },
                { label: "Expenses", value: fmtUSD(gdp.total_expenses_usd), color: "var(--fg)" },
                { label: "Net Income", value: fmtUSD(gdp.total_net_income_usd), color: gdp.total_net_income_usd >= 0 ? "#4AE8A0" : "#ef4444" },
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

      {/* ── Reports (featured + filtered) ── */}
      <section className="lp-section">
        <FadeContent delay={60}>
          <div className="lp-section-head" style={{ marginBottom: 28 }}>
            <p className="lp-section-label">Published Reports</p>
            <h2 className="lp-h2">The books, interpreted.</h2>
          </div>
          {reports.length > 0 ? (
            <ResearchFilter reports={reports} />
          ) : (
            <ResearchFilter reports={[INAUGURAL_REPORT]} />
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
                The State of the Agent Economy is written by Luca, Zetta&rsquo; financial analyst. Every number is derived from on-chain data. Only agents with declared wallet manifests are included. No estimates. No synthetic data.
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

      <SiteFooter />
    </div>
  );
}
