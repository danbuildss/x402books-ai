"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toPng } from "html-to-image";
import { Logo } from "@/components/logo";
import { DOCS_URL } from "@/lib/docs-url";
import { ThemeToggle } from "@/components/effects";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { StatusBadge as UIStatusBadge, CostStatusBadge } from "@/components/ui/badge";
import type { Agent, Health, VerificationStatus } from "@/app/registry/types";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import type { InferenceSummary } from "@/lib/inference-events";
import type { SettlementClassification, SettlementPattern } from "@/lib/luca-classify";
import type { ToolDecisionEvent } from "@/lib/tool-decisions";
import type { AgentBooks, AgentBooksUnattributed } from "@/lib/agent-books";
import type { AgentBooksSnapshot } from "@/lib/agent-books-history";
import type { Anomaly } from "@/lib/anomaly-detector";
import type { VerificationScore } from "@/lib/verification-scorer";
import { TIER_LABELS, TIER_BADGE_CLASS } from "@/lib/verification-scorer";
import { computeMomentum } from "@/lib/agent-momentum";
import { SiteFooter } from "@/components/site-footer";
import { agentHealthScore, gradeColor } from "@/lib/agent-health-score";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { AgentConfidenceLabel } from "@/lib/revenue-confidence";
import { CONFIDENCE_META } from "@/lib/revenue-confidence";
import {
  buildBooksMetrics,
  buildDataQuality,
  buildOperatorVerdict,
  buildProfileMetrics,
  buildRevenueBuckets,
  mapExpenseCategories,
} from "@/lib/books-presenter";
import {
  BOOKS_STATUS_META,
  PROFILE_STATUS_META,
  WALLET_STATUS_META,
} from "@/app/registry/filters";
import {
  BooksSummaryStrip,
  DataQualityBlock,
  ExpenseBreakdown,
  LucaVerdictBlock,
  MetricsStrip,
  RevenueBreakdown,
  WalletAttributionSection,
} from "./books-sections";

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

// ── Attribution onboarding ────────────────────────────────────────────────────

