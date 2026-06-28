"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { toPng } from "html-to-image";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import type { Agent, Health, VerificationStatus } from "@/app/registry/types";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import type { InferenceSummary } from "@/lib/inference-events";
import type { SettlementClassification, SettlementPattern } from "@/lib/luca-classify";
import type { ToolDecisionEvent } from "@/lib/tool-decisions";
import type { AgentBooks, AgentBooksUnattributed } from "@/lib/agent-books";
import type { AgentBooksSnapshot } from "@/lib/agent-books-history";
import { computeMomentum } from "@/lib/agent-momentum";
import type { AgentMomentum } from "@/lib/agent-momentum";
import { SiteFooter } from "@/components/site-footer";
import type { AgentConfidenceLabel } from "@/lib/revenue-confidence";
import { CONFIDENCE_META } from "@/lib/revenue-confidence";

// ── Confidence badge (fetched client-side from confidence label API) ──────────

function ConfidenceLabelBadge({ slug }: { slug: string }) {
  const [label, setLabel] = useState<AgentConfidenceLabel | null>(null);
  useEffect(() => {
    fetch(`/api/v1/agent/${encodeURIComponent(slug)}/confidence`)
      .then((r) => r.json())
      .then((d: { label?: AgentConfidenceLabel | null }) => { if (d.label) setLabel(d.label); })
      .catch(() => {});
  }, [slug]);

  if (!label) return null;
  const meta = CONFIDENCE_META[label.confidence_level];
  return (
    <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, border: `1px solid ${meta.color}44`, background: `${meta.color}0d` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: label.public_note ? 6 : 0 }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: meta.color }}>{meta.label}</span>
        {label.reviewed_at && (
          <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: "auto" }}>
            Verified {new Date(label.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>
      {label.public_note && (
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.55 }}>{label.public_note}</p>
      )}
    </div>
  );
}

// ── Agent Books block ─────────────────────────────────────────────────────────

