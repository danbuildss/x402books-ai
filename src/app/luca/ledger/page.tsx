import Link from "next/link";
import type { Metadata } from "next";
import {
  getInferenceEvents,
  summarizeInferenceEvents,
  generateMonthlyStatement,
} from "@/lib/inference-events";
import type { InferenceEvent, InferenceSummary, MonthlyStatement, ProviderStat, CostSource } from "@/lib/inference-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luca Inference Ledger — Zetta",
  description: "Real-time inference economics for Luca. Powered by Zetta — the financial record layer for autonomous agents.",
};

function usd(n: number) {
  if (n === 0) return "$0.00";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 0.01)  return `$${n.toFixed(5)}`;
  if (n < 1)     return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)      return "just now";
  if (ms < 3_600_000)   return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000)  return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === "success" ? "var(--accent)" : status === "error" ? "#F46060" : "var(--muted)";
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6,
      borderRadius: "50%", background: color, flexShrink: 0,
    }} />
  );
}

function CostStatusBanner({ costStatus, requestCount }: { costStatus: CostSource; requestCount: number }) {
  if (requestCount === 0) return null;

  const config = {
    actual: {
      bg: "var(--accent)12",
      border: "var(--accent)40",
      dot: "var(--accent)",
      label: "Cost data: actual",
      note: "Cost figures are sourced from provider billing.",
    },
    estimated: {
      bg: "#F4B94212",
      border: "#F4B94240",
      dot: "#F4B942",
      label: "Cost data: estimated",
      note: "Spend is estimated from model pricing and token usage. Actual provider billing may differ.",
    },
    missing: {
      bg: "#F4606012",
      border: "#F4606040",
      dot: "#F46060",
      label: "Cost data: missing",
      note: "Requests are being tracked, but cost data is missing. Financial reporting is incomplete until provider cost metadata is active.",
    },
  }[costStatus];

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 14px", borderRadius: 8,
      background: config.bg, border: `1px solid ${config.border}`,
      marginBottom: 20,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: config.dot, flexShrink: 0, marginTop: 5 }} />
      <div>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{config.label}</p>
        <p style={{ fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{config.note}</p>
      </div>
    </div>
  );
}

function SummaryStats({ summary }: { summary: InferenceSummary }) {
  const costDisplay = summary.hasCostData ? usd(summary.totalCostUsd) : "—";
  const avgDisplay  = summary.hasCostData ? usd(summary.avgCostPerRequest) : "—";

  const stats = [
    { label: "Total Spend",        value: costDisplay,                          sub: `Last ${summary.periodDays}d` },
    { label: "Requests",           value: summary.requestCount.toString(),       sub: "inference calls" },
    { label: "Providers",          value: summary.providersUsed.length.toString(), sub: summary.primaryProvider ?? "none" },
    { label: "Avg Cost / Request", value: avgDisplay,                           sub: "per call" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 10, padding: "14px 16px",
        }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }}>{s.label}</p>
          <p style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>{s.value}</p>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