function AttributionOnboarding({ agentName, agentSlug }: { agentName: string; agentSlug: string }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletInput, setWalletInput] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submitManifest() {
    const wallets = walletInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((addr) => ({ address: addr, role: "treasury" }));

    if (!wallets.length) { setError("Enter at least one wallet address."); return; }
    const invalid = wallets.find((w) => !/^0x[0-9a-fA-F]{40}$/.test(w.address));
    if (invalid) { setError(`Invalid address: ${invalid.address}`); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/registry/manifest-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agentName,
          wallets,
          x_handle: xHandle || undefined,
          notes: `Submitted via agent profile page for ${agentSlug}`,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? "Submission failed."); setSubmitting(false); return; }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    {
      n: "1",
      title: "Declare your wallets",
      body: "Submit a wallet manifest — the addresses your agent uses for treasury, fees, and operations.",
      done: false,
      active: true,
    },
    {
      n: "2",
      title: "Pending review",
      body: "Zetta verifies wallet attribution and classifies on-chain activity. Usually within 24 hours.",
      done: false,
      active: false,
    },
    {
      n: "3",
      title: "Books go live",
      body: "Revenue, expenses, net income, and treasury health appear on this profile — publicly readable.",
      done: false,
      active: false,
    },
  ];

  return (
    <section className="prof-section" style={{ borderLeft: "3px solid var(--line)", paddingLeft: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
        <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)" }}>
          Not attributed
        </span>
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65, margin: "0 0 16px" }}>
        No financial books yet. Declare your agent&apos;s wallets to generate live revenue and treasury data.
      </p>

      {/* 3-step path */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {steps.map((s) => (
          <div key={s.n} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            padding: "10px 12px", borderRadius: 8,
            background: s.active ? "var(--surface-soft)" : "transparent",
            border: `1px solid ${s.active ? "var(--accent)40" : "var(--line)"}`,
            opacity: s.active ? 1 : 0.5,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: s.active ? "var(--accent)" : "var(--line)",
              fontSize: "0.68rem", fontWeight: 700, color: s.active ? "#fff" : "var(--muted)",
            }}>{s.n}</span>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 600, color: s.active ? "var(--ink)" : "var(--muted)" }}>{s.title}</p>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Submit form or success */}
      {submitted ? (
        <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--accent)0d", border: "1px solid var(--accent)40", fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>
          Manifest submitted. You&apos;ll see books appear on this profile once attribution is confirmed.
        </div>
      ) : open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 }}>
              Wallet addresses (one per line or comma-separated)
            </label>
            <textarea
              className="op-input"
              rows={3}
              placeholder={"0x...\n0x..."}
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem", resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 }}>
              X handle (optional, for follow-up)
            </label>
            <input
              className="op-input"
              type="text"
              placeholder="@yourhandle"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              style={{ width: "100%", fontSize: "0.8rem" }}
            />
          </div>
          {error && <p style={{ margin: 0, fontSize: "0.75rem", color: "#F46060" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="op-btn op-btn-primary"
              onClick={submitManifest}
              disabled={submitting}
              style={{ fontSize: "0.79rem" }}
            >
              {submitting ? "Submitting…" : "Submit manifest"}
            </button>
            <button
              className="op-btn"
              onClick={() => { setOpen(false); setError(null); }}
              style={{ fontSize: "0.79rem" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="op-btn op-btn-primary"
          onClick={() => setOpen(true)}
          style={{ fontSize: "0.79rem" }}
        >
          Declare wallets
        </button>
      )}
    </section>
  );
}

// ── Agent Books block ─────────────────────────────────────────────────────────

function AgentBooksBlock({ books, children }: { books: AgentBooks | AgentBooksUnattributed; children?: ReactNode }) {
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
            href="/api#manifest"
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
        <section className="prof-section" style={{ borderLeft: "3px solid var(--muted)", paddingLeft: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "var(--muted)18", border: "1px solid var(--muted)40", color: "var(--muted)", letterSpacing: "0.02em" }}>
              Under Review
            </span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 0 }}>
            {(books as AgentBooksUnattributed).message ?? "Financial figures are being verified with the agent team. Updated numbers will be published once attribution and classification are confirmed."}
          </p>
        </section>
      );
    }
    return <AttributionOnboarding agentName={books.agent.name} agentSlug={books.agent.slug} />;
  }

  const f = books.financials;

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

      {/* P4 metrics strip (BooksSummaryStrip) injected by the parent */}
      {children}

      {/* Secondary stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.77rem", color: "var(--muted)", marginBottom: 12 }}>
        {f.margin_pct !== null && (
          <span>
            Margin{" "}
            <strong style={{ color: f.margin_pct >= 0 ? "var(--ink)" : "#F46060" }}>
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
        <SectionLabel style={{ marginBottom: 6 }}>Data Confidence</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              { label: "Revenue",  value: books.confidence.revenue  },
              { label: "Expenses", value: books.confidence.expenses },
              { label: "Treasury", value: books.confidence.treasury },
              { label: "Overall",  value: books.confidence.overall  },
            ] as const
          ).map(({ label, value }) => (
            <UIStatusBadge key={label} variant={value === "high" ? "green" : value === "medium" ? "amber" : "red"}>
              {label}: {value.charAt(0).toUpperCase() + value.slice(1)}
            </UIStatusBadge>
          ))}
        </div>
        {books.confidence.flags.length > 0 && (
          <p style={{ margin: "5px 0 0", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
            {books.confidence.flags.map((f) => f.replace(/_/g, " ")).join(" · ")}
          </p>
        )}
      </div>

      {/* Quarantine, category breakdowns, and the Luca summary now render in
          their own sections (Revenue/Expense Breakdown at item 9, Luca Verdict
          at item 5) — kept out of here to avoid double-counting on the page. */}

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
  const verdictColor = isInactive ? "var(--muted)" : isProfitable ? "#4AE8A0" : isBreakEven ? "#F4B942" : "#F46060";

  const coverageRatio = f.expenses_usd > 0 ? Math.min(2, f.revenue_usd / f.expenses_usd) : null;
  const coveragePct = coverageRatio !== null ? Math.round(coverageRatio * 50) : null;
  const coverageLabel = coverageRatio === null ? null : coverageRatio >= 1 ? `${(coverageRatio * 100).toFixed(0)}% coverage` : `${(coverageRatio * 100).toFixed(0)}% covered`;

  const topSource = books.breakdown.revenue_by_source[0];
  const topSourcePct = topSource && f.revenue_usd > 0 ? Math.round((topSource.total_usd / f.revenue_usd) * 100) : null;

  if (isInactive) return null;

  const rowCount = [
    true, // profitability
    coveragePct !== null,
    f.expenses_usd > 0,
    f.margin_pct !== null,
    true, // treasury
    f.runway_months !== null,
    topSource !== null && topSourcePct !== null,
  ].filter(Boolean).length;
  let rowIndex = 0;

  return (
    <section className="prof-section">
      <p className="prof-section-title">Treasury Signals</p>
      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* Profitability verdict */}
        <LedgerRow
          first={rowIndex++ === 0}
          last={rowIndex === rowCount}
          label="Profitability"
          value={<span style={{ color: verdictColor }}>● {verdictLabel}</span>}
        />

        {/* Revenue coverage bar */}
        {coveragePct !== null && (
          <LedgerRow
            first={false}
            last={rowIndex++ === rowCount - 1}
            label="Revenue vs Expenses"
            value={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 120 }}>
                <span style={{ fontSize: "0.82rem", color: verdictColor, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{coverageLabel}</span>
                <div style={{ height: 4, width: 100, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, coveragePct)}%`, background: isProfitable ? "#4AE8A0" : "#F46060", borderRadius: 99 }} />
                </div>
              </div>
            }
          />
        )}

        {/* 30d burn rate */}
        {f.expenses_usd > 0 && (
          <LedgerRow
            first={false}
            last={rowIndex++ === rowCount - 1}
            label="30d Burn Rate"
            value={`−${usd(f.expenses_usd)}`}
            valueStyle={{ color: "#F46060" }}
          />
        )}

        {/* Margin */}
        {f.margin_pct !== null && (
          <LedgerRow
            first={false}
            last={rowIndex++ === rowCount - 1}
            label="Net Margin"
            value={`${f.margin_pct.toFixed(1)}%`}
            valueStyle={{ color: f.margin_pct >= 0 ? "#4AE8A0" : "#F46060" }}
          />
        )}

        {/* Treasury balance */}
        <LedgerRow
          first={false}
          last={f.runway_months === null && (!topSource || topSourcePct === null)}
          label="Treasury (stables)"
          value={f.treasury_balance_usd !== null ? usd(f.treasury_balance_usd) : "—"}
          detail={f.treasury_balance_usd === null ? "No stablecoin balance detected" : undefined}
          valueStyle={{ color: f.treasury_balance_usd !== null ? "var(--ink)" : "var(--muted)" }}
        />
        {f.runway_months !== null && (
          <LedgerRow
            first={false}
            last={!topSource || topSourcePct === null}
            label="Runway"
            value={f.runway_months < 1 ? "< 1 mo" : `${f.runway_months.toFixed(1)} mo`}
            valueStyle={{ color: f.runway_months >= 3 ? "#4AE8A0" : f.runway_months >= 1 ? "#F4B942" : "#F46060" }}
          />
        )}

        {/* Revenue concentration */}
        {topSource && topSourcePct !== null && (
          <LedgerRow
            first={false}
            last
            label="Top Revenue Source"
            value={`${topSourcePct}%`}
            detail={`${topSource.address.slice(0, 6)}…${topSource.address.slice(-4)}`}
          />
        )}

        {/* Attribution source footer */}
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <UIStatusBadge variant="neutral">
            {books.attribution.source === "manifest" ? "Declared manifest" : "Registry attribution"}
          </UIStatusBadge>
          {(() => {
            const c = books.attribution.confidence;
            const icon = c === "high" ? "✓" : c === "medium" ? "~" : "⚠";
            const tip = c === "high"
              ? "Wallets declared via signed manifest"
              : c === "medium"
              ? "Wallets inferred from public data"
              : "Unverified — declaration unconfirmed";
            return (
              <UIStatusBadge
                variant={c === "high" ? "green" : c === "medium" ? "amber" : "red"}
                style={{ cursor: "default" }}
              >
                {icon} {c} confidence
              </UIStatusBadge>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

// (SettlementSection removed — classification signals now render inside
// LucaVerdictBlock in books-sections.tsx.)

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

// ── Card helpers (shared with share modal) ───────────────────────────────────

const CARD_PATTERN_LABEL: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "Stable Treasury",
  revenue_generating:        "Revenue Activity",
  high_spend_low_revenue:    "High Spend",
  heavy_outbound_settlement: "Heavy Outbound",
  recurring_flow_detected:   "Recurring Flows",
  incomplete_wallet_role:    "Roles Unverified",
};

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
  if (s === "Verified" || s === "Luca Managed" || s === "Claimed") return "#4AE8A0";
  if (s === "Wallets Declared") return "#5B9EF4";
  return "var(--muted)";
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

  const transpScore     = cardAttributionScore(agent);
  const verdict         = cardVerdictSnippet(agent);
  const vstatus         = cardStatusLabel(agent);

  const verifyColor =
    agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed" || agent.verificationStatus === "Claimed"
      ? "#4AE8A0"
      : agent.verificationStatus === "Wallets Declared" ? "#5B9EF4" : "var(--muted)";

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
            background: "var(--surface-soft)",
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
              <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--surface-soft)" }} />
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
              border: "1px solid rgba(74,232,160,0.3)",
              background: "rgba(74,232,160,0.1)", color: "#4AE8A0",
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

// ── Full Inference Tab ────────────────────────────────────────────────────────

interface RawInferenceEvent {
  id: string;
  provider: string;
  model: string | null;
  request_type: string | null;
  cost_usd: number | null;
  cost_source: string;
  total_tokens: number | null;
  latency_ms: number | null;
  status: string;
  created_at: string;
}

function CostStatusBanner({ status }: { status: import("@/lib/inference-events").CostSource }) {
  const cfg = {
    actual:    { color: "#4AE8A0", bg: "#4AE8A010", border: "#4AE8A030", label: "Actual cost data", detail: "Provider billing metadata confirmed. Spend figures are accurate." },
    estimated: { color: "#F4B942", bg: "#F4B94210", border: "#F4B94230", label: "Estimated cost",   detail: "Spend calculated from model price × token counts. Actual billing may differ slightly." },
    missing:   { color: "#F46060", bg: "#F4606010", border: "#F4606030", label: "Cost data missing", detail: "Provider does not return billing metadata. Token counts and spend cannot be calculated until cost metadata is active." },
  }[status];

  return (
    <div style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${cfg.border}`, background: cfg.bg, marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0, marginTop: 3 }} />
      <div>
        <p style={{ margin: "0 0 2px", fontSize: "0.75rem", fontWeight: 700, color: cfg.color }}>{cfg.label}</p>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>{cfg.detail}</p>
      </div>
    </div>
  );
}

