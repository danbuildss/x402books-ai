import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { Agent } from "@/app/registry/types";
import { getInferenceEvents, summarizeInferenceEvents, generateMonthlyStatement } from "@/lib/inference-events";
import { getAgentGDP } from "@/lib/agent-gdp";
import { toSlug } from "@/app/registry/[slug]/slug";
import { LedgerRow, LedgerCard } from "@/components/ui/ledger";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge, CostStatusBadge, EcoBadge } from "@/components/ui/badge";
import { MetricCard, MetricGrid } from "@/components/ui/metric";

export const revalidate = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 0.01)  return `$${n.toFixed(5)}`;
  if (n < 1)     return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

async function getAgent(slug: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    return agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return AGENTS.find((a) => toSlug(a.name) === slug) ?? null;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) return { title: "Agent not found — Zetta" };
  return {
    title: `${agent.name} — Surplus Pilot Report · Zetta`,
    description: `Inference economics report for ${agent.name}. Surplus × Zetta pilot — per-agent spend, provider breakdown, and Luca verdict.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SurplusAgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const agent = await getAgent(slug);
  if (!agent) notFound();

  // Inference data
  const events = await getInferenceEvents(slug, 30, 500);
  const summary = summarizeInferenceEvents(slug, events, 30);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const statement = generateMonthlyStatement(slug, summary, month);

  // GDP / books data
  let gdpEntry: { revenue_usd: number; expenses_usd: number; net_income_usd: number } | null = null;
  try {
    const gdp = await getAgentGDP();
    gdpEntry = gdp.all_attributed.find((e) => e.slug === slug) ?? null;
  } catch {
    gdpEntry = null;
  }

  const walletCount = agent.wallets?.length ?? 0;
  const hasBooks = gdpEntry !== null;
  const hasCost = summary.hasCostData;

  // Data quality labels
  const inferenceQuality = summary.requestCount === 0
    ? "No inference activity recorded"
    : hasCost
      ? summary.costStatus === "actual"
        ? "Cost data attributed (actual)"
        : "Cost data attributed (estimated)"
      : `${summary.requestCount} request${summary.requestCount === 1 ? "" : "s"} tracked — cost data missing`;

  const walletStatus = walletCount > 0 ? `${walletCount} wallet${walletCount === 1 ? "" : "s"} attributed` : "No wallets declared";
  const booksStatus = hasBooks ? "Books attributed — revenue and expenses tracked" : walletCount > 0 ? "Wallets declared — books building" : "No manifest — books unattributed";

  // Provider breakdown total for % calc
  const totalProviderCost = summary.providerBreakdown.reduce((s, p) => s + p.totalCost, 0);

  // Net position: revenue vs inference
  const netPosition = hasBooks && hasCost
    ? gdpEntry!.revenue_usd - summary.totalCostUsd
    : null;

  return (
    <div className="lp-root">
    <SiteNav />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 36, flexWrap: "wrap",
      }}>
        <Link href="/" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>
          ← Zetta
        </Link>
        <span style={{ color: "var(--line)", fontSize: "0.78rem" }}>/</span>
        <Link href="/surplus" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>
          ← Surplus Pilot
        </Link>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: summary.requestCount > 0 ? "var(--accent)" : "var(--muted)",
            display: "inline-block",
          }} />
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            {summary.requestCount > 0 ? "live data" : "no inference data"}
          </span>
        </span>
      </div>

      {/* ── Agent identity ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase",
          letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 6,
        }}>
          Surplus × Zetta · Pilot Report
        </p>
        <h1 style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 14,
        }}>
          {agent.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <EcoBadge ecosystem={agent.ecosystem} />
          <StatusBadge variant={
            agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed" ? "verified"
            : agent.verificationStatus === "Wallets Declared" ? "wallets-declared"
            : agent.verificationStatus === "ERC-8004 Indexed" ? "erc8004"
            : agent.verificationStatus === "Claimed" ? "claimed"
            : "neutral"
          }>
            {agent.verificationStatus}
          </StatusBadge>
          {agent.xHandle && (
            <a
              href={`https://x.com/${agent.xHandle.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none" }}
            >
              @{agent.xHandle.replace(/^@/, "")}
            </a>
          )}
          {walletCount > 0 && (
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              {walletCount} wallet{walletCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          Last 30 days · Inference economics report
        </p>
      </div>

      {/* ── Pilot status banner ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
        border: `1px solid ${
          summary.costStatus === "actual" ? "rgba(74,232,160,.25)"
          : summary.costStatus === "estimated" ? "rgba(244,185,66,.25)"
          : "rgba(244,96,96,.20)"}`,
        borderRadius: 8, marginBottom: 28,
        background: summary.costStatus === "actual"
          ? "rgba(74,232,160,.05)"
          : summary.costStatus === "estimated"
            ? "rgba(244,185,66,.05)"
            : "rgba(244,96,96,.04)",
      }}>
        <CostStatusBadge status={summary.costStatus} />
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          {summary.costStatus === "actual"
            ? "Inference cost data is attributed from actual provider billing. Financial data is complete."
            : summary.costStatus === "estimated"
              ? "Inference cost data is estimated from model and token usage. Actual provider billing may differ."
              : summary.requestCount > 0
                ? `${summary.requestCount} inference request${summary.requestCount === 1 ? "" : "s"} tracked. Cost metadata is missing — contact the pilot team to enable cost attribution.`
                : "No inference activity recorded for this agent in the last 30 days. Join the pilot to start logging events."}
        </p>
      </div>

      {/* ── Inference metrics ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "var(--muted)", margin: "0 0 10px",
        }}>
          Inference activity · 30 days
        </p>
        <MetricGrid cols={4} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <MetricCard
            label="Total Spend"
            value={hasCost ? usd(summary.totalCostUsd) : "—"}
            sub={hasCost ? undefined : "cost missing"}
            valueColor={hasCost ? "var(--ink)" : "var(--muted)"}
          />
          <MetricCard
            label="Requests"
            value={summary.requestCount > 0 ? summary.requestCount.toLocaleString() : "—"}
            sub={summary.requestCount > 0 ? "30d" : "no activity"}
            valueColor={summary.requestCount > 0 ? "var(--ink)" : "var(--muted)"}
          />
          <MetricCard
            label="Primary Provider"
            value={summary.primaryProvider ?? "—"}
            valueColor={summary.primaryProvider ? "var(--ink)" : "var(--muted)"}
          />
          <MetricCard
            label="Avg Cost / Request"
            value={hasCost && summary.requestCount > 0 ? usd(summary.avgCostPerRequest) : "—"}
            valueColor={hasCost && summary.requestCount > 0 ? "var(--ink)" : "var(--muted)"}
          />
        </MetricGrid>
      </div>

      {/* ── Provider breakdown ──────────────────────────────────────────────── */}
      <LedgerCard title="Provider Breakdown" eyebrow="Inference" style={{ marginBottom: 28 }}>
        {summary.providerBreakdown.length === 0 ? (
          <div style={{
            padding: "12px 14px", background: "var(--surface)",
            border: "1px solid var(--line)", borderRadius: 8,
            fontSize: "0.82rem", color: "var(--muted)",
          }}>
            No provider data available.
          </div>
        ) : (
          summary.providerBreakdown.map((p, i) => {
            const isFirst = i === 0;
            const isLast  = i === summary.providerBreakdown.length - 1;
            const pct = totalProviderCost > 0 ? ((p.totalCost / totalProviderCost) * 100).toFixed(1) : null;
            return (
              <LedgerRow
                key={p.provider}
                first={isFirst}
                last={isLast}
                label={p.provider}
                detail={`${p.requestCount} req${p.requestCount === 1 ? "" : "s"}${pct ? ` · ${pct}%` : ""}`}
                value={hasCost ? usd(p.totalCost) : "—"}
                valueStyle={hasCost ? undefined : { color: "var(--muted)" }}
              />
            );
          })
        )}
      </LedgerCard>

      {/* ── Revenue vs Inference Cost ────────────────────────────────────────── */}
      <LedgerCard title="Revenue vs Inference Cost" eyebrow="Economics" style={{ marginBottom: 28 }}>
        <LedgerRow
          first
          label="Operating Revenue"
          value={hasBooks ? usd(gdpEntry!.revenue_usd) : "—"}
          detail={hasBooks ? "30d" : "no books"}
          valueStyle={hasBooks ? { color: "var(--accent)" } : { color: "var(--muted)" }}
        />
        <LedgerRow
          label="Inference Spend"
          value={hasCost ? usd(summary.totalCostUsd) : "—"}
          detail={hasCost ? "30d" : "cost missing"}
          valueStyle={hasCost ? { color: "var(--red)" } : { color: "var(--muted)" }}
        />
        <LedgerRow
          last
          label="Net Position"
          value={netPosition !== null ? usd(netPosition) : "—"}
          detail={netPosition !== null ? (netPosition >= 0 ? "surplus" : "deficit") : "unattributed"}
          valueStyle={
            netPosition === null ? { color: "var(--muted)" }
            : netPosition >= 0 ? { color: "var(--accent)" }
            : { color: "var(--red)" }
          }
        />
      </LedgerCard>

      {/* ── Treasury ────────────────────────────────────────────────────────── */}
      <LedgerCard title="Treasury" eyebrow="Balance" style={{ marginBottom: 28 }}>
        <LedgerRow
          first
          label="Treasury Balance"
          value="—"
          detail={hasBooks ? "no live balance" : "no manifest"}
          valueStyle={{ color: "var(--muted)" }}
        />
        <LedgerRow
          last
          label="Runway"
          value="—"
          detail="not tracked"
          valueStyle={{ color: "var(--muted)" }}
        />
      </LedgerCard>

      {/* ── Luca verdict ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "var(--muted)", margin: "0 0 10px",
        }}>
          Luca verdict
        </p>
        <div style={{
          padding: "16px 18px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--surface)",
        }}>
          <p style={{
            fontSize: "0.88rem", color: "var(--ink)", lineHeight: 1.7,
            fontStyle: "italic", margin: 0,
          }}>
            &ldquo;{statement.verdict}&rdquo;
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10, marginBottom: 0 }}>
            Luca · {month} · {summary.periodDays}d window
          </p>
        </div>
      </div>

      {/* ── Data quality notes ───────────────────────────────────────────────── */}
      <LedgerCard title="Data Quality" eyebrow="Attribution" style={{ marginBottom: 28 }}>
        <LedgerRow
          first
          label="Inference data"
          value={summary.costStatus === "actual" ? "Attributed" : summary.costStatus === "estimated" ? "Estimated" : "Missing"}
          badge={<CostStatusBadge status={summary.costStatus} />}
          valueStyle={{ display: "none" } as React.CSSProperties}
        />
        <LedgerRow
          label="Wallet attribution"
          value={walletCount > 0 ? "Attributed" : "Unattributed"}
          badge={
            <StatusBadge variant={walletCount > 0 ? "attributed" : "unattributed"}>
              {walletCount > 0 ? `${walletCount} wallet${walletCount === 1 ? "" : "s"}` : "No manifest"}
            </StatusBadge>
          }
          valueStyle={{ display: "none" } as React.CSSProperties}
        />
        <LedgerRow
          last
          label="Books status"
          value={hasBooks ? "Attributed" : walletCount > 0 ? "Building" : "No manifest"}
          badge={
            <StatusBadge variant={hasBooks ? "attributed" : walletCount > 0 ? "estimated" : "unattributed"}>
              {hasBooks ? "Books attributed" : walletCount > 0 ? "Wallets declared" : "No manifest"}
            </StatusBadge>
          }
          valueStyle={{ display: "none" } as React.CSSProperties}
        />
      </LedgerCard>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 24px", border: "1px solid var(--line)",
        borderRadius: 10, background: "var(--surface)",
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <Link href="/surplus" style={{
          display: "inline-flex", alignItems: "center",
          fontSize: "0.82rem", fontWeight: 700,
          color: "var(--accent)", textDecoration: "none",
        }}>
          Join the Surplus pilot →
        </Link>
        <span style={{ color: "var(--line)" }}>·</span>
        <Link href="/register" style={{
          display: "inline-flex", alignItems: "center",
          fontSize: "0.82rem", fontWeight: 600,
          color: "var(--muted)", textDecoration: "none",
        }}>
          Submit manifest →
        </Link>
      </div>

    </main>
    <SiteFooter />
    </div>
  );
}