function AgentBooksBlock({ books }: { books: AgentBooks | AgentBooksUnattributed }) {
  const usd = (n: number) =>
    "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!books.attributed) {
    if (books.reason === "wallets_declared_not_scannable") {
      return (
        <section className="prof-section" style={{ borderLeft: "3px solid var(--line)", paddingLeft: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
            Wallets declared but not currently scannable. Verify that declared addresses are agent operational wallets on Base, not token contracts.
          </p>
          <a
            href="/developer#manifest"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.79rem", fontWeight: 600,
              color: "var(--accent)", textDecoration: "none",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>help_outline</span>
            Wallet manifest guide
          </a>
        </section>
      );
    }
    if (books.reason === "financials_under_review") {
      return (
        <section className="prof-section" style={{ borderLeft: "3px solid #6b7280", paddingLeft: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#6b728018", border: "1px solid #6b728040", color: "#6b7280", letterSpacing: "0.02em" }}>
              Under Review
            </span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 0 }}>
            {(books as AgentBooksUnattributed).message ?? "Financial figures are being verified with the agent team. Updated numbers will be published once attribution and classification are confirmed."}
          </p>
        </section>
      );
    }
    return (
      <section className="prof-section" style={{ borderLeft: "3px solid var(--line)", paddingLeft: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
        </div>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
          No books yet. This agent needs declared wallets before Zetta can generate revenue, expense, and profitability data.
        </p>
        <a
          href="/developer#manifest"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.79rem", fontWeight: 600,
            color: "var(--accent)", textDecoration: "none",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
          Declare wallets with{" "}
          <code style={{ fontFamily: "monospace", background: "var(--line)", padding: "1px 5px", borderRadius: 3 }}>
            .agent/wallets.json
          </code>
        </a>
      </section>
    );
  }

  const f = books.financials;
  const netPositive = f.net_income_usd >= 0;

  return (
    <section id="agent-books" className="prof-section">
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99,
          background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)",
          letterSpacing: "0.02em",
        }}>
          {books.period}
        </span>
      </div>

      {/* Human-verified confidence label (from admin review) */}
      <ConfidenceLabelBadge slug={books.agent.slug} />

      {/* No activity notice */}
      {f.tx_count === 0 && f.revenue_usd === 0 && f.expenses_usd === 0 && (
        <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.6 }}>
          No attributed on-chain activity in this 30-day period. Books will update as activity is detected.
        </p>
      )}

      {/* Primary stats: Revenue / Expenses / Net Income */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {([
          { label: "Revenue",    value: usd(f.revenue_usd),     color: f.revenue_usd > 0 ? "var(--accent)" : "var(--muted)" },
          { label: "Expenses",   value: usd(f.expenses_usd),    color: f.expenses_usd > 0 ? "#f87171"      : "var(--muted)" },
          { label: "Net Income", value: (netPositive ? "+" : "−") + usd(f.net_income_usd), color: netPositive ? "var(--accent)" : "#f87171" },
        ] as const).map(({ label, value, color }) => (
          <div key={label} style={{
            display: "flex", flexDirection: "column", gap: 4,
            padding: "10px 12px", borderRadius: 8,
            background: "var(--surface-soft)", border: "1px solid var(--line)",
          }}>
            <span style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
              {label}
            </span>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color, letterSpacing: "-0.02em", fontFamily: "monospace" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.77rem", color: "var(--muted)", marginBottom: 12 }}>
        {f.margin_pct !== null && (
          <span>
            Margin{" "}
            <strong style={{ color: f.margin_pct >= 0 ? "var(--ink)" : "#f87171" }}>
              {f.margin_pct.toFixed(1)}%
            </strong>
          </span>
        )}
        <span>Transactions <strong style={{ color: "var(--ink)" }}>{f.tx_count}</strong></span>
        <span>Wallets analyzed <strong style={{ color: "var(--ink)" }}>{books.wallets.analyzed}</strong></span>
        {books.attribution.internal_transfers_removed > 0 && (
          <span style={{ color: "var(--muted)" }}>
            {books.attribution.internal_transfers_removed} internal transfers excluded
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>
          Source{" "}
          <strong style={{ color: "var(--ink)", textTransform: "capitalize" }}>
            {books.attribution.source}
          </strong>
        </span>
      </div>

      {/* Confidence scores */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 6px", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Data Confidence
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              { label: "Revenue",  value: books.confidence.revenue  },
              { label: "Expenses", value: books.confidence.expenses },
              { label: "Treasury", value: books.confidence.treasury },
              { label: "Overall",  value: books.confidence.overall  },
            ] as const
          ).map(({ label, value }) => {
            const color = value === "high" ? "#6DB874" : value === "medium" ? "#F59E0B" : "#ef4444";
            return (
              <span key={label} style={{
                fontSize: "0.68rem", padding: "2px 9px", borderRadius: 99,
                background: `color-mix(in srgb, ${color} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
                color,
                fontWeight: 600,
              }}>
                {label}: {value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
            );
          })}
        </div>
        {books.confidence.flags.length > 0 && (
          <p style={{ margin: "5px 0 0", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
            {books.confidence.flags.map((f) => f.replace(/_/g, " ")).join(" · ")}
          </p>
        )}
      </div>

      {/* Quarantine disclosure */}
      {books.classification.quarantined_inflows_usd > 0 && (
        <div style={{
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(245,158,11,0.28)",
          background: "rgba(245,158,11,0.06)",
        }}>
          <p style={{ margin: "0 0 7px", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#F59E0B" }}>
            Classification · Quarantined Inflows
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--muted)" }}>Operating Revenue</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: f.revenue_usd > 0 ? "var(--accent)" : "var(--muted)" }}>
                {usd(f.revenue_usd)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--muted)" }}>Quarantined Inflows</span>
              <span style={{ fontFamily: "monospace", color: "#F59E0B" }}>
                {usd(books.classification.quarantined_inflows_usd)}
              </span>
            </div>
          </div>
          {books.classification.quarantined_events.length > 0 && (
            <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Reason:{" "}
              {[...new Set(books.classification.quarantined_events.map((e) => e.reason.replace(/_/g, " ")))].join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Expense breakdown */}
      {books.breakdown.expenses_by_category.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>
            Expenses by Category
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {books.breakdown.expenses_by_category.slice(0, 4).map((e) => (
              <div key={e.category} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--muted)" }}>{e.label}</span>
                <span style={{ fontFamily: "monospace", color: "#f87171" }}>−{usd(e.total_usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Luca financial summary */}
      {books.luca_summary && (
        <p style={{
          fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6,
          paddingTop: 10, borderTop: "1px solid var(--line)",
        }}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>Luca: </span>
          {books.luca_summary}
        </p>
      )}

      {/* Methodology note */}
      <p style={{ margin: "10px 0 0", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.55 }}>
        Revenue reflects operating inflows only. Capital injections, bridge transfers, grants, token distributions, and swaps are excluded or quarantined.{" "}
        <Link href="/methodology" style={{ color: "var(--accent)", textDecoration: "none" }}>Methodology →</Link>
      </p>
    </section>
  );
}

// ── Treasury Signals ──────────────────────────────────────────────────────────

function TreasurySignals({ books }: { books: AgentBooks }) {
  const f = books.financials;
  const usd = (n: number) =>
    "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isProfitable = f.net_income_usd > 0;
  const isBreakEven = Math.abs(f.net_income_usd) < f.revenue_usd * 0.05 && f.revenue_usd > 0;
  const isInactive = f.tx_count === 0;

  const verdictLabel = isInactive ? "Inactive" : isProfitable ? "Generating" : isBreakEven ? "Break-even" : "Cash burn";
  const verdictColor = isInactive ? "var(--muted)" : isProfitable ? "#6DB874" : isBreakEven ? "#f59e0b" : "#ef4444";

  const coverageRatio = f.expenses_usd > 0 ? Math.min(2, f.revenue_usd / f.expenses_usd) : null;
  const coveragePct = coverageRatio !== null ? Math.round(coverageRatio * 50) : null;
  const coverageLabel = coverageRatio === null ? null : coverageRatio >= 1 ? `${(coverageRatio * 100).toFixed(0)}% coverage` : `${(coverageRatio * 100).toFixed(0)}% covered`;

  const topSource = books.breakdown.revenue_by_source[0];
  const topSourcePct = topSource && f.revenue_usd > 0 ? Math.round((topSource.total_usd / f.revenue_usd) * 100) : null;

  if (isInactive) return null;

  return (
    <section className="prof-section">
      <p className="prof-section-title">Treasury Signals</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Profitability verdict */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Profitability</span>
          <span style={{ fontWeight: 700, color: verdictColor }}>
            ● {verdictLabel}
          </span>
        </div>

        {/* Revenue coverage bar */}
        {coveragePct !== null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 5 }}>
              <span style={{ color: "var(--muted)" }}>Revenue vs Expenses</span>
              <span style={{ color: verdictColor, fontWeight: 600 }}>{coverageLabel}</span>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, coveragePct)}%`,
                background: isProfitable ? "#6DB874" : "#ef4444",
                borderRadius: 99,
                transition: "width 0.4s",
              }} />
            </div>
          </div>
        )}

        {/* 30d burn rate */}
        {f.expenses_usd > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>30d Burn Rate</span>
            <span style={{ fontFamily: "monospace", color: "#f87171" }}>−{usd(f.expenses_usd)}</span>
          </div>
        )}

        {/* Margin */}
        {f.margin_pct !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>Net Margin</span>
            <span style={{ fontFamily: "monospace", fontWeight: 600, color: f.margin_pct >= 0 ? "#6DB874" : "#f87171" }}>
              {f.margin_pct.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Treasury balance + runway */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Treasury (stables)</span>
          {f.treasury_balance_usd !== null
            ? <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--fg)" }}>{usd(f.treasury_balance_usd)}</span>
            : <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>— <span style={{ fontSize: "0.7rem" }}>No stablecoin balance detected</span></span>
          }
        </div>
        {f.runway_months !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>Runway</span>
            <span style={{ fontFamily: "monospace", fontWeight: 600, color: f.runway_months >= 3 ? "#6DB874" : f.runway_months >= 1 ? "#f59e0b" : "#ef4444" }}>
              {f.runway_months < 1 ? "< 1 mo" : `${f.runway_months.toFixed(1)} mo`}
            </span>
          </div>
        )}

        {/* Revenue concentration */}
        {topSource && topSourcePct !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>Top Revenue Source</span>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--muted)" }}>
                {topSource.address.slice(0, 6)}…{topSource.address.slice(-4)}
              </span>
              <span style={{ marginLeft: 6, color: "var(--fg)", fontWeight: 600 }}>{topSourcePct}%</span>
            </div>
          </div>
        )}

        {/* Attribution source tag */}
        <div style={{ paddingTop: 8, borderTop: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 99, background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)" }}>
            {books.attribution.source === "manifest" ? "Declared manifest" : "Registry attribution"}
          </span>
          {(() => {
            const c = books.attribution.confidence;
            const color = c === "high" ? "#6DB874" : c === "medium" ? "#F59E0B" : "#ef4444";
            const icon  = c === "high" ? "✓" : c === "medium" ? "~" : "⚠";
            const tip   = c === "high"
              ? "Wallets declared via signed manifest"
              : c === "medium"
              ? "Wallets inferred from public data"
              : "Unverified — declaration unconfirmed";
            return (
              <span title={tip} style={{
                fontSize: "0.68rem", padding: "2px 8px", borderRadius: 99, cursor: "default",
                background: `color-mix(in srgb, ${color} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                color,
              }}>
                {icon} {c} confidence
              </span>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

// ── Settlement pattern display ────────────────────────────────────────────────

const PATTERN_STYLE: Record<SettlementPattern, { bg: string; color: string; border: string }> = {
  dormant:                       { bg: "rgba(125,130,141,0.08)", color: "var(--muted)",  border: "rgba(125,130,141,0.14)" },
  active_operational:            { bg: "rgba(109,184,116,0.08)", color: "var(--accent)", border: "rgba(109,184,116,0.15)" },
  stable_treasury:               { bg: "rgba(109,184,116,0.08)", color: "var(--accent)", border: "rgba(109,184,116,0.15)" },
  revenue_generating:            { bg: "rgba(91,143,168,0.08)",  color: "var(--blue)",   border: "rgba(91,143,168,0.15)"  },
  high_spend_low_revenue:        { bg: "rgba(248,113,113,0.08)", color: "#f87171",        border: "rgba(248,113,113,0.15)" },
  heavy_outbound_settlement:     { bg: "rgba(251,191,36,0.08)",  color: "#f59e0b",        border: "rgba(251,191,36,0.15)"  },
  high_internal_transfer:        { bg: "rgba(91,143,168,0.08)",  color: "var(--blue)",   border: "rgba(91,143,168,0.15)"  },
  recurring_flow_detected:       { bg: "rgba(91,143,168,0.08)",  color: "var(--blue)",   border: "rgba(91,143,168,0.15)"  },
  incomplete_wallet_role:        { bg: "rgba(251,191,36,0.08)",  color: "#f59e0b",        border: "rgba(251,191,36,0.15)"  },
  unknown_counterparty_dominant: { bg: "rgba(251,191,36,0.08)",  color: "#f59e0b",        border: "rgba(251,191,36,0.15)"  },
};

const PATTERN_LABEL: Record<SettlementPattern, string> = {
  dormant:                       "Dormant",
  active_operational:            "Active",
  stable_treasury:               "Stable Treasury",
  revenue_generating:            "Revenue Generating",
  high_spend_low_revenue:        "High Spend",
  heavy_outbound_settlement:     "Heavy Outbound",
  high_internal_transfer:        "High Internal Transfer",
  recurring_flow_detected:       "Recurring Flows",
  incomplete_wallet_role:        "Roles Unverified",
  unknown_counterparty_dominant: "Unknown Counterparties",
};

function SettlementSection({ classification }: { classification: SettlementClassification }) {
  if (classification.signals.length === 0) return null;
  return (
    <section className="prof-section">
      <p className="prof-section-title">Activity Pattern</p>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55 }}>
        {classification.signals.slice(0, 2).join(" · ")}
      </p>
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

function xPfpUrl(handle: string) {
  return `https://unavatar.io/x/${handle.replace("@", "")}`;
}

// ── Shared badge components ───────────────────────────────────────────────────

function HealthBadge({ h }: { h: Health }) {
  // Descriptive status only — based on on-chain activity patterns
  const cls = h === "Active" ? "healthy" : h === "Stable" ? "stable" : h === "Inactive" ? "risk" : h === "Unverified" ? "watch" : "pending";
  return <span className={`reg-health reg-health-${cls}`}>{h}</span>;
}

const STATUS_META: Record<VerificationStatus, { cls: string; label: string; icon?: string }> = {
  "Candidate":          { cls: "candidate",       label: "Candidate"          },
  "Needs Verification": { cls: "needs-verify",    label: "Needs Verification" },
  "Wallets Declared":   { cls: "wallets-declared", label: "Wallets Declared"  },
  "Claimed":            { cls: "claimed",          label: "Claimed by Team", icon: "handshake" },
  "Verified":           { cls: "verified",         label: "Verified", icon: "verified" },
  "Luca Managed":       { cls: "luca-managed",     label: "Luca Managed"       },
  "ERC-8004 Indexed":   { cls: "candidate",        label: "ERC-8004 Indexed"   },
  "Awaiting Manifest":  { cls: "needs-verify",     label: "Awaiting Manifest"  },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`reg-badge reg-vstatus reg-vstatus-${m.cls}`}>
      {m.icon && <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{m.icon}</span>}
      {m.label}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "var(--accent)" : pct >= 40 ? "var(--blue)" : "var(--muted)";
  return (
    <div className="reg-score-row">
      <span className="reg-score-label">{label}</span>
      <div className="reg-score-bar-wrap">
        <div className="reg-score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="reg-score-val">{value}</span>
    </div>
  );
}

// ── Card helpers (shared with share modal) ───────────────────────────────────

const CARD_PATTERN_LABEL: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "Stable Treasury",
  revenue_generating:        "Revenue Activity",
  high_spend_low_revenue:    "High Spend",
  heavy_outbound_settlement: "Heavy Outbound",
  recurring_flow_detected:   "Recurring Flows",
  incomplete_wallet_role:    "Roles Unverified",
};

function cardTreasuryScore(agent: Agent): number {
  const map: Record<string, number> = { Active: 92, Stable: 78, Unverified: 45, Inactive: 18 };
  return map[agent.treasuryHealth] ?? 0;
}

function cardAttributionScore(agent: Agent): number {
  let s = 0;
  const wallets = agent.wallets ?? [];
  if (wallets.length > 0) s += 30;
  if (agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed") s += 40;
  else if (agent.verificationStatus === "Claimed")          s += 30;
  else if (agent.verificationStatus === "Wallets Declared") s += 20;
  if (agent.evidenceSources.length > 0) s += 20;
  if (agent.adminNotes) s += 10;
  return Math.min(100, s);
}


function cardVerdictSnippet(agent: Agent): string {
  if (!agent.adminNotes) return `${agent.name} is indexed in the registry. No verdict available yet.`;
  const notes = agent.adminNotes.trim();
  if (notes.length <= 180) return notes;
  const cut = notes.slice(0, 180);
  const lastDot = cut.lastIndexOf(".");
  return lastDot > 80 ? cut.slice(0, lastDot + 1) : cut + "…";
}

function cardStatusLabel(agent: Agent): string {
  const map: Record<string, string> = {
    "Verified": "Verified", "Luca Managed": "Luca Managed",
    "Claimed": "Claimed by Team", "Wallets Declared": "Wallets Declared",
    "Needs Verification": "Needs Verification", "Candidate": "Candidate",
  };
  return map[agent.verificationStatus] ?? agent.verificationStatus;
}

function cardStatusColor(agent: Agent): string {
  const s = agent.verificationStatus;
  if (s === "Verified" || s === "Luca Managed" || s === "Claimed") return "#6DB874";
  if (s === "Wallets Declared") return "#5B8FA8";
  return "#7d828d";
}

// ── Share card modal ──────────────────────────────────────────────────────────

function ShareCardModal({ agent, slug, classification, onClose }: {
  agent: Agent;
  slug: string;
  classification?: SettlementClassification;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const treasuryScore   = cardTreasuryScore(agent);
  const transpScore     = cardAttributionScore(agent);
  const verdict         = cardVerdictSnippet(agent);
  const vstatus         = cardStatusLabel(agent);

  const verifyColor =
    agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed" || agent.verificationStatus === "Claimed"
      ? "#2d6e35"
      : agent.verificationStatus === "Wallets Declared" ? "#376e8a" : "#888";

  const visiblePatterns = (classification?.patterns ?? [])
    .filter((p) => p !== "active_operational" && p !== "dormant" && CARD_PATTERN_LABEL[p])
    .slice(0, 3);

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${slug}-zettaai.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [slug]);

  const shareToX = useCallback(() => {
    const text = `${agent.name} · Status: ${vstatus} — tracked by Zetta`;
    const url  = `https://www.zettaai.co/registry/${slug}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [agent.name, agent.treasuryHealth, vstatus, slug]);

  // Prevent scroll-through on the body
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(4px)",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: 660, width: "100%" }}>

        {/* ── The card ── */}
        <div
          ref={cardRef}
          style={{
            position: "relative",
            width: "100%", maxWidth: 620,
            background: "#f0ece0",
            borderRadius: 20,
            overflow: "hidden",
            padding: "32px 36px 26px",
            boxShadow: "0 2px 40px rgba(0,0,0,0.12)",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Ghost watermark */}
          <div style={{
            position: "absolute", right: -10, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 180, fontWeight: 800,
            color: "rgba(80,70,50,0.045)",
            letterSpacing: "-0.05em",
            lineHeight: 1,
            pointerEvents: "none",
            userSelect: "none",
          }}>x402</div>

          {/* Brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: "#3b7a45", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: "#f0ece0" }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3b5e43", letterSpacing: "0.01em" }}>Zetta</span>
          </div>

          {/* Headline */}
          <p style={{ fontSize: "1.35rem", fontWeight: 300, color: "#7a7364", marginBottom: 8, lineHeight: 1.2 }}>
            <strong style={{ fontWeight: 600, color: "#3c3830" }}>{agent.name}</strong> is tracked by Zetta
          </p>

          {/* Hero stat */}
          <p style={{ fontSize: "3.2rem", fontWeight: 700, color: verifyColor, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
            {vstatus}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#9a9180", marginBottom: 22 }}>
            Verification Status
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(80,70,50,0.12)", marginBottom: 20 }} />

          {/* Stats columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 600, color: "#3c3830", letterSpacing: "-0.02em" }}>
                {transpScore}
              </span>
              <span style={{ fontSize: "0.68rem", color: "#9a9180" }}>Attribution Confidence</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, borderLeft: "1px solid rgba(80,70,50,0.1)", paddingLeft: 20 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: verifyColor, marginTop: 4 }}>
                {vstatus}
              </span>
              <span style={{ fontSize: "0.68rem", color: "#9a9180" }}>Verification</span>
            </div>
          </div>

          {/* Verdict */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(80,70,50,0.12)", position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(59,122,69,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
              Luca&apos;s Verdict
            </p>
            <p style={{ fontSize: "0.74rem", color: "#7a7364", lineHeight: 1.6 }}>{verdict}</p>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {visiblePatterns.map((p) => (
                <span key={p} style={{
                  fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px",
                  borderRadius: 99, background: "rgba(80,70,50,0.07)",
                  color: "#7a7364", border: "1px solid rgba(80,70,50,0.12)",
                }}>
                  {CARD_PATTERN_LABEL[p] ?? p}
                </span>
              ))}
            </div>
            <span style={{ fontSize: "0.66rem", color: "#b0a990" }}>
              zettaai.co/registry/{slug}
            </span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 420 }}>
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10,
              border: "1px solid rgba(109,184,116,0.3)",
              background: "rgba(109,184,116,0.1)", color: "#6DB874",
              fontSize: "0.82rem", fontWeight: 700, cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.6 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            {downloading ? "Saving…" : "Download PNG"}
          </button>
          <button
            type="button"
            onClick={shareToX}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "#eae8e3",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)", color: "rgba(234,232,227,0.4)",
              fontSize: "0.82rem", cursor: "pointer",
            }}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function ProfileAvatar({ agent }: { agent: Agent }) {
  const [failed, setFailed] = useState(false);
  if (failed || !agent.xHandle) {
    return (
      <div className="prof-avatar prof-avatar-fallback">
        {agent.name[0]}
      </div>
    );
  }
  const src = agent.pfp ?? xPfpUrl(agent.xHandle);
  return (
    <Image
      src={src}
      alt={agent.name}
      width={72}
      height={72}
      className="prof-avatar"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

// ── Inference Activity block (any agent with data) ───────────────────────────

function InferenceActivityBlock({ ia }: { ia: InferenceSummary }) {
  const usd = (n: number) => n === 0 ? "$0.00" : n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(2)}`;

  return (
    <section className="prof-section">
      <p className="prof-section-title">
        Inference Activity · Last 30d
        {ia.agentId === "luca" && (
          <a href="/luca/ledger" style={{ marginLeft: 8, fontSize: "0.7rem", color: "var(--accent)", textDecoration: "none" }}>
            Full ledger →
          </a>
        )}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>30d Spend</span>
          <span style={{ fontFamily: "monospace", color: "#f87171" }}>-{usd(ia.totalCostUsd)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Requests</span>
          <span style={{ fontFamily: "monospace" }}>{ia.requestCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Primary Provider</span>
          <span style={{ color: "var(--ink)", textTransform: "capitalize" }}>{ia.primaryProvider ?? "—"}</span>
        </div>
        {ia.providerBreakdown.length > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>Providers Used</span>
            <span style={{ color: "var(--ink)" }}>{ia.providersUsed.join(", ")}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Avg Cost / Request</span>
          <span style={{ fontFamily: "monospace" }}>{usd(ia.avgCostPerRequest)}</span>
        </div>
      </div>
    </section>
  );
}

// ── Agent Economics block (Luca only) ────────────────────────────────────────

function AgentEconomicsBlock({ economics }: { economics: AgentEconomicSummary }) {
  const s = economics;
  const netColor = s.netAgentPosition > 0.01 ? "#4ade80" : s.netAgentPosition < -0.01 ? "#f87171" : "var(--ink)";
  const usd = (n: number) => `$${Math.abs(n).toFixed(2)}`;

  return (
    <section className="prof-section">
      <p className="prof-section-title">Agent Economics · Last {s.periodDays}d</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["Inference Spend",   `-${usd(s.totalInferenceSpend)}`,   s.totalInferenceSpend  > 0 ? "#f87171" : undefined],
          ["Inference Revenue", `+${usd(s.totalInferenceRevenue)}`, s.totalInferenceRevenue > 0 ? "#4ade80" : undefined],
          ["Provider Spend",    `-${usd(s.providerSpend)}`,         undefined, s.topProvider ?? undefined],
          ["Fallback Usage",    `-${usd(s.fallbackProviderSpend)}`, undefined, s.fallbackUsageCount > 0 ? `${s.fallbackUsageCount} call${s.fallbackUsageCount === 1 ? "" : "s"}` : undefined],
          ["API Costs",         `-${usd(s.apiCosts)}`,              undefined],
          ["Wallet Inflows",    `+${usd(s.walletInflows)}`,         s.walletInflows > 0 ? "#4ade80" : undefined],
          ["Wallet Outflows",   `-${usd(s.walletOutflows)}`,        undefined],
        ].map(([label, value, color, sub]) => (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>{label}</span>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "monospace", color: (color as string) ?? "var(--ink)" }}>{value}</span>
              {sub && <span style={{ color: "var(--muted)", fontSize: "0.72rem", marginLeft: 6 }}>{sub as string}</span>}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 4, fontSize: "0.85rem", fontWeight: 600 }}>
          <span>Net Position</span>
          <span style={{ fontFamily: "monospace", color: netColor }}>
            {s.netAgentPosition >= 0 ? "+" : ""}{usd(s.netAgentPosition)}
          </span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 6, lineHeight: 1.5 }}>{s.lucaVerdict}</p>
      </div>
    </section>
  );
}

// ── Tool Decisions block (Nipmod integration) ────────────────────────────────

const RISK_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  low:     { color: "var(--accent)", bg: "rgba(109,184,116,0.08)", border: "rgba(109,184,116,0.18)" },
  medium:  { color: "#f59e0b",       bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.18)"  },
  high:    { color: "#f87171",       bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.18)" },
  unknown: { color: "var(--muted)",  bg: "rgba(125,130,141,0.06)", border: "rgba(125,130,141,0.14)" },
};

const DECISION_ICON: Record<string, string> = {
  install: "check_circle",
  reject:  "cancel",
  defer:   "schedule",
  unknown: "help",
};

function ToolDecisionsBlock({ events }: { events: ToolDecisionEvent[] }) {
  if (events.length === 0) return null;

  const installs = events.filter((e) => e.decision === "install").length;
  const rejects  = events.filter((e) => e.decision === "reject").length;
  const highRisk = events.filter((e) => e.risk_level === "high").length;

  return (
    <section className="prof-section">
      <p className="prof-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        Tool Decisions
        <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--muted)", background: "var(--surface-soft)", padding: "1px 6px", borderRadius: 99, border: "1px solid var(--line)" }}>
          via Nipmod
        </span>
      </p>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { label: "Installed", value: installs, color: "var(--accent)" },
          { label: "Rejected",  value: rejects,  color: "#f87171" },
          { label: "High Risk", value: highRisk,  color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Event list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events.slice(0, 6).map((e) => {
          const rs = RISK_STYLE[e.risk_level] ?? RISK_STYLE.unknown;
          return (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 8,
              background: "var(--surface-soft)", border: "1px solid var(--line)",
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 14,
                color: e.decision === "install" ? "var(--accent)" : e.decision === "reject" ? "#f87171" : "var(--muted)",
                flexShrink: 0,
              }}>
                {DECISION_ICON[e.decision] ?? "help"}
              </span>
              <span style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.package}
              </span>
              {e.source && (
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0 }}>{e.source}</span>
              )}
              <span style={{
                fontSize: "0.64rem", fontWeight: 600, padding: "2px 6px", borderRadius: 99,
                color: rs.color, background: rs.bg, border: `1px solid ${rs.border}`,
                flexShrink: 0, textTransform: "capitalize",
              }}>
                {e.risk_level}
              </span>
              {e.trust_score !== null && (
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0 }}>
                  {e.trust_score}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Claim banner (top of body, unclaimed profiles only) ──────────────────────

type ClaimTab = "wallet" | "manifest";
type ClaimState = "idle" | "loading" | "done" | "error";

function ClaimBanner({ slug, agentName, status }: { slug: string; agentName: string; status: string }) {
  // Start expanded for unclaimed/unverified profiles — the CTA is the primary action
  const isUnclaimed = status === "Candidate" || status === "Awaiting Manifest";
  const needsAttention = status === "Needs Verification";
  const [expanded, setExpanded]       = useState(isUnclaimed || needsAttention);
  const [tab, setTab]                 = useState<ClaimTab>("manifest");

  // wallet tab state
  const [wallet, setWallet]           = useState("");
  const [walletState, setWalletState] = useState<ClaimState>("idle");
  const [walletMatched, setWalletMatched] = useState(false);
  const [walletMsg, setWalletMsg]     = useState("");

  // manifest tab state
  const [repoUrl, setRepoUrl]         = useState("");
  const [mfState, setMfState]         = useState<ClaimState>("idle");
  const [mfMsg, setMfMsg]             = useState("");

  if (status === "Verified" || status === "Luca Managed" || status === "Claimed") return null;

  const bannerHeading = needsAttention
    ? `Action needed: ${agentName}`
    : `This profile is unclaimed`;

  const done = (tab === "wallet" && walletState === "done") || (tab === "manifest" && mfState === "done");

  async function submitWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    setWalletState("loading");
    try {
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: slug, wallet_address: wallet.trim() }),
      });
      const d = await res.json() as { ok: boolean; matched?: boolean; message?: string; error?: string };
      if (d.ok) {
        setWalletState("done");
        setWalletMatched(d.matched ?? false);
        setWalletMsg(d.message ?? "Claim submitted.");
      } else {
        setWalletState("error");
        setWalletMsg(d.error ?? "Something went wrong.");
      }
    } catch {
      setWalletState("error");
      setWalletMsg("Network error. Please try again.");
    }
  }

  async function submitManifest(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setMfState("loading");
    try {
      const res = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      const d = await res.json() as { ok: boolean; message?: string; error?: string };
      if (d.ok) {
        setMfState("done");
        setMfMsg(d.message ?? "Manifest submitted for verification.");
      } else {
        setMfState("error");
        setMfMsg(d.error ?? "Something went wrong.");
      }
    } catch {
      setMfState("error");
      setMfMsg("Network error. Please try again.");
    }
  }

  const bannerStyle: React.CSSProperties = {
    borderRadius: 12,
    border: needsAttention ? "1px solid rgba(245,158,11,0.35)" : isUnclaimed ? "1px solid rgba(109,184,116,0.35)" : "1px solid rgba(109,184,116,0.22)",
    borderLeft: needsAttention ? "3px solid #f59e0b" : "3px solid var(--accent)",
    background: needsAttention ? "rgba(245,158,11,0.06)" : "var(--accent-soft)",
    padding: expanded ? ((isUnclaimed || needsAttention) ? "20px 22px" : "16px 18px") : "13px 18px",
    marginBottom: 20,
    transition: "padding 0.15s",
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (done) {
    const isMatch = tab === "wallet" && walletMatched;
    const doneMsg = tab === "wallet" ? walletMsg : mfMsg;
    const title   = tab === "manifest"
      ? "Manifest queued for verification"
      : isMatch ? "Wallet matched — claim under review" : "Claim submitted for review";
    const color   = (tab === "manifest" || isMatch) ? "var(--accent)" : "#f59e0b";
    const icon    = (tab === "manifest" || isMatch) ? "check_circle" : "info";
    const nextStep = (!isMatch && tab === "wallet")
      ? "Our team reviews claims within 24–48 hours. Questions? Message @zettatracker on X."
      : null;
    return (
      <div style={bannerStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color, marginTop: 1, flexShrink: 0 }}>{icon}</span>
          <div>
            <p style={{ fontSize: "0.84rem", fontWeight: 700, color, marginBottom: 3 }}>{title}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{doneMsg}</p>
            {nextStep && (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>{nextStep}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Collapsed state ───────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div style={bannerStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--accent)", flexShrink: 0 }}>handshake</span>
            <p style={{ fontSize: "0.82rem", color: "var(--ink)", fontWeight: 500, margin: 0 }}>
              Is this your agent?{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                Claim <strong style={{ color: "var(--ink)" }}>{agentName}</strong> to verify ownership.
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setTab("manifest"); setExpanded(true); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(59,130,246,0.4)",
                background: "rgba(59,130,246,0.08)", color: "#3b82f6",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Submit manifest
            </button>
            <button
              type="button"
              onClick={() => { setTab("wallet"); setExpanded(true); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(109,184,116,0.35)",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Claim with wallet →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────────
  return (
    <div style={bannerStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: isUnclaimed ? 6 : 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: isUnclaimed ? 20 : 16, color: "var(--accent)", marginTop: 1, flexShrink: 0 }}>handshake</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: (isUnclaimed || needsAttention) ? "0.97rem" : "0.85rem", fontWeight: 700, color: needsAttention ? "#f59e0b" : "var(--ink)", margin: 0 }}>
            {bannerHeading}
          </p>
          {isUnclaimed && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "3px 0 0", lineHeight: 1.5 }}>
              Submit a wallet manifest to verify ownership, unlock financial attribution, and appear in the leaderboard.
            </p>
          )}
          {needsAttention && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "3px 0 0", lineHeight: 1.5 }}>
              There&apos;s an issue with your wallet claim. Submit a manifest to resolve it or message @zettatracker on X.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem", flexShrink: 0, marginTop: 2 }}
        >
          ✕
        </button>
      </div>
      {(isUnclaimed || needsAttention) && <div style={{ height: 10 }} />}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, border: "1px solid var(--line)", overflow: "hidden", width: "fit-content" }}>
        {(["manifest", "wallet"] as ClaimTab[]).map((t) => {
          const labels: Record<ClaimTab, string> = { wallet: "Claim with wallet", manifest: "Submit manifest" };
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "6px 14px",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
                border: "none", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: active ? 700 : 400,
                transition: "background 0.12s",
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Wallet tab */}
      {tab === "wallet" && (
        <>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.55 }}>
            Enter a wallet address associated with this agent. A match against declared wallets fast-tracks verification.
          </p>
          <form onSubmit={submitWallet} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="0x… your wallet address"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              pattern="^0x[0-9a-fA-F]{40}$"
              required
              autoFocus
              style={{
                flex: 1, minWidth: 200,
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)", fontSize: "0.82rem",
                fontFamily: "monospace", outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={walletState === "loading"}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: walletState === "loading" ? "not-allowed" : "pointer",
                opacity: walletState === "loading" ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {walletState === "loading" ? "Checking…" : "Submit Claim →"}
            </button>
            {walletState === "error" && (
              <p style={{ width: "100%", fontSize: "0.78rem", color: "#f87171", margin: "4px 0 0" }}>{walletMsg}</p>
            )}
          </form>
        </>
      )}

      {/* Manifest tab */}
      {tab === "manifest" && (
        <>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.55 }}>
            Add a <code style={{ fontFamily: "monospace", background: "var(--line)", padding: "1px 4px", borderRadius: 3 }}>.agent/wallets.json</code> file
            to your agent&apos;s GitHub or Gitlawb repo, then paste the repo URL below.
            This is the fastest path to <strong style={{ color: "var(--ink)" }}>Wallets Declared</strong> status.
          </p>
          <form onSubmit={submitManifest} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="url"
              placeholder="https://github.com/your-org/your-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
              autoFocus={tab === "manifest"}
              style={{
                flex: 1, minWidth: 220,
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)", fontSize: "0.82rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={mfState === "loading"}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "#3b82f6", color: "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: mfState === "loading" ? "not-allowed" : "pointer",
                opacity: mfState === "loading" ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {mfState === "loading" ? "Fetching…" : "Submit Manifest →"}
            </button>
            {mfState === "error" && (
              <p style={{ width: "100%", fontSize: "0.78rem", color: "#f87171", margin: "4px 0 0" }}>{mfMsg}</p>
            )}
          </form>
        </>
      )}
    </div>
  );
}