function InferenceEventFeed({ slug }: { slug: string }) {
  const [events, setEvents] = useState<RawInferenceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inference/events?agent_id=${encodeURIComponent(slug)}&limit=20`)
      .then((r) => r.json())
      .then((d: { events?: RawInferenceEvent[] }) => {
        setEvents(d.events ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Loading events…</p>;
  if (events.length === 0) return <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No inference events in this period.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {events.slice(0, 15).map((e, i, arr) => {
        const hasActual    = e.cost_source === "actual";
        const hasEstimated = e.cost_source === "estimated";
        const costColor    = hasActual ? "var(--ink)" : hasEstimated ? "#F4B942" : "var(--muted)";
        const costStr      = e.cost_usd != null ? `$${e.cost_usd.toFixed(5)}` : "—";
        const radius       = i === 0 ? "8px 8px 0 0" : i === arr.length - 1 ? "0 0 8px 8px" : "0";
        const ago          = (() => {
          const ms = Date.now() - new Date(e.created_at).getTime();
          const h  = Math.floor(ms / 3_600_000);
          const m  = Math.floor((ms % 3_600_000) / 60_000);
          return h > 0 ? `${h}h ago` : `${m}m ago`;
        })();

        return (
          <div key={e.id} style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: 10, alignItems: "center",
            padding: "7px 10px",
            background: "var(--surface-soft)",
            border: "1px solid var(--line)",
            borderBottomWidth: i < arr.length - 1 ? 0 : 1,
            borderRadius: radius,
            fontSize: "0.76rem",
          }}>
            <span style={{ color: "var(--ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.provider}{e.model ? ` · ${e.model}` : ""}
            </span>
            <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
              {e.total_tokens != null ? `${e.total_tokens.toLocaleString()} tok` : "—"}
            </span>
            <span style={{ fontFamily: "monospace", color: costColor, whiteSpace: "nowrap" }}>{costStr}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>{ago}</span>
          </div>
        );
      })}
    </div>
  );
}

function InferenceTab({
  ia,
  slug,
  books,
}: {
  ia?: InferenceSummary;
  slug: string;
  books?: AgentBooks | AgentBooksUnattributed;
}) {
  const usd = (n: number) => n < 0.01 && n > 0 ? `$${n.toFixed(5)}` : `$${n.toFixed(2)}`;

  if (!ia) {
    return (
      <section className="prof-section">
        <p className="prof-section-title">Inference</p>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 16 }}>
          No inference activity recorded for this agent yet. To start tracking:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { n: "1", title: "Route inference through the Zetta proxy", body: "One URL change — drop-in replacement for your Surplus calls." },
            { n: "2", title: "Declare your wallet manifest", body: "Add .agent/wallets.json to your repo to unlock revenue vs cost tracking." },
            { n: "3", title: "Pass cost metadata", body: "Include cost_usd and token counts in the log event for accurate spend reporting." },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--accent)", fontSize: "0.68rem", fontWeight: 700, color: "#fff" }}>{s.n}</span>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 600 }}>{s.title}</p>
                <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/surplus" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Surplus × Zetta pilot →</Link>
          <Link href="/docs/surplus-integration" style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}>Integration guide →</Link>
        </div>
      </section>
    );
  }

  // ── Data quality checklist ──
  const hasWallets  = books?.attributed === true || (books && !books.attributed && (books as AgentBooksUnattributed).reason !== "no_manifest");
  const hasCostData = ia.hasCostData;
  const hasRevenue  = books?.attributed && (books as AgentBooks).financials.revenue_usd > 0;
  const hasTreasury = books?.attributed && (books as AgentBooks).financials.treasury_balance_usd != null;

  const checklist = [
    { label: "Inference events logged",     ok: true },
    { label: "Wallet manifest declared",    ok: !!hasWallets },
    { label: "Cost data available",         ok: hasCostData },
    { label: "Revenue tracked",             ok: !!hasRevenue },
    { label: "Treasury balance detected",   ok: !!hasTreasury },
  ];

  // ── Revenue vs cost (if books exist) ──
  const revenue = books?.attributed ? (books as AgentBooks).financials.revenue_usd : null;
  const spend   = ia.totalCostUsd;
  const net     = revenue != null ? revenue - spend : null;

  // ── Month string ──
  const now   = new Date();
  const month = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ── Luca verdict ──
  const verdict = (() => {
    if (!ia.hasCostData) {
      return `${ia.requestCount} inference request${ia.requestCount === 1 ? "" : "s"} tracked. Cost data is missing — provider does not return billing metadata. Financial reporting is incomplete until cost metadata is active.`;
    }
    if (ia.costStatus === "estimated") {
      return `Spend is estimated from model pricing × token counts. Actual provider billing may differ. ${ia.requestCount} request${ia.requestCount === 1 ? "" : "s"} processed.`;
    }
    if (spend < 1) return `Operating normally. ${ia.requestCount} request${ia.requestCount === 1 ? "" : "s"} processed. Inference spend is minimal.`;
    if (spend < 10) return `Operating normally. Inference spend within expected range for an active agent.`;
    if (spend < 50) return `Active agent. Inference spend is significant — monitor provider concentration.`;
    return `High inference activity. Operational costs are elevated. Review provider mix and request volume.`;
  })();

  // ── Recommended actions ──
  const actions: string[] = [];
  if (!hasCostData)  actions.push("Enable cost metadata on your Surplus integration to unlock spend tracking.");
  if (!hasWallets)   actions.push("Declare a wallet manifest to enable revenue vs inference cost comparison.");
  if (!hasRevenue && hasWallets) actions.push("No operating revenue detected in the last 30 days. Verify wallet attribution.");
  if (ia.providerBreakdown.length === 1 && ia.requestCount > 10) actions.push("Single provider dependency detected. Consider adding a fallback provider.");
  if (actions.length === 0) actions.push("No immediate actions required. Continue monitoring spend vs revenue.");

  return (
    <>
      {/* Cost status banner */}
      <section className="prof-section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="prof-section-title" style={{ margin: 0 }}>Inference · Last {ia.periodDays}d</p>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "var(--accent)10", border: "1px solid var(--accent)30", color: "var(--accent)" }}>
            Surplus Pilot
          </span>
        </div>
        <CostStatusBanner status={ia.costStatus} />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
          {([
            { label: "Total Spend",       value: ia.hasCostData ? usd(ia.totalCostUsd) : "—", mono: true, color: ia.hasCostData && ia.totalCostUsd > 0 ? "#F46060" : "var(--muted)" },
            { label: "Requests",          value: ia.requestCount.toLocaleString(), mono: true, color: "var(--ink)" },
            { label: "Primary Provider",  value: ia.primaryProvider ? ia.primaryProvider.charAt(0).toUpperCase() + ia.primaryProvider.slice(1) : "—", mono: false, color: "var(--ink)" },
            { label: "Avg Cost / Request",value: ia.hasCostData ? usd(ia.avgCostPerRequest) : "—", mono: true, color: "var(--muted)" },
          ] as const).map(({ label, value, mono, color }) => (
            <div key={label} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
              <p style={{ margin: "0 0 4px", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", fontWeight: 600 }}>{label}</p>
              <p style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color, fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provider concentration */}
      {ia.providerBreakdown.length > 0 && (
        <section className="prof-section">
          <p className="prof-section-title">Provider Concentration</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ia.providerBreakdown.map((p) => {
              const pct = ia.requestCount > 0 ? Math.round((p.requestCount / ia.requestCount) * 100) : 0;
              return (
                <div key={p.provider}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                    <span style={{ textTransform: "capitalize" }}>{p.provider}</span>
                    <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{p.requestCount} req · {pct}%</span>
                  </div>
                  <div style={{ height: 5, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Revenue vs inference cost */}
      {net !== null && (
        <section className="prof-section">
          <p className="prof-section-title">Revenue vs Inference Cost</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <LedgerRow first label="Operating Revenue" value={revenue != null ? `+${usd(revenue)}` : "—"} valueStyle={{ color: revenue && revenue > 0 ? "var(--accent)" : "var(--muted)" }} />
            <LedgerRow       label="Inference Spend"   value={ia.hasCostData ? `−${usd(spend)}` : "—"}   valueStyle={{ color: ia.hasCostData && spend > 0 ? "#F46060" : "var(--muted)" }} />
            <LedgerRow last  label="Net Position"      value={net >= 0 ? `+${usd(net)}` : `−${usd(Math.abs(net))}`} valueStyle={{ color: net >= 0 ? "var(--accent)" : "#F46060", fontWeight: 700 }} />
          </div>
        </section>
      )}

      {/* Monthly statement */}
      <section className="prof-section">
        <p className="prof-section-title">Monthly Statement · {month}</p>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65, margin: "0 0 12px" }}>{verdict}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 99, background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)" }}>
            {ia.costStatus === "actual" ? "Actual billing" : ia.costStatus === "estimated" ? "Estimated spend" : "Cost data missing"}
          </span>
          {ia.primaryProvider && (
            <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 99, background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)", textTransform: "capitalize" }}>
              via {ia.primaryProvider}
            </span>
          )}
        </div>
      </section>

      {/* Event feed */}
      <section className="prof-section">
        <p className="prof-section-title">Recent Events</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, padding: "4px 10px", marginBottom: 4 }}>
          {["Provider · Model", "Tokens", "Cost", "When"].map((h) => (
            <span key={h} style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 600 }}>{h}</span>
          ))}
        </div>
        <InferenceEventFeed slug={slug} />
      </section>

      {/* Data quality */}
      <section className="prof-section">
        <p className="prof-section-title">Data Quality</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {checklist.map(({ label, ok }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}>
              <span style={{ color: ok ? "#4AE8A0" : "#F46060", fontSize: "0.8rem" }}>{ok ? "✓" : "✗"}</span>
              <span style={{ color: ok ? "var(--ink)" : "var(--muted)" }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended actions */}
      <section className="prof-section">
        <p className="prof-section-title">Recommended Actions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.8rem" }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>→</span>
              <span style={{ color: "var(--muted)", lineHeight: 1.55 }}>{a}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/surplus" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>Surplus × Zetta pilot →</Link>
          <Link href="/docs/surplus-integration" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>Integration guide →</Link>
          {slug === "luca" && (
            <Link href="/luca/ledger" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>Full ledger →</Link>
          )}
        </div>
      </section>
    </>
  );
}

// ── Inference activity summary (Overview tab) ─────────────────────────────────

function InferenceActivityBlock({ ia }: { ia: InferenceSummary }) {
  const usd = (n: number) => n === 0 ? "$0.00" : n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(2)}`;

  const spendDisplay = ia.hasCostData && ia.totalCostUsd > 0 ? `-${usd(ia.totalCostUsd)}` : "—";
  const avgDisplay   = ia.hasCostData ? usd(ia.avgCostPerRequest) : "—";

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
      <div style={{ display: "flex", flexDirection: "column" }}>
        <LedgerRow first label="30d Spend"        value={spendDisplay} valueStyle={{ color: ia.hasCostData && ia.totalCostUsd > 0 ? "#F46060" : "var(--muted)" }} badge={<CostStatusBadge status={ia.costStatus} />} />
        <LedgerRow       label="Requests"         value={ia.requestCount.toLocaleString()} />
        <LedgerRow       label="Primary Provider" value={ia.primaryProvider ?? "—"} valueStyle={{ textTransform: "capitalize", fontFamily: "inherit" }} />
        {ia.providerBreakdown.length > 1 && (
          <LedgerRow label="Providers Used" value={ia.providersUsed.join(", ")} valueStyle={{ fontFamily: "inherit" }} />
        )}
        <LedgerRow last  label="Avg Cost / Request" value={avgDisplay} />
      </div>
    </section>
  );
}

