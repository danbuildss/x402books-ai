import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ResearchFilter } from "@/components/research-filter";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getRegistryAgents } from "@/lib/registry-db";
import { listReports } from "@/lib/research-db";
import { INAUGURAL_REPORT } from "@/lib/inaugural-report";
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
  const withBooks = gdp?.attributed_agents ?? 0;
  const awaitingManifest = gdp?.awaiting_manifest.length ?? 0;
  const noData = totalIndexed != null ? Math.max(0, totalIndexed - withBooks - awaitingManifest) : null;

  return (
    <div className="lp-root">
      <SiteNav />

      <article style={{ maxWidth: 1000, margin: "0 auto", padding: "3rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Research</span>
        </nav>

        {/* Masthead */}
        <div style={{ marginBottom: 32 }}>
          <div className="tla-section-label" style={{ marginBottom: 10 }}>
            State of the Agent Economy · Vol. I · By Luca · {new Date().getFullYear()}
          </div>
          <h1 style={{
            margin: "0 0 10px",
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            fontFamily: "var(--font-mono)",
            letterSpacing: "-0.02em",
            color: "var(--ink-em)",
          }}>
            The Financial Record<br />of the Agent Economy.
          </h1>
          <p style={{ margin: "0 0 20px", color: "var(--ink-mid)", fontSize: "0.82rem", maxWidth: 560, lineHeight: 1.65 }}>
            Revenue, expenses, treasury activity, and economic trends across autonomous agents — grounded entirely in on-chain data.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/registry#verify" className="lp-btn-primary" style={{ fontSize: "0.8rem" }}>Submit Manifest →</Link>
            <Link href="/luca" className="lp-btn-ghost" style={{ fontSize: "0.8rem" }}>About Luca</Link>
          </div>
        </div>

        {/* Economy Metrics */}
        {gdp && (
          <>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>Economy Overview · 30-day window · on-chain only</div>
            <div className="tla-metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 28 }}>
              {[
                { label: "Total Revenue",     value: gdp.total_revenue_usd > 0 ? fmtUSD(gdp.total_revenue_usd) : "—",   color: gdp.total_revenue_usd > 0 ? "var(--accent)" : undefined },
                { label: "Total Expenses",    value: gdp.total_expenses_usd > 0 ? fmtUSD(gdp.total_expenses_usd) : "—", color: undefined },
                { label: "Net Income",        value: gdp.total_net_income_usd !== 0 ? `${gdp.total_net_income_usd >= 0 ? "+" : ""}${fmtUSD(gdp.total_net_income_usd)}` : "—", color: gdp.total_net_income_usd >= 0 ? "var(--accent)" : "var(--negative, #F46060)" },
                { label: "Agents with Books", value: gdp.attributed_agents > 0 ? String(gdp.attributed_agents) : "—",   color: undefined },
                { label: "ERC-8004 Indexed",  value: gdp.erc8004_agents > 0 ? String(gdp.erc8004_agents) : "—",         color: "#8B7CF6" },
                { label: "Total Indexed",     value: totalIndexed != null && totalIndexed > 0 ? String(totalIndexed) : "—", color: "var(--muted)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="tla-metric-cell">
                  <div className="tla-metric-label">{label}</div>
                  <div className="tla-metric-value" style={color ? { color } : undefined}>{value}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: "-18px 0 24px", fontSize: "0.7rem", color: "var(--muted)" }}>
              Last updated{" "}
              {new Date(gdp.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              {" · "}
              <Link href="/methodology" style={{ color: "var(--accent)" }}>How this is calculated →</Link>
            </p>
          </>
        )}

        {/* Top Agents Table */}
        {top10.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>Leaderboard · 30 days</div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr 100px 100px",
                gap: 12, padding: "8px 16px",
                background: "var(--surface-hi)",
                borderBottom: "1px solid var(--line)",
              }}>
                {["#", "Agent", "30D Revenue", "Net (30D)"].map((h, i) => (
                  <div key={h} style={{
                    fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "var(--muted)",
                    textAlign: i > 1 ? "right" : i === 0 ? "center" : "left",
                  }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {top10.map((agent, i) => (
                <Link
                  key={agent.slug}
                  href={`/registry/${toSlug(agent.name)}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr 100px 100px",
                    gap: 12, alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: i === top10.length - 1 ? "none" : "1px solid var(--line)",
                    textDecoration: "none", color: "inherit",
                  }}
                  className="ldb-row"
                >
                  <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)" }}>
                    {i + 1}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>{agent.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.83rem", fontWeight: 700, color: agent.revenue_usd > 0 ? "var(--accent)" : "var(--muted)", textAlign: "right" }}>
                    {fmt(agent.revenue_usd)}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 600, textAlign: "right",
                    color: agent.net_income_usd >= 0 ? "var(--accent)" : "var(--negative, #F46060)",
                  }}>
                    {agent.net_income_usd !== 0 ? `${agent.net_income_usd >= 0 ? "+" : ""}${fmtUSD(agent.net_income_usd)}` : "—"}
                  </div>
                </Link>
              ))}
              <div style={{ padding: "10px 16px", textAlign: "center", borderTop: "1px solid var(--line)" }}>
                <Link href="/leaderboard" style={{ fontSize: "0.76rem", color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  View full leaderboard →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Ecosystem Breakdown + Attribution Gap */}
        {(ecosystemRows.length > 0 || gdp) && (
          <div style={{ marginBottom: 32 }}>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>Data Intelligence</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>

              {ecosystemRows.length > 0 && (
                <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                      Revenue by Ecosystem
                    </span>
                  </div>
                  {ecosystemRows.map(([eco, data], i) => (
                    <div key={eco} style={{
                      display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12,
                      alignItems: "center", padding: "10px 16px",
                      borderBottom: i === ecosystemRows.length - 1 ? "none" : "1px solid var(--line)",
                      fontSize: "0.82rem",
                    }}>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{eco}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                        {data.count} agent{data.count !== 1 ? "s" : ""}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>
                        {fmt(data.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {gdp && (
                <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                      Attribution Coverage
                    </span>
                  </div>
                  {[
                    { label: "Full books",        value: withBooks > 0 ? String(withBooks) : "—",         detail: "manifest + on-chain", color: "var(--accent)" },
                    { label: "Awaiting manifest", value: awaitingManifest > 0 ? String(awaitingManifest) : "—", detail: "indexed, undeclared", color: "var(--muted)" },
                    { label: noData !== null ? "Registry only" : "Total indexed", value: noData !== null ? (noData > 0 ? String(noData) : "—") : (gdp.total_agents > 0 ? String(gdp.total_agents) : "—"), detail: noData !== null ? "no financial data" : "in registry", color: "var(--muted)" },
                  ].map(({ label, value, detail, color }, i, arr) => (
                    <div key={label} style={{
                      display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12,
                      alignItems: "center", padding: "10px 16px",
                      borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line)",
                      fontSize: "0.82rem",
                    }}>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{detail}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color, textAlign: "right" }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: "0.71rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    Only agents with declared wallet manifests appear in economic data.{" "}
                    <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit →</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports */}
        <div className="tla-section-label" style={{ marginBottom: 12 }}>Published Reports</div>
        {reports.length > 0 ? (
          <ResearchFilter reports={reports} />
        ) : (
          <ResearchFilter reports={[INAUGURAL_REPORT]} />
        )}

        {/* About Luca */}
        <div style={{ marginTop: 40, paddingTop: 28, paddingBottom: 28, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
          <div>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>About the Report</div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 10, lineHeight: 1.3 }}>
              Luca writes.<br />The data speaks.
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-mid)", lineHeight: 1.65, marginBottom: 14 }}>
              The State of the Agent Economy is authored by Luca, Zetta&rsquo;s financial analyst. Every number is derived from on-chain data. Only agents with declared wallet manifests are included. No estimates. No synthetic data.
            </p>
            <div style={{ marginBottom: 14 }}>
              {[
                { label: "Weekly",    desc: "Agent GDP snapshot, top performers, key movements" },
                { label: "Monthly",   desc: "Revenue trends, expense analysis, treasury patterns" },
                { label: "Quarterly", desc: "Ecosystem breakdowns, growth observations, market analysis" },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", gap: 12, fontSize: "0.8rem", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)", minWidth: 72 }}>{r.label}</span>
                  <span style={{ color: "var(--muted)" }}>{r.desc}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.74rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
              Reports cover only attributed agents. Numbers reflect confirmed on-chain activity only.
            </p>
          </div>

          <div>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>Coverage</div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)", fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--negative)", display: "inline-block" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)", display: "inline-block" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                <span style={{ marginLeft: 4 }}>Luca · Financial Analyst</span>
              </div>
              {[
                { label: "Revenue Analysis",    desc: "Top earners, growth rates, revenue concentration across agents" },
                { label: "Treasury Intelligence", desc: "Capital allocation, runway, treasury movements" },
                { label: "Expense Patterns",    desc: "Spend categories, operational cost trends, gas analysis" },
                { label: "Attribution Gap",     desc: "What the unattributed portion of the economy might represent" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ padding: "10px 14px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line)", background: "var(--surface)" }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: "0.78rem", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.45 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA strip */}
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 4 }}>
              Get your agent in the report.
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.55, maxWidth: 380 }}>
              Submit a wallet manifest and Luca will include your agent in the next State of the Agent Economy.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/registry#verify" className="lp-btn-primary">Submit Manifest →</Link>
            <Link href="/registry" className="lp-btn-ghost">Browse Registry</Link>
          </div>
        </div>

        {/* Footnote */}
        <p style={{ marginTop: 24, fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.6 }}>
          All figures represent 30-day on-chain activity from attributed wallets only. Updated hourly. Not financial advice.
        </p>

      </article>

      <SiteFooter />
    </div>
  );
}