// ── Agent Books Trend (server-rendered SVG sparklines) ────────────────────────

type BooksTrendField = "revenue_usd" | "expenses_usd" | "net_income_usd" | "treasury_usd";

function AgentBooksSparkline({
  snapshots,
  field,
  color,
  width = 220,
  height = 44,
}: {
  snapshots: AgentBooksSnapshot[];
  field: BooksTrendField;
  color: string;
  width?: number;
  height?: number;
}) {
  // For treasury_usd, filter out snapshots where the value is null
  const validSnapshots = field === "treasury_usd"
    ? snapshots.filter((s) => s[field] !== null)
    : snapshots;

  if (validSnapshots.length < 2) return null;

  const values = validSnapshots.map((s) => (s[field] as number));
  const min   = Math.min(...values);
  const max   = Math.max(...values);
  const range = max - min || 1;
  const PAD   = 4;
  const pts   = validSnapshots.map((s, i) => {
    const x = PAD + (i / (validSnapshots.length - 1)) * (width - PAD * 2);
    const y = height - PAD - ((s[field] as number - min) / range) * (height - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = values[0];
  const last  = values[values.length - 1];
  const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const isUp = last >= first;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ display: "block", overflow: "visible" }}
      >
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle
          cx={pts[pts.length - 1].split(",")[0]}
          cy={pts[pts.length - 1].split(",")[1]}
          r="3"
          fill={color}
        />
      </svg>
      {first !== 0 && (
        <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: isUp ? "#6DB874" : "#ef4444", fontFamily: "monospace", fontWeight: 600 }}>
          {isUp ? "↑" : "↓"} {Math.abs(pctChange).toFixed(1)}%
          <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>
            across {validSnapshots.length} snapshots
          </span>
        </p>
      )}
    </div>
  );
}