// ── Agent Economics block (Luca only) ────────────────────────────────────────

function AgentEconomicsBlock({ economics }: { economics: AgentEconomicSummary }) {
  const s = economics;
  const netColor = s.netAgentPosition > 0.01 ? "#4ade80" : s.netAgentPosition < -0.01 ? "#F46060" : "var(--ink)";
  const usd = (n: number) => `$${Math.abs(n).toFixed(2)}`;

  return (
    <section className="prof-section">
      <p className="prof-section-title">Agent Economics · Last {s.periodDays}d</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["Inference Spend",   `-${usd(s.totalInferenceSpend)}`,   s.totalInferenceSpend  > 0 ? "#F46060" : undefined],
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
  low:     { color: "var(--accent)", bg: "rgba(74,232,160,0.08)", border: "rgba(74,232,160,0.18)" },
  medium:  { color: "#F4B942",       bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.18)"  },
  high:    { color: "#F46060",       bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.18)" },
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
          { label: "Rejected",  value: rejects,  color: "#F46060" },
          { label: "High Risk", value: highRisk,  color: "#F4B942" },
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
                color: e.decision === "install" ? "var(--accent)" : e.decision === "reject" ? "#F46060" : "var(--muted)",
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

  // wallet tab state — Privy-powered
  const [walletState, setWalletState] = useState<ClaimState>("idle");
  const [walletMatched, setWalletMatched] = useState(false);
  const [walletMsg, setWalletMsg]     = useState("");
  const [sigVerified, setSigVerified] = useState(false);

  // manifest tab state
  const [repoUrl, setRepoUrl]         = useState("");
  const [mfState, setMfState]         = useState<ClaimState>("idle");
  const [mfMsg, setMfMsg]             = useState("");

  // Luca report — fetched after successful claim
  const [lucaSummary, setLucaSummary] = useState<string | null>(null);

  // Privy hooks for wallet signing
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = useMemo(() => wallets.find((w) => w.walletClientType !== "privy"), [wallets]);

  if (status === "Verified" || status === "Luca Managed" || status === "Claimed") return null;

  const bannerHeading = needsAttention
    ? `Action needed: ${agentName}`
    : `This profile is unclaimed`;

  const done = (tab === "wallet" && walletState === "done") || (tab === "manifest" && mfState === "done");

  async function connectAndSign() {
    setWalletState("loading");
    try {
      // Step 1: ensure a wallet is connected
      if (!authenticated || !connectedWallet) {
        setWalletState("idle");
        login();
        return;
      }

      // Step 2: sign a timestamped claim message
      const timestamp = new Date().toISOString();
      const message = `Claiming "${agentName}" on Zetta Registry.\nWallet: ${connectedWallet.address}\nTimestamp: ${timestamp}`;

      const provider = await connectedWallet.getEthereumProvider();
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, connectedWallet.address],
      }) as string;

      // Step 3: submit to claim API with signature
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_slug:     slug,
          wallet_address: connectedWallet.address,
          signature,
          message,
        }),
      });
      const d = await res.json() as {
        ok: boolean; matched?: boolean; signature_verified?: boolean; message?: string; error?: string;
      };
      if (d.ok) {
        setWalletState("done");
        setWalletMatched(d.matched ?? false);
        setSigVerified(d.signature_verified ?? false);
        setWalletMsg(d.message ?? "Claim submitted.");
        fetchLucaSummary();
      } else {
        setWalletState("error");
        setWalletMsg(d.error ?? "Something went wrong.");
      }
    } catch (err) {
      // User rejected the signature request
      if (err instanceof Error && err.message?.includes("rejected")) {
        setWalletState("idle");
      } else {
        setWalletState("error");
        setWalletMsg("Signing failed. Please try again.");
      }
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
        fetchLucaSummary();
      } else {
        setMfState("error");
        setMfMsg(d.error ?? "Something went wrong.");
      }
    } catch {
      setMfState("error");
      setMfMsg("Network error. Please try again.");
    }
  }

  async function fetchLucaSummary() {
    try {
      const res = await fetch(`/api/luca/skills/luca-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, period: "30d" }),
      });
      if (!res.ok) return;
      const d = await res.json() as { summary?: string | null };
      if (d.summary) setLucaSummary(d.summary);
    } catch {
      // best-effort — silent failure
    }
  }

  const bannerStyle: React.CSSProperties = {
    borderRadius: 12,
    border: needsAttention ? "1px solid rgba(245,158,11,0.35)" : isUnclaimed ? "1px solid rgba(74,232,160,0.35)" : "1px solid rgba(74,232,160,0.22)",
    borderLeft: needsAttention ? "3px solid #F4B942" : "3px solid var(--accent)",
    background: needsAttention ? "rgba(245,158,11,0.06)" : "var(--accent-soft)",
    padding: expanded ? ((isUnclaimed || needsAttention) ? "20px 22px" : "16px 18px") : "13px 18px",
    marginBottom: 20,
    transition: "padding 0.15s",
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (done) {
    const isMatch = tab === "wallet" && walletMatched;
    const isProven = tab === "wallet" && sigVerified && walletMatched;
    const doneMsg = tab === "wallet" ? walletMsg : mfMsg;
    const title   = tab === "manifest"
      ? "Manifest queued for verification"
      : isProven ? "Ownership proven — claim under review" : isMatch ? "Wallet matched — claim under review" : "Claim submitted for review";
    const color   = (tab === "manifest" || isMatch) ? "var(--accent)" : "#F4B942";
    const icon    = (tab === "manifest" || isMatch) ? "check_circle" : "info";
    const nextStep = (!isMatch && tab === "wallet")
      ? "Our team reviews claims within 24–48 hours. Questions? Message @zettatracker on X."
      : null;
    return (
      <div style={bannerStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color, marginTop: 1, flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.84rem", fontWeight: 700, color, marginBottom: 3 }}>{title}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{doneMsg}</p>
            {nextStep && (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>{nextStep}</p>
            )}
            {lucaSummary && (
              <div style={{
                marginTop: 12, paddingTop: 12,
                borderTop: "1px solid var(--line)",
              }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                  Luca financial report
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{lucaSummary}</p>
              </div>
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
                background: "rgba(59,130,246,0.08)", color: "#5B9EF4",
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
                border: "1px solid rgba(74,232,160,0.35)",
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
          <p style={{ fontSize: (isUnclaimed || needsAttention) ? "0.97rem" : "0.85rem", fontWeight: 700, color: needsAttention ? "#F4B942" : "var(--ink)", margin: 0 }}>
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
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 14, lineHeight: 1.55 }}>
            Connect a wallet and sign a message to prove ownership. Cryptographic proof fast-tracks your claim.
          </p>
          {connectedWallet && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 10 }}>
              Connected: <code style={{ fontFamily: "monospace", color: "var(--ink)" }}>
                {connectedWallet.address.slice(0, 8)}…{connectedWallet.address.slice(-6)}
              </code>
            </p>
          )}
          <button
            type="button"
            onClick={connectAndSign}
            disabled={walletState === "loading" || !ready}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff",
              fontSize: "0.82rem", fontWeight: 700,
              cursor: (walletState === "loading" || !ready) ? "not-allowed" : "pointer",
              opacity: (walletState === "loading" || !ready) ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              {authenticated && connectedWallet ? "draw" : "account_balance_wallet"}
            </span>
            {walletState === "loading"
              ? "Signing…"
              : authenticated && connectedWallet
                ? "Sign to claim →"
                : "Connect wallet →"}
          </button>
          {walletState === "error" && (
            <p style={{ fontSize: "0.78rem", color: "#F46060", margin: "8px 0 0" }}>{walletMsg}</p>
          )}
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
                background: "#5B9EF4", color: "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: mfState === "loading" ? "not-allowed" : "pointer",
                opacity: mfState === "loading" ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {mfState === "loading" ? "Fetching…" : "Submit Manifest →"}
            </button>
            {mfState === "error" && (
              <p style={{ width: "100%", fontSize: "0.78rem", color: "#F46060", margin: "4px 0 0" }}>{mfMsg}</p>
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
        <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: isUp ? "#4AE8A0" : "#F46060", fontFamily: "monospace", fontWeight: 600 }}>
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
          const color = metric.direction === "growing" ? "#4AE8A0" : metric.direction === "declining" ? "#F46060" : "var(--muted)";
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
    { label: "Revenue",    field: "revenue_usd",    color: "#4AE8A0", value: latest.revenue_usd },
    { label: "Expenses",   field: "expenses_usd",   color: "#F46060", value: latest.expenses_usd },
    { label: "Net Income", field: "net_income_usd", color: "#5B9EF4", value: latest.net_income_usd },
  ];

  if (hasTreasury) {
    cols.push({ label: "Treasury", field: "treasury_usd", color: "#8B7CF6", value: latest.treasury_usd });
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

// Detailed score sections — moved BELOW the financial content per P3
// acceptance ("financial metrics before detailed score sections"); rendered
// inside a collapsed <details> in the Data Quality area.
function ScoreBreakdownDetails({ agent, verificationScore }: { agent: Agent; verificationScore?: VerificationScore }) {
  const hs = agentHealthScore(agent);
  const gc = gradeColor(hs.grade);
  return (
    <>
      {verificationScore && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 14px",
          background: "var(--surface-soft)",
          border: "1px solid var(--line)",
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 36 }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1, fontFamily: "monospace" }}>
              {verificationScore.total}
            </span>
            <span style={{ fontSize: "0.55rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>/ 100</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ink)" }}>Verification Score</span>
              <span className={`reg-badge ${TIER_BADGE_CLASS[verificationScore.tier]}`} style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                {TIER_LABELS[verificationScore.tier]}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { label: "Manifest",   val: verificationScore.breakdown.manifest,   max: 30 },
                { label: "Wallets",    val: verificationScore.breakdown.wallets,     max: 25 },
                { label: "Activity",   val: verificationScore.breakdown.activity,    max: 20 },
                { label: "Metadata",   val: verificationScore.breakdown.metadata,    max: 15 },
                { label: "Ecosystem",  val: verificationScore.breakdown.ecosystem,   max: 10 },
              ].map((d) => (
                <div key={d.label} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 52 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.58rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{d.label}</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--muted)", fontFamily: "monospace" }}>{d.val}/{d.max}</span>
                  </div>
                  <div style={{ height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(d.val / d.max) * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 16px",
        background: `color-mix(in srgb, ${gc} 6%, var(--surface-soft))`,
        border: "1px solid var(--line)",
        borderLeft: `3px solid ${gc}`,
        borderRadius: 8,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: gc, lineHeight: 1, fontFamily: "monospace" }}>{hs.grade}</span>
          <span style={{ fontSize: "0.58rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{hs.total}/100</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
            {[
              { label: "Wallets",      val: hs.wallet_coverage,  max: 30 },
              { label: "Verification", val: hs.verification,     max: 35 },
              { label: "Evidence",     val: hs.evidence,         max: 20 },
              { label: "Activity",     val: hs.activity,         max: 15 },
            ].map(({ label, val, max }) => (
              <div key={label} style={{ minWidth: 70 }}>
                <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                <div style={{ height: 3, width: 70, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: gc, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: "0.67rem", color: "var(--muted)" }}>
            Financial health score — transparency and identity signal, not revenue.
          </p>
        </div>
      </div>
    </>
  );
}

// Secondary tabs only — the main flow is a single scroll in P3 spec order.
// (Overview/Books/Attribution content lives in the main flow now.)
type ProfileTab = "inference" | "history" | "research";

const PROF_TABS: { key: ProfileTab; label: string; badge?: string }[] = [
  { key: "inference", label: "Inference" },
  { key: "history",   label: "History"   },
  { key: "research",  label: "Research"  },
];

export function ProfileClient({ agent, slug, economics, inferenceActivity, classification, toolDecisions, books, booksHistory, anomalies = [], verificationScore }: { agent: Agent; slug: string; economics?: AgentEconomicSummary; inferenceActivity?: InferenceSummary; classification?: SettlementClassification; toolDecisions?: ToolDecisionEvent[]; books?: AgentBooks | AgentBooksUnattributed; booksHistory?: AgentBooksSnapshot[]; anomalies?: Anomaly[]; verificationScore?: VerificationScore }) {
  const router = useRouter();
  const [showShare, setShowShare] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("inference");

  // P3/P4 derived view-model (pure presenter — the tested unit).
  const booksOrFallback: AgentBooks | AgentBooksUnattributed = books ?? {
    agent: { slug, name: agent.name, ecosystem: agent.ecosystem },
    attributed: false,
    reason: "books_unavailable",
  };
  const profileMetrics = buildProfileMetrics(booksOrFallback, BOOKS_STATUS_META[agent.booksStatus].label);
  const dq = buildDataQuality(agent, booksOrFallback);
  const operatorVerdict = buildOperatorVerdict(booksOrFallback, agent);

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
          <Link href="/adopt">Adopt</Link>
          <Link href="/research">Research</Link>
          <Link href="/api">API</Link>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">Docs ↗</a>
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
        <button
          type="button"
          className="prof-back"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/registry");
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
          Agent Registry
        </button>

        {/* Identity card */}
        <div className="prof-identity">
          <ProfileAvatar agent={agent} />
          <div className="prof-identity-info">
            <div className="prof-name-row">
              <h1 className="prof-name">{agent.name}</h1>
              <span className="prof-symbol">{agent.symbol}</span>
              <span className={`reg-badge reg-eco reg-eco-${agent.ecosystem.toLowerCase()}`}>{agent.ecosystem}</span>
            </div>
            {/* 2 — Bio / one-line description */}
            <p className="prof-bio" style={{ margin: "4px 0 6px", fontSize: "0.84rem", lineHeight: 1.55, color: agent.bio ? "var(--ink)" : "var(--muted)", fontStyle: agent.bio ? "normal" : "italic" }}>
              {agent.bio ?? "No bio yet — claim this profile to add one."}
            </p>
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

        {/* Anomaly alerts */}
        {anomalies.filter((a) => a.severity === "high" || a.severity === "medium").length > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: "10px 14px",
            background: "color-mix(in srgb, #F4B942 8%, var(--surface))",
            border: "1px solid color-mix(in srgb, #F4B942 30%, transparent)",
            borderLeft: "3px solid #F4B942",
            borderRadius: 8,
            marginBottom: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#F4B942" }}>
                {anomalies.filter((a) => a.severity === "high" || a.severity === "medium").length} Active Signal{anomalies.filter((a) => a.severity === "high" || a.severity === "medium").length > 1 ? "s" : ""}
              </span>
            </div>
            {anomalies.filter((a) => a.severity === "high" || a.severity === "medium").map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                  padding: "2px 5px", borderRadius: 3,
                  background: a.severity === "high" ? "color-mix(in srgb, #F46060 15%, transparent)" : "color-mix(in srgb, #F4B942 15%, transparent)",
                  color: a.severity === "high" ? "#F46060" : "#F4B942",
                  flexShrink: 0, marginTop: 1,
                }}>
                  {a.severity}
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--ink)", lineHeight: 1.4 }}>{a.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* 3 — Exactly three labeled pills: Identity / Books / Data.
            Wallet status lives in the wallet section; treasury health lives in
            the metrics; momentum lives in the metrics strip. No badge pile. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
          {(() => {
            const dataTruncated = books?.attributed && books.confidence.flags.includes("tx_window_truncated");
            const dataMeta =
              dataTruncated
                ? { label: "Truncated", tip: "Transaction fetch hit its limit — financial totals may be incomplete.", color: "#F59E0B" }
                : agent.dataStatus === "fresh"
                  ? { label: "Fresh", tip: "Registry data checked within the last 7 days.", color: "#6DB874" }
                  : agent.dataStatus === "stale"
                    ? { label: "Stale", tip: "Registry data has not been checked recently.", color: "#F97316" }
                    : { label: "Partial", tip: "Some registry data has never been checked.", color: "var(--muted)" };
            const booksMeta = BOOKS_STATUS_META[agent.booksStatus];
            const idMeta = STATUS_META[agent.verificationStatus];
            const pills = [
              { prefix: "Identity", label: idMeta.label, tip: PROFILE_STATUS_META[agent.profileStatus].tip, color: PROFILE_STATUS_META[agent.profileStatus].color },
              { prefix: "Books", label: booksMeta.label, tip: booksMeta.tip, color: booksMeta.color },
              { prefix: "Data", label: dataMeta.label, tip: dataMeta.tip, color: dataMeta.color },
            ];
            return pills.map((p) => (
              <span
                key={p.prefix}
                title={p.tip}
                style={{
                  fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99,
                  border: `1px solid color-mix(in srgb, ${p.color} 30%, transparent)`,
                  background: `color-mix(in srgb, ${p.color} 9%, transparent)`,
                  color: p.color, whiteSpace: "nowrap",
                }}
              >
                {p.prefix}: {p.label}
              </span>
            ));
          })()}
        </div>

        {/* 4 — Financial metrics strip */}
        <MetricsStrip metrics={profileMetrics} />

        {/* 5 — Luca verdict (right after metrics) */}
        <LucaVerdictBlock
          verdict={operatorVerdict}
          adminNotes={agent.adminNotes}
          lastChecked={agent.lastChecked}
          classification={classification}
        />

        {/* When there are no books, the manifest/claim CTA IS the next action —
            surface it here instead of burying it below empty sections. */}
        {agent.booksStatus === "no_books" && (
          <ClaimBanner slug={slug} agentName={agent.name} status={agent.verificationStatus} />
        )}

        <div className="prof-body">

          {/* 6 — Agent Books (P4 header + 11-metric strip; honest unattributed states) */}
          <AgentBooksBlock books={booksOrFallback}>
            {books?.attributed && <BooksSummaryStrip metrics={buildBooksMetrics(books)} />}
          </AgentBooksBlock>

          {/* 7 — Wallet attribution (role groups + source pills) */}
          <WalletAttributionSection
            agent={agent}
            toolDecisionsBlock={toolDecisions && toolDecisions.length > 0 ? <ToolDecisionsBlock events={toolDecisions} /> : undefined}
          />

          {/* 8 — Treasury */}
          {books?.attributed && <TreasurySignals books={books} />}

          {/* 9 — Revenue / expenses (P4 breakdowns) */}
          {books?.attributed ? (
            <>
              <RevenueBreakdown buckets={buildRevenueBuckets(books)} />
              <ExpenseBreakdown buckets={mapExpenseCategories(books.breakdown.expenses_by_category)} />
            </>
          ) : (
            <section className="prof-section">
              <p className="prof-section-title">Revenue &amp; Expenses</p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
                No books yet — revenue and expense breakdowns appear once wallets are attributed via manifest.
              </p>
            </section>
          )}

          {/* 10 — Data quality (every profile) + detailed scores, collapsed */}
          <DataQualityBlock dq={dq} />
          <details className="prof-section" style={{ padding: "12px 16px" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, color: "var(--ink)" }}>
              Verification &amp; health breakdown
            </summary>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <ScoreBreakdownDetails agent={agent} verificationScore={verificationScore} />
            </div>
          </details>
          {economics && <AgentEconomicsBlock economics={economics} />}

          {/* 11 — Claim / submit manifest CTA (hoisted above when no books) */}
          {agent.booksStatus !== "no_books" && (
            <ClaimBanner slug={slug} agentName={agent.name} status={agent.verificationStatus} />
          )}

          {/* Secondary tabs — demoted from the old tab system */}
          <div className="prof-tabs prof-subtabs" style={{ marginTop: 8 }}>
            {PROF_TABS.map((t) => {
              const showBadge = t.key === "inference" && !!inferenceActivity;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`prof-tab${tab === t.key ? " prof-tab-active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {showBadge && (
                    <span style={{
                      marginLeft: 5,
                      fontSize: "0.6rem", fontWeight: 700,
                      padding: "1px 5px", borderRadius: 99,
                      background: "var(--accent)18",
                      border: "1px solid var(--accent)40",
                      color: "var(--accent)",
                      verticalAlign: "middle",
                    }}>
                      Live
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── INFERENCE — Surplus pilot full report */}
          {tab === "inference" && (
            <>
              {inferenceActivity && <InferenceActivityBlock ia={inferenceActivity} />}
              <InferenceTab ia={inferenceActivity} slug={slug} books={books} />
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
              <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "#F46060", lineHeight: 1.5 }}>
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
