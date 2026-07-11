import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentBySlug, buildAgentBooks } from "@/lib/agent-books";
import { getInferenceEvents, summarizeInferenceEvents, generateMonthlyStatement } from "@/lib/inference-events";
import type { AgentBooks, AgentBooksUnattributed } from "@/lib/agent-books";
import type { InferenceSummary, MonthlyStatement, CostSource } from "@/lib/inference-events";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — Surplus × Zetta Financial Report`,
    description: `Inference economics, wallet attribution, and financial position for ${slug}. Powered by Surplus and Zetta.`,
  };
}

function usd(n: number, fallback = "—") {
  if (n == null) return fallback;
  if (n === 0) return "$0.00";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 0.01)  return `$${n.toFixed(5)}`;
  if (n < 1)     return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function costLabel(source: CostSource) {
  if (source === "actual")    return { text: "actual",    color: "var(--accent)" };
  if (source === "estimated") return { text: "estimated", color: "#f59e0b" };
  return                             { text: "missing",   color: "#f87171" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <p style={{
        fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 12,
        borderBottom: "1px solid var(--line)", paddingBottom: 8,
      }}>{title}</p>
      {children}
    </section>
  );
}

function Row({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: "0.85rem", fontFamily: "monospace", fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}{sub && <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>{sub}</span>}
      </span>
    </div>
  );
}

function DataNote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.55,
      padding: "8px 12px", background: "var(--surface-soft)",
      border: "1px solid var(--line)", borderRadius: 6, margin: "8px 0 0",
    }}>
      ⚠ {children}
    </p>
  );
}

export default async function SurplusAgentReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const agent = await getAgentBySlug(slug);
  if (!agent) notFound();

  const [booksResult, inferenceEvents] = await Promise.all([
    buildAgentBooks(agent, "30d"),
    getInferenceEvents(slug, 30, 500),
  ]);

  const books = booksResult as AgentBooks | AgentBooksUnattributed;
  const hasBooks = books.attributed === true;
  const b = hasBooks ? (books as AgentBooks) : null;

  const inferenceSummary = summarizeInferenceEvents(slug, inferenceEvents, 30);
  const now   = new Date();
  const month = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const statement = generateMonthlyStatement(slug, inferenceSummary, month);

  const hasInference  = inferenceSummary.requestCount > 0;
  const hasTreasury   = hasBooks && b!.financials.treasury_balance_usd != null;
  const hasRevenue    = hasBooks && b!.financials.revenue_usd > 0;
  const netPosition   = (b?.financials.revenue_usd ?? 0) - inferenceSummary.totalCostUsd;

  const cost = costLabel(inferenceSummary.costStatus);

  // Luca verdict
  let verdict: string;
  if (!hasBooks && !hasInference) {
    verdict = "No financial data available. Wallet attribution and inference tracking are both inactive for this agent.";
  } else if (!hasBooks && hasInference) {
    verdict = `Inference tracking is active (${inferenceSummary.requestCount} request${inferenceSummary.requestCount === 1 ? "" : "s"} recorded). No wallet attribution — books cannot be generated until a manifest is declared.`;
  } else if (hasBooks && !hasInference) {
    verdict = `Books are attributed but no Surplus inference activity is recorded. Revenue: ${usd(b!.financials.revenue_usd)}. Inference spend: not tracked.`;
  } else {
    const spendStr = inferenceSummary.hasCostData ? usd(inferenceSummary.totalCostUsd) : "unknown (cost data missing)";
    verdict = `${inferenceSummary.requestCount} inference request${inferenceSummary.requestCount === 1 ? "" : "s"} recorded via Surplus. Revenue: ${usd(b!.financials.revenue_usd)}. Inference spend: ${spendStr}. ${inferenceSummary.costStatus === "missing" ? "Cost data must be activated for full financial reporting." : `Net position after inference: ${usd(netPosition)}.`}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--line)", padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/surplus" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" }}>← Surplus Pilot</Link>
          <span style={{ color: "var(--line)" }}>·</span>
          <Link href={`/registry/${slug}`} style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" }}>Registry Profile</Link>
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          Surplus × Zetta · {month}
        </span>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 8 }}>
            Surplus-Powered Agent Financial Report
          </p>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 8 }}>
            {agent.name}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.55 }}>
            Surplus powers inference. Zetta records the economics. Luca explains what it means.
          </p>
        </div>

        {/* 1. Agent identity */}
        <Section title="1 · Agent Identity">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Row label="Agent"     value={agent.name} />
            <Row label="Ecosystem" value={agent.ecosystem ?? "—"} />
            <Row label="Registry"  value={`/registry/${slug}`} />
            {agent.x_handle && <Row label="X" value={agent.x_handle} />}
            <Row label="Verification" value={agent.verification_status ?? "Candidate"} />
          </div>
        </Section>

        {/* 2. Wallet attribution */}
        <Section title="2 · Wallet Attribution">
          {hasBooks ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row label="Declared wallets" value={b!.wallets.declared.toString()} />
              <Row label="Analyzed wallets" value={b!.wallets.analyzed.toString()} />
              <Row label="Roles"            value={b!.wallets.roles.join(", ") || "—"} />
              <Row label="Attribution source" value={b!.attribution.source} />
              <Row label="Confidence"       value={b!.confidence.overall} />
            </div>
          ) : (
            <DataNote>
              Wallet attribution is incomplete. No manifest has been declared or verified.
              Books cannot be generated until wallets are attributed.{" "}
              <Link href="/register" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
            </DataNote>
          )}
        </Section>

        {/* 3. Inference activity */}
        <Section title="3 · Inference Activity">
          {hasInference ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row label="Total requests"    value={inferenceSummary.requestCount.toString()} sub="last 30 days" />
              <Row label="Primary provider"  value={inferenceSummary.primaryProvider ?? "—"} />
              <Row label="Providers used"    value={inferenceSummary.providersUsed.join(", ") || "—"} />
              <Row label="Avg latency"       value={
                inferenceEvents.filter(e => e.latencyMs).length > 0
                  ? `${Math.round(inferenceEvents.reduce((s, e) => s + (e.latencyMs ?? 0), 0) / inferenceEvents.filter(e => e.latencyMs).length)}ms`
                  : "—"
              } />
            </div>
          ) : (
            <DataNote>No inference activity recorded for this agent in the last 30 days.</DataNote>
          )}
        </Section>

        {/* 4. Provider concentration */}
        <Section title="4 · Provider Concentration">
          {inferenceSummary.providerBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {inferenceSummary.providerBreakdown.map((p) => {
                const pct = inferenceSummary.requestCount > 0
                  ? Math.round((p.requestCount / inferenceSummary.requestCount) * 100)
                  : 0;
                return (
                  <div key={p.provider} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6,
                  }}>
                    <span style={{ fontSize: "0.82rem", textTransform: "capitalize", fontWeight: 600 }}>{p.provider}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.requestCount} req · {pct}%</span>
                      {inferenceSummary.hasCostData
                        ? <span style={{ fontSize: "0.82rem", fontFamily: "monospace" }}>{usd(p.totalCost)}</span>
                        : <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>cost unknown</span>
                      }
                    </div>
                  </div>
                );
              })}
              {inferenceSummary.providerBreakdown.length === 1 && (
                <DataNote>Single provider detected. Provider concentration is 100% — no diversification.</DataNote>
              )}
            </div>
          ) : (
            <DataNote>No provider data available.</DataNote>
          )}
        </Section>

        {/* 5. Inference spend */}
        <Section title="5 · Inference Spend">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Row
              label="Total spend"
              value={inferenceSummary.hasCostData ? usd(inferenceSummary.totalCostUsd) : "—"}
              sub={inferenceSummary.hasCostData ? undefined : "(cost data missing)"}
              color={inferenceSummary.hasCostData ? "#f87171" : "var(--muted)"}
            />
            <Row
              label="Avg cost / request"
              value={inferenceSummary.hasCostData ? usd(inferenceSummary.avgCostPerRequest) : "—"}
            />
            <Row
              label="Cost data source"
              value={cost.text}
              color={cost.color}
            />
          </div>
          {!inferenceSummary.hasCostData && (
            <DataNote>
              Spend tracking is incomplete. Requests are counted but cost metadata is not being passed.
              Contact the provider to activate cost reporting via <code style={{ fontSize: "0.72rem" }}>POST /api/inference/log</code>.
            </DataNote>
          )}
          {inferenceSummary.costStatus === "estimated" && (
            <DataNote>Spend is estimated from model pricing and token usage. Actual provider billing may differ.</DataNote>
          )}
        </Section>

        {/* 6. Revenue */}
        <Section title="6 · Revenue">
          {hasRevenue ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row label="Operating revenue"   value={usd(b!.financials.revenue_usd)}       color="var(--accent)" />
              <Row label="Settlement revenue"  value={usd(b!.classification.settlement_revenue_usd)} />
              <Row label="Gross inflow"        value={usd(b!.financials.gross_inflow_usd)} />
              <Row label="Quarantined inflows" value={usd(b!.classification.quarantined_inflows_usd)} sub="excluded" />
              <Row label="Confidence"          value={b!.confidence.revenue} />
            </div>
          ) : hasBooks ? (
            <DataNote>Books are attributed but no operating revenue was recorded in the last 30 days.</DataNote>
          ) : (
            <DataNote>No books available. Wallet attribution is required before revenue can be reported.</DataNote>
          )}
        </Section>

        {/* 7. Treasury */}
        <Section title="7 · Treasury Balance">
          {hasTreasury ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row label="Treasury balance" value={usd(b!.financials.treasury_balance_usd!)} color="var(--accent)" />
              {b!.financials.runway_months != null && (
                <Row label="Estimated runway" value={`${b!.financials.runway_months.toFixed(1)} months`} />
              )}
              <Row label="Confidence" value={b!.confidence.treasury} />
            </div>
          ) : (
            <DataNote>
              {hasBooks
                ? "Treasury balance is unavailable. No treasury wallet was declared or the balance could not be retrieved."
                : "Treasury data requires wallet attribution."}
            </DataNote>
          )}
        </Section>

        {/* 8. Revenue vs inference cost */}
        <Section title="8 · Revenue vs Inference Cost">
          {hasRevenue && inferenceSummary.hasCostData ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row label="Revenue"        value={usd(b!.financials.revenue_usd)}       color="var(--accent)" />
              <Row label="Inference cost" value={`-${usd(inferenceSummary.totalCostUsd)}`} color="#f87171" />
              <Row
                label="Net after inference"
                value={netPosition >= 0 ? `+${usd(netPosition)}` : `-${usd(Math.abs(netPosition))}`}
                color={netPosition >= 0 ? "var(--accent)" : "#f87171"}
              />
              {b!.financials.revenue_usd > 0 && (
                <Row
                  label="Inference cost ratio"
                  value={`${((inferenceSummary.totalCostUsd / b!.financials.revenue_usd) * 100).toFixed(1)}%`}
                  sub="of revenue"
                />
              )}
            </div>
          ) : (
            <DataNote>
              {!hasRevenue && !inferenceSummary.hasCostData
                ? "Revenue and inference cost data are both unavailable. Full comparison requires wallet attribution and cost tracking."
                : !hasRevenue
                  ? "Revenue data unavailable. Wallet attribution required."
                  : "Inference cost data is missing. Cost reporting must be activated for this comparison."}
            </DataNote>
          )}
        </Section>

        {/* 9. Net position */}
        <Section title="9 · Net Financial Position">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Row label="Revenue"         value={hasRevenue ? usd(b!.financials.revenue_usd) : "—"} />
            <Row label="Expenses"        value={hasBooks ? `-${usd(b!.financials.expenses_usd)}` : "—"} color={hasBooks ? "#f87171" : "var(--muted)"} />
            <Row label="Inference spend" value={inferenceSummary.hasCostData ? `-${usd(inferenceSummary.totalCostUsd)}` : "—"} color={inferenceSummary.hasCostData ? "#f87171" : "var(--muted)"} />
            <Row
              label="Net income"
              value={hasBooks ? usd(b!.financials.net_income_usd) : "—"}
              color={hasBooks ? (b!.financials.net_income_usd >= 0 ? "var(--accent)" : "#f87171") : "var(--muted)"}
            />
          </div>
        </Section>

        {/* 10. Data quality */}
        <Section title="10 · Data Quality Notes">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Wallet attribution",   ok: hasBooks,                          note: hasBooks ? "Declared and verified" : "Not declared — books unavailable" },
              { label: "Revenue data",         ok: hasRevenue,                        note: hasRevenue ? `${b!.confidence.revenue} confidence` : "No operating revenue recorded" },
              { label: "Treasury data",        ok: hasTreasury,                       note: hasTreasury ? `${b!.confidence.treasury} confidence` : "Unavailable" },
              { label: "Inference tracking",   ok: hasInference,                      note: hasInference ? `${inferenceSummary.requestCount} requests recorded` : "No events logged" },
              { label: "Cost data",            ok: inferenceSummary.hasCostData,      note: cost.text },
            ].map(({ label, ok, note }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6,
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{note}</span>
                  <span style={{ fontSize: "0.7rem", color: ok ? "var(--accent)" : "#f87171" }}>{ok ? "✓" : "✗"}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 11. Luca verdict */}
        <Section title="11 · Luca Verdict">
          <div style={{
            padding: "16px 18px", background: "var(--surface)",
            border: "1px solid var(--line)", borderRadius: 10,
          }}>
            <p style={{ fontSize: "0.86rem", lineHeight: 1.65, color: "var(--ink)", margin: 0 }}>{verdict}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 10 }}>
              Generated {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · 30-day window · Data via Zetta × Surplus
            </p>
          </div>
        </Section>

        {/* 12. Recommended actions */}
        <Section title="12 · Recommended Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              !hasBooks && {
                action: "Declare wallet manifest",
                why: "Required for books, revenue tracking, and treasury monitoring.",
                href: "/register",
                cta: "Submit manifest →",
              },
              !hasInference && {
                action: "Activate inference tracking",
                why: "Route inference calls through the Zetta proxy or configure the Surplus webhook.",
                href: "/docs/surplus-integration",
                cta: "Integration guide →",
              },
              hasInference && !inferenceSummary.hasCostData && {
                action: "Enable cost metadata",
                why: "Requests are counted but costs are missing. Pass cost_usd and cost_source in your inference logs.",
                href: "/docs/surplus-integration",
                cta: "See API spec →",
              },
              hasBooks && inferenceSummary.hasCostData && hasRevenue && {
                action: "Review provider concentration",
                why: inferenceSummary.providerBreakdown.length === 1
                  ? "Single provider dependency detected."
                  : "Monitor inference spend as a share of revenue.",
                href: null,
                cta: null,
              },
            ].filter(Boolean).map((item) => {
              if (!item) return null;
              return (
                <div key={item.action} style={{
                  padding: "10px 14px", background: "var(--surface)",
                  border: "1px solid var(--line)", borderRadius: 8,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.82rem" }}>{item.action}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>{item.why}</p>
                  </div>
                  {item.href && (
                    <Link href={item.href} style={{
                      fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none",
                      fontWeight: 600, whiteSpace: "nowrap", marginLeft: 16,
                    }}>{item.cta}</Link>
                  )}
                </div>
              );
            })}
            {hasBooks && hasInference && inferenceSummary.hasCostData && hasRevenue && (
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", padding: "8px 0" }}>
                All core data layers are active. Continue monitoring for inference cost ratio trends.
              </p>
            )}
          </div>
        </Section>

        <div style={{ padding: "14px 18px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, marginTop: 8 }}>
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            This report is generated from on-chain data and inference logs. Revenue and expenses reflect attributed financial activity only.
            Inference costs are labeled as actual, estimated, or missing.
            This is not investment or financial advice.{" "}
            <Link href="/surplus" style={{ color: "var(--accent)" }}>← Surplus pilot overview</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