function MomentumSection({ history }: { history: AgentBooksSnapshot[] }) {
  const m = computeMomentum(history, 30);
  if (!m) return null;

  const rows = [
    { label: "Revenue",    metric: m.revenue    },
    { label: "Net Income", metric: m.net_income },
    { label: "Expenses",   metric: m.expenses,  note: "lower is better" },
    { label: "Treasury",   metric: m.treasury   },
  ].filter((r): r is { label: string; metric: NonNullable<typeof r.metric>; note?: string } => r.metric !== null);

  return (
    <div style={{
      padding: "16px 20px",
      border: "1px solid var(--line)",
      borderRadius: 10,
      background: "var(--surface-soft)",
      marginTop: 16,
    }}>
      <p style={{ margin: "0 0 14px", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
        30-Day Momentum · {m.snapshot_count} snapshots
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {rows.map(({ label, metric, note }) => {
          const icon  = metric.direction === "growing" ? "↑" : metric.direction === "declining" ? "↓" : "→";
          const color = metric.direction === "growing" ? "#6DB874" : metric.direction === "declining" ? "#ef4444" : "var(--muted)";
          const pctLabel = metric.direction === "stable"
            ? "stable"
            : `${metric.pct > 0 ? "+" : ""}${metric.pct.toFixed(1)}%`;
          return (
            <div key={label}>
              <p style={{ margin: "0 0 2px", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 500 }}>{label}</p>
              <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color }}>
                {icon} {pctLabel}
              </p>
              {note && <p style={{ margin: "2px 0 0", fontSize: "0.62rem", color: "var(--muted)" }}>{note}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentBooksTrendSection({ snapshots }: { snapshots: AgentBooksSnapshot[] }) {
  if (snapshots.length < 2) return null;

  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.snapshotted_at).getTime() - new Date(b.snapshotted_at).getTime(),
  );

  const oldest = new Date(ordered[0].snapshotted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const newest = new Date(ordered[ordered.length - 1].snapshotted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const hasTreasury = ordered.some((s) => s.treasury_usd !== null);

  const usdFmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const latest = ordered[ordered.length - 1];

  const cols: Array<{ label: string; field: BooksTrendField; color: string; value: number | null }> = [
    { label: "Revenue",    field: "revenue_usd",    color: "#6DB874", value: latest.revenue_usd },
    { label: "Expenses",   field: "expenses_usd",   color: "#ef4444", value: latest.expenses_usd },
    { label: "Net Income", field: "net_income_usd", color: "#5B8FA8", value: latest.net_income_usd },
  ];

  if (hasTreasury) {
    cols.push({ label: "Treasury", field: "treasury_usd", color: "#8B5CF6", value: latest.treasury_usd });
  }

  return (
    <div style={{
      marginBottom: 24,
      padding: "18px 20px",
      background: "var(--surface-soft)",
      border: "1px solid var(--line)",
      borderRadius: 10,
    }}>
      <p style={{ margin: "0 0 14px", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
        Agent Books · Historical Trend · {oldest} → {newest}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        {cols.map(({ label, field, color, value }) => (
          <div key={label}>
            <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 500 }}>{label}</p>
            <p style={{ margin: "0 0 6px", fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color }}>
              {value !== null ? usdFmt(value) : "—"}
            </p>
            <AgentBooksSparkline snapshots={ordered} field={field} color={color} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main profile ──────────────────────────────────────────────────────────────

type ProfileTab = "overview" | "books" | "history" | "attribution" | "research";

const PROF_TABS: { key: ProfileTab; label: string }[] = [
  { key: "overview",     label: "Overview"     },
  { key: "books",        label: "Books"        },
  { key: "history",      label: "History"      },
  { key: "attribution",  label: "Attribution"  },
  { key: "research",     label: "Research"     },
];

function OverviewFinancials({ books }: { books: AgentBooks }) {
  const f = books.financials;
  const usd = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const netPos = f.net_income_usd >= 0;
  return (
    <section className="prof-section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p className="prof-section-title" style={{ margin: 0 }}>Financial Summary</p>
        <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{books.period}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
        {([
          { label: "Revenue",    value: usd(f.revenue_usd),    color: f.revenue_usd > 0 ? "var(--accent)" : "var(--muted)" },
          { label: "Expenses",   value: usd(f.expenses_usd),   color: f.expenses_usd > 0 ? "#f87171"      : "var(--muted)" },
          { label: "Net Income", value: (netPos ? "+" : "−") + usd(f.net_income_usd), color: netPos ? "var(--accent)" : "#f87171" },
        ] as const).map(({ label, value, color }) => (
          <div key={label} style={{ padding: "12px 14px", borderRadius: 8, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
            <p style={{ margin: "0 0 5px", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-mono)", color }}>{value}</p>
          </div>
        ))}
      </div>
      {f.tx_count > 0 && (
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>
          {f.tx_count} txs · {books.wallets.analyzed} wallets
          {f.margin_pct !== null && <> · <strong style={{ color: "var(--ink)" }}>{f.margin_pct.toFixed(1)}%</strong> margin</>}
        </p>
      )}
    </section>
  );
}

export function ProfileClient({ agent, slug, economics, inferenceActivity, classification, toolDecisions, books, booksHistory }: { agent: Agent; slug: string; economics?: AgentEconomicSummary; inferenceActivity?: InferenceSummary; classification?: SettlementClassification; toolDecisions?: ToolDecisionEvent[]; books?: AgentBooks | AgentBooksUnattributed; booksHistory?: AgentBooksSnapshot[] }) {
  const [showShare, setShowShare] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("overview");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.zettaai.co";
  const embedCode = `<iframe src="${baseUrl}/registry/${slug}/card" width="400" height="280" frameborder="0" style="border-radius:12px;border:none;" loading="lazy"></iframe>`;

  function copyEmbed() {
    setEmbedError(false);
    navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    }).catch(() => {
      setEmbedError(true);
    });
  }

  return (
    <div className="prof-page">
      {/* Header */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/registry" style={{ color: "var(--accent)" }}>Registry</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/research">Research</Link>
          <Link href="/developer">API</Link>
          <Link href="/luca">Luca</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
        </div>
      </header>

      <main className="prof-main">
        {/* Back */}
        <Link href="/registry" className="prof-back">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
          Agent Registry
        </Link>

        {/* Identity card */}
        <div className="prof-identity">
          <ProfileAvatar agent={agent} />
          <div className="prof-identity-info">
            <div className="prof-name-row">
              <h1 className="prof-name">{agent.name}</h1>
              <span className="prof-symbol">{agent.symbol}</span>
            </div>
            <div className="prof-badges">
              <span className={`reg-badge reg-eco reg-eco-${agent.ecosystem.toLowerCase()}`}>{agent.ecosystem}</span>
              <StatusBadge status={agent.verificationStatus} />
              <HealthBadge h={agent.treasuryHealth} />
            </div>
            <div className="prof-links">
              {agent.xHandle && (
                <a href={`https://x.com/${agent.xHandle.replace("@","")}`} target="_blank" rel="noreferrer" className="prof-link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  {agent.xHandle}
                </a>
              )}
              {agent.website && (
                <a href={agent.website} target="_blank" rel="noreferrer" className="prof-link">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                  Website
                </a>
              )}
              {agent.bankrProfile && (
                <a href={agent.bankrProfile} target="_blank" rel="noreferrer" className="prof-link prof-link-bankr">
                  Bankr
                </a>
              )}
            </div>
          </div>
          <div className="prof-share-wrap" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="prof-share-btn" onClick={() => setShowEmbed(true)} style={{ opacity: 0.8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>code</span>
              Embed
            </button>
            <button type="button" className="prof-share-btn" onClick={() => setShowShare(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>share</span>
              Share
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="prof-tabs">
          {PROF_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`prof-tab${tab === t.key ? " prof-tab-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="prof-body">
          {/* Claim banner — always shown */}
          <ClaimBanner slug={slug} agentName={agent.name} status={agent.verificationStatus} />

          {/* ── OVERVIEW ── insight first, data second */}
          {tab === "overview" && (
            <>
              {agent.adminNotes && (
                <div className="prof-verdict">
                  <div className="prof-verdict-label">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
                    From the Research
                  </div>
                  <p className="prof-verdict-text">{agent.adminNotes}</p>
                  {agent.lastChecked && <p className="prof-verdict-date">Last reviewed: {agent.lastChecked}</p>}
                </div>
              )}
              {books?.attributed && <OverviewFinancials books={books} />}
              {classification && <SettlementSection classification={classification} />}
              {books?.attributed && booksHistory && booksHistory.length >= 2 && (
                <MomentumSection history={booksHistory} />
              )}
              {inferenceActivity && <InferenceActivityBlock ia={inferenceActivity} />}
              {economics && <AgentEconomicsBlock economics={economics} />}
            </>
          )}

          {/* ── BOOKS — full P&L + treasury */}
          {tab === "books" && (
            <>
              {books && <AgentBooksBlock books={books} />}
              {books?.attributed && <TreasurySignals books={books} />}
            </>
          )}

          {/* ── HISTORY — snapshots + momentum */}
          {tab === "history" && (
            books?.attributed && booksHistory && booksHistory.length >= 2 ? (
              <>
                <AgentBooksTrendSection snapshots={booksHistory} />
                <MomentumSection history={booksHistory} />
              </>
            ) : (
              <section className="prof-section prof-empty-state">
                <p style={{ margin: "0 0 6px", fontWeight: 700 }}>No history yet.</p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                  Historical snapshots build over multiple reporting periods once wallets are attributed.
                </p>
              </section>
            )
          )}

          {/* ── ATTRIBUTION — wallets + tool decisions */}
          {tab === "attribution" && (
            <div className="prof-grid">
              <section className="prof-section">
                <p className="prof-section-title">Wallets</p>
                {(() => {
                  const CONTRACT_TYPES = new Set(["token_contract", "smart_contract", "proxy_contract", "vault"]);
                  const allWallets = Array.from(
                    new Map((agent.wallets ?? []).map((w) => [w.address.toLowerCase(), w])).values(),
                  );

                  const manifestWallets = allWallets.filter((w) => {
                    const src = (w.evidenceSource ?? "").toLowerCase();
                    const atype = (w.address_type ?? "").toLowerCase();
                    const isTokenAddr = agent.tokenAddress && w.address.toLowerCase() === agent.tokenAddress.toLowerCase();
                    return src === "manifest" && !isTokenAddr && !CONTRACT_TYPES.has(atype);
                  });
                  const contractWallets = allWallets.filter((w) => {
                    const atype = (w.address_type ?? "").toLowerCase();
                    const isTokenAddr = agent.tokenAddress && w.address.toLowerCase() === agent.tokenAddress.toLowerCase();
                    return CONTRACT_TYPES.has(atype) || isTokenAddr || (w.role ?? "").toLowerCase() === "token_contract";
                  });
                  const discoveredWallets = allWallets.filter((w) => {
                    const src = (w.evidenceSource ?? "").toLowerCase();
                    const atype = (w.address_type ?? "").toLowerCase();
                    const isTokenAddr = agent.tokenAddress && w.address.toLowerCase() === agent.tokenAddress.toLowerCase();
                    return src !== "manifest" && !CONTRACT_TYPES.has(atype) && !isTokenAddr && (w.role ?? "").toLowerCase() !== "token_contract";
                  });

                  const hasManifest = manifestWallets.length > 0;
                  const hasDiscovered = discoveredWallets.length > 0 || contractWallets.length > 0;

                  return (
                    <>
                      {/* No books warning */}
                      {!hasManifest && hasDiscovered && (
                        <div style={{ marginBottom: 10, padding: "8px 12px", background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 6 }}>
                          <p style={{ margin: 0, fontSize: "0.72rem", color: "#f59e0b", lineHeight: 1.5 }}>
                            Wallet manifest required. Contract addresses and discovered addresses are not used for books.{" "}
                            <a href="/developer#manifest" style={{ color: "#f59e0b", textDecoration: "underline" }}>Add .agent/wallets.json →</a>
                          </p>
                        </div>
                      )}

                      {/* Manifest wallets */}
                      {manifestWallets.length > 0 && (
                        <>
                          <p style={{ margin: "0 0 6px", fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#22c55e", fontWeight: 700 }}>
                            Manifest wallets — books eligible
                          </p>
                          {manifestWallets.map((w) => (
                            <div key={w.address} className="reg-card-wallet-row">
                              <span className={`reg-wallet-label-pill reg-wallet-${w.label.replace(/\s+/g, "-")}`}>{w.label}</span>
                              {w.chain && <span className="reg-wallet-chain">{w.chain}</span>}
                              <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                                {truncate(w.address)}
                              </a>
                              {w.notes && <span className="reg-wallet-note">{w.notes}</span>}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Contract addresses */}
                      {(contractWallets.length > 0 || agent.tokenAddress) && (
                        <>
                          <p style={{ margin: `${manifestWallets.length > 0 ? "12px" : "0"} 0 6px`, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700 }}>
                            Contract addresses — not used for books
                          </p>
                          {agent.tokenAddress && !contractWallets.some((w) => w.address.toLowerCase() === agent.tokenAddress!.toLowerCase()) && (
                            <div className="reg-card-wallet-row">
                              <span className="reg-wallet-label-pill reg-wallet-candidate">token contract</span>
                              <a href={`https://basescan.org/token/${agent.tokenAddress}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                                {truncate(agent.tokenAddress)}
                              </a>
                            </div>
                          )}
                          {contractWallets.map((w) => (
                            <div key={w.address} className="reg-card-wallet-row" style={{ opacity: 0.65 }}>
                              <span className="reg-wallet-label-pill reg-wallet-candidate">
                                {w.address_type ?? "contract"}
                              </span>
                              <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                                {truncate(w.address)}
                              </a>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Discovered wallets */}
                      {discoveredWallets.length > 0 && (
                        <>
                          <p style={{ margin: `${manifestWallets.length > 0 || contractWallets.length > 0 ? "12px" : "0"} 0 6px`, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700 }}>
                            Discovered addresses — not used for books
                          </p>
                          {discoveredWallets.map((w) => (
                            <div key={w.address} className="reg-card-wallet-row" style={{ opacity: 0.65 }}>
                              <span className={`reg-wallet-label-pill reg-wallet-${w.label.replace(/\s+/g, "-")}`}>{w.label}</span>
                              {w.chain && <span className="reg-wallet-chain">{w.chain}</span>}
                              <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                                {truncate(w.address)}
                              </a>
                            </div>
                          ))}
                        </>
                      )}

                      {/* No wallets at all */}
                      {!hasManifest && !hasDiscovered && !agent.tokenAddress && (
                        <p className="reg-card-no-wallet">Wallet discovery pending — Luca is researching public data.</p>
                      )}
                    </>
                  );
                })()}
              </section>
              {toolDecisions && toolDecisions.length > 0 && <ToolDecisionsBlock events={toolDecisions} />}
              <p className="prof-footer-note" style={{ gridColumn: "1 / -1" }}>
                Luca analyzed public data associated with {agent.name}. Wallets are candidate unless marked Verified.{" "}
                <Link href="/registry#verify">Verify your agent →</Link>
              </p>
            </div>
          )}

          {/* ── RESEARCH — published Luca reports for this agent */}
          {tab === "research" && (
            <section className="prof-section prof-empty-state">
              <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Research for {agent.name}</p>
              <p style={{ margin: "0 0 20px", fontSize: "0.82rem", color: "var(--muted)" }}>
                Luca publishes analysis when sufficient attributed data exists. Check the research hub for published reports.
              </p>
              <Link href="/research" className="lp-btn-primary" style={{ fontSize: "0.8rem" }}>Browse All Research →</Link>
            </section>
          )}
        </div>
      </main>

      {showShare && (
        <ShareCardModal
          agent={agent}
          slug={slug}
          classification={classification}
          onClose={() => setShowShare(false)}
        />
      )}

      {showEmbed && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowEmbed(false)}
        >
          <div
            style={{ background: "var(--surface)", borderRadius: 16, padding: "28px 28px 24px", maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--accent)" }}>code</span>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>Embed {agent.name}</p>
              <button type="button" onClick={() => setShowEmbed(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Add this snippet to any website to display {agent.name}&apos;s live Zetta agent card.
            </p>
            <div style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
              <code style={{ fontSize: "0.72rem", color: "var(--ink)", wordBreak: "break-all", lineHeight: 1.7, fontFamily: "monospace" }}>
                {embedCode}
              </code>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={copyEmbed}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: embedCopied ? "var(--accent)" : "var(--accent-soft)", color: embedCopied ? "#fff" : "var(--accent)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", transition: "background 0.2s" }}
              >
                {embedCopied ? "Copied!" : "Copy embed code"}
              </button>
              <a
                href={`/registry/${slug}/card`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontSize: "0.82rem", textDecoration: "none", display: "flex", alignItems: "center" }}
              >
                Preview card
              </a>
            </div>
            {embedError && (
              <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "#ef4444", lineHeight: 1.5 }}>
                Clipboard unavailable. Select the code above and copy manually.
              </p>
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