function ProviderBreakdown({ breakdown, total, hasCostData }: { breakdown: ProviderStat[]; total: number; hasCostData: boolean }) {
  if (breakdown.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        Provider Breakdown
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {breakdown.map((p) => {
          const pct = total > 0 ? (p.totalCost / total) * 100 : 0;
          return (
            <div key={p.provider} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>{p.provider}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{p.requestCount} req</span>
                </div>
                <span style={{ fontSize: "0.85rem", fontFamily: "monospace", fontWeight: 600, color: "var(--ink)" }}>
                  {hasCostData ? usd(p.totalCost) : "—"}
                </span>
              </div>
              {hasCostData && (
                <div style={{ height: 3, background: "var(--surface-soft)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatementBlock({ statement }: { statement: MonthlyStatement }) {
  const netColor = statement.netPosition > 0 ? "var(--accent)" : statement.netPosition < 0 ? "#F46060" : "var(--ink)";
  const spendDisplay = statement.inferenceSpend > 0 ? `-${usd(statement.inferenceSpend)}` : "—";

  return (
    <section style={{ marginBottom: 28 }}>
      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        Monthly Statement · {statement.month}
      </p>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 10, padding: "16px 18px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Inference Spend", spendDisplay, statement.inferenceSpend > 0 ? "#F46060" : "var(--muted)"],
            ["Revenue",         "+$0.00",     "var(--muted)"],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--muted)" }}>{label}</span>
              <span style={{ fontFamily: "monospace", color: color as string }}>{value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: "0.88rem", fontWeight: 700 }}>
            <span>Net Position</span>
            <span style={{ fontFamily: "monospace", color: netColor }}>
              {statement.netPosition === 0 ? "—" : `${statement.netPosition >= 0 ? "+" : ""}${usd(Math.abs(statement.netPosition))}`}
            </span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
          {statement.topProvider && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Primary Provider</span>
              <span style={{ color: "var(--ink)", textTransform: "capitalize" }}>{statement.topProvider}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>Requests</span>
            <span style={{ color: "var(--ink)" }}>{statement.requestCount}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Verdict</p>
          <p style={{ fontSize: "0.82rem", color: "var(--ink)", lineHeight: 1.55 }}>{statement.verdict}</p>
        </div>
      </div>
    </section>
  );
}

function EventFeed({ events }: { events: InferenceEvent[] }) {
  if (events.length === 0) {
    return (
      <section>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Recent Events
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "24px 18px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No inference events recorded yet.</p>
          <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 6 }}>
            Events are logged when Luca processes requests.
          </p>
        </div>
      </section>
    );
  }

  const shown = events.slice(0, 50);

  return (
    <section>
      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        Recent Events
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {shown.map((e, i) => (
          <div key={e.id ?? i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px",
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: i === 0 ? "8px 8px 0 0" : i === shown.length - 1 ? "0 0 8px 8px" : 0,
            borderBottomWidth: i < shown.length - 1 ? 0 : 1,
          }}>
            <StatusDot status={e.status} />
            <span style={{ fontSize: "0.78rem", color: "var(--ink)", textTransform: "capitalize", minWidth: 80 }}>{e.provider}</span>
            {e.model && (
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "monospace", flex: 1 }}>{e.model}</span>
            )}
            {e.totalTokens && (
              <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {e.totalTokens.toLocaleString()}t
              </span>
            )}
            {e.requestType && (
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", background: "var(--surface-soft)", padding: "2px 7px", borderRadius: 4 }}>
                {e.requestType}
              </span>
            )}
            <span style={{
              fontSize: "0.78rem", fontFamily: "monospace",
              color: e.costSource === "missing" ? "var(--muted)" : "var(--ink)",
              marginLeft: "auto",
            }}>
              {e.costSource === "missing" || e.costUsd == null ? "—" : usd(e.costUsd)}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", minWidth: 60, textAlign: "right" }}>
              {e.createdAt ? relativeTime(e.createdAt) : "—"}
            </span>
          </div>
        ))}
      </div>
      {events.length > 50 && (
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
          Showing 50 of {events.length} events
        </p>
      )}
    </section>
  );
}

function PeriodTabs({ period }: { period: string }) {
  const tabs = [
    { value: "7d",  label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ];

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={`?period=${t.value}`}
          style={{
            padding: "6px 14px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500,
            textDecoration: "none",
            background: period === t.value ? "var(--accent)" : "var(--surface)",
            color: period === t.value ? "#fff" : "var(--muted)",
            border: `1px solid ${period === t.value ? "var(--accent)" : "var(--line)"}`,
          }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export default async function LucaLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30d" } = await searchParams;
  const days = period === "7d" ? 7 : 30;

  const events  = await getInferenceEvents("luca", days, 500);
  const summary = summarizeInferenceEvents("luca", events, days);

  const now   = new Date();
  const month = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const statement = generateMonthlyStatement("luca", summary, month);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--line)", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/luca" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            ← Luca
          </Link>
          <span style={{ color: "var(--line)" }}>·</span>
          <Link href="/registry/luca" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" }}>
            Registry Profile
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: events.length > 0 ? "var(--accent)" : "var(--muted)", display: "inline-block" }} />
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            {events.length > 0 ? "Live data" : "No data yet"}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Inference Ledger · Agent: Luca
          </p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.2, marginBottom: 8 }}>
            Inference Economics
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.55, maxWidth: 520 }}>
            Every inference call Luca makes becomes a financial event. Surplus powers the intelligence.
            Zetta records the economics. Luca explains what they mean.
          </p>
        </div>

        <PeriodTabs period={period} />
        <CostStatusBanner costStatus={summary.costStatus} requestCount={summary.requestCount} />
        <SummaryStats summary={summary} />
        <ProviderBreakdown breakdown={summary.providerBreakdown} total={summary.totalCostUsd} hasCostData={summary.hasCostData} />
        <StatementBlock statement={statement} />
        <EventFeed events={events} />

        {/* Integration note */}
        <div style={{
          marginTop: 32, padding: "14px 18px",
          background: "var(--surface-soft)", border: "1px solid var(--line)",
          borderRadius: 8,
        }}>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
            This ledger is populated via{" "}
            <code style={{ fontSize: "0.72rem", background: "var(--surface)", padding: "1px 5px", borderRadius: 3 }}>
              POST /api/inference/log
            </code>{" "}
            — the public endpoint for Surplus and other providers to report agent inference activity.{" "}
            <Link href="/docs/surplus-integration" style={{ color: "var(--accent)" }}>Integration guide →</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
