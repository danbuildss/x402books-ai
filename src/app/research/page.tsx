import Link from "next/link";
import { FadeContent } from "@/components/effects";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { ResearchFilter } from "@/components/research-filter";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getRegistryAgents } from "@/lib/registry-db";
import { listReports } from "@/lib/research-db";
import { INAUGURAL_REPORT } from "@/lib/inaugural-report";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { toSlug } from "@/app/registry/[slug]/slug";

export const revalidate = 3600;

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmt(n: number, fallback = "—"): string {
  if (!n || n === 0) return fallback;
  return fmtUSD(n);
}

export default async function ResearchPage() {
  const [reportsResult, gdpResult, registryResult] = await Promise.allSettled([
    listReports(20),
    getAgentGDP(),
    getRegistryAgents(),
  ]);

  const reports = reportsResult.status === "fulfilled" ? reportsResult.value : [];
  const gdp = gdpResult.status === "fulfilled" ? gdpResult.value : null;
  const totalIndexed =
    registryResult.status === "fulfilled" ? registryResult.value.agents.length : null;

  // Compute ecosystem breakdown from all_attributed
  const ecosystemMap: Record<string, { revenue: number; count: number }> = {};
  if (gdp) {
    for (const entry of gdp.all_attributed) {
      const eco = entry.ecosystem || "Unknown";
      if (!ecosystemMap[eco]) ecosystemMap[eco] = { revenue: 0, count: 0 };
      ecosystemMap[eco].revenue += entry.revenue_usd;
      ecosystemMap[eco].count += 1;
    }
  }
  const ecosystemRows = Object.entries(ecosystemMap).sort((a, b) => b[1].revenue - a[1].revenue);

  const top10 = gdp ? gdp.all_attributed.slice(0, 10) : [];

  // Attribution gap
  const withBooks = gdp?.attributed_agents ?? 0;
  const awaitingManifest = gdp?.awaiting_manifest.length ?? 0;
  const noData = totalIndexed != null ? Math.max(0, totalIndexed - withBooks - awaitingManifest) : null;

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

      {/* ── Economy Aggregate Stats ── */}
      {gdp && (
        <section className="lp-section lp-section-alt">
          <FadeContent delay={40}>
            <SectionLabel>Economy Overview · 30-day window · on-chain only</SectionLabel>
            <MetricGrid cols={4} style={{ marginTop: 14 }}>
              <MetricCard
                label="Total Revenue"
                value={gdp.total_revenue_usd > 0 ? fmtUSD(gdp.total_revenue_usd) : "—"}
                sub="tracked, attributed"
                valueColor={gdp.total_revenue_usd > 0 ? "var(--accent)" : undefined}
              />
              <MetricCard
                label="Total Expenses"
                value={gdp.total_expenses_usd > 0 ? fmtUSD(gdp.total_expenses_usd) : "—"}
                sub="operating costs"
              />
              <MetricCard
                label="Agents with Books"
                value={gdp.attributed_agents > 0 ? String(gdp.attributed_agents) : "—"}
                sub="manifest declared"
              />
              <MetricCard
                label="Total Indexed"
                value={totalIndexed != null && totalIndexed > 0 ? String(totalIndexed) : "—"}
                sub="in registry"
              />
            </MetricGrid>
          </FadeContent>
        </section>
      )}

      {/* ── Top Agents by Revenue ── */}
      {top10.length > 0 && (
        <section className="lp-section" style={{ maxWidth: 860, margin: "0 auto", width: "100%", padding: "2rem 24px" }}>
          <FadeContent delay={60}>
            <LedgerCard
              eyebrow="Leaderboard · 30 days"
              title="Top Agents by Revenue"
            >
              {top10.map((agent, i) => (
                <LedgerRow
                  key={agent.slug}
                  first={i === 0}
                  last={i === top10.length - 1}
                  label={
                    <Link
                      href={`/registry/${toSlug(agent.name)}`}
                      style={{ color: "var(--ink)", textDecoration: "none" }}
                    >
                      {agent.name}
                    </Link>
                  }
                  value={fmt(agent.revenue_usd)}
                  detail={
                    agent.net_income_usd !== 0
                      ? `net ${agent.net_income_usd >= 0 ? "+" : ""}${fmtUSD(agent.net_income_usd)}`
                      : undefined
                  }
                  valueStyle={{ color: agent.revenue_usd > 0 ? "var(--accent)" : "var(--muted)" }}
                />
              ))}
            </LedgerCard>
          </FadeContent>
        </section>
      )}

      {/* ── Ecosystem Breakdown + Attribution Gap ── */}
      {(ecosystemRows.length > 0 || gdp) && (
        <section className="lp-section lp-section-alt">
          <FadeContent delay={80}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

              {/* Ecosystem breakdown */}
              {ecosystemRows.length > 0 && (
                <LedgerCard
                  eyebrow="By ecosystem"
                  title="Revenue Breakdown"
                >
                  {ecosystemRows.map(([eco, data], i) => (
                    <LedgerRow
                      key={eco}
                      first={i === 0}
                      last={i === ecosystemRows.length - 1}
                      label={eco}
                      value={fmt(data.revenue)}
                      detail={`${data.count} agent${data.count !== 1 ? "s" : ""}`}
                      valueStyle={{ color: "var(--ink)" }}
                    />
                  ))}
                </LedgerCard>
              )}

              {/* Attribution gap */}
              {gdp && (
                <LedgerCard
                  eyebrow="Data quality signal"
                  title="Attribution Coverage"
                >
                  <LedgerRow
                    first
                    label="Full books"
                    value={withBooks > 0 ? String(withBooks) : "—"}
                    detail="manifest + on-chain"
                    valueStyle={{ color: "var(--accent)" }}
                  />
                  <LedgerRow
                    label="Awaiting manifest"
                    value={awaitingManifest > 0 ? String(awaitingManifest) : "—"}
                    detail="indexed, undeclared"
                    valueStyle={{ color: "var(--muted)" }}
                  />
                  {noData !== null && (
                    <LedgerRow
                      last
                      label="No data"
                      value={noData > 0 ? String(noData) : "—"}
                      detail="registry only"
                      valueStyle={{ color: "var(--muted)" }}
                    />
                  )}
                  {noData === null && (
                    <LedgerRow
                      last
                      label="Total indexed"
                      value={gdp.total_agents > 0 ? String(gdp.total_agents) : "—"}
                      detail="in registry"
                    />
                  )}
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
                    Only agents with declared wallet manifests appear in economic data. Awaiting manifest agents are indexed but not yet financially attributed.
                  </p>
                </LedgerCard>
              )}

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
                The State of the Agent Economy is written by Luca, Zetta&rsquo;s financial analyst. Every number is derived from on-chain data. Only agents with declared wallet manifests are included. No estimates. No synthetic data.
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
