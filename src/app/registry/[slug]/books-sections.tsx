"use client";

// P3/P4 profile sections. Dumb components over pure presenter output
// (src/lib/books-presenter.ts owns the derivations and honesty invariants;
// it is the tested unit — keep logic out of these components).

import type { CSSProperties, ReactNode } from "react";
import type { Agent, AgentWallet } from "@/app/registry/types";
import type { ToolDecisionEvent } from "@/lib/tool-decisions";
import type { SettlementClassification } from "@/lib/luca-classify";
import {
  isTracked,
  walletRoleLabel,
  walletSourceLabel,
  type Bucket,
  type BooksMetrics,
  type DataQuality,
  type ExpenseBuckets,
  type Metric,
  type OperatorVerdict,
  type ProfileMetrics,
  type RevenueBuckets,
  type WalletRole,
  type WalletSource,
} from "@/lib/books-presenter";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import { WALLET_STATUS_META } from "@/app/registry/filters";

// ── Shared formatting ─────────────────────────────────────────────────────────

function usd(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncate(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

const LABEL_CAPS: CSSProperties = {
  fontSize: "0.62rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
};

function MetricTile({ label, metric, money = true, signed = false }: { label: string; metric: Metric; money?: boolean; signed?: boolean }) {
  const has = metric.value != null;
  const v = metric.value ?? 0;
  const color = !has ? "var(--muted)" : signed ? (v >= 0 ? "var(--accent)" : "#f87171") : "var(--ink)";
  return (
    <div className="prof-metric" title={metric.note}>
      <span style={LABEL_CAPS}>{label}</span>
      <span
        className={has ? undefined : "prof-metric-na"}
        style={{ fontSize: "0.98rem", fontWeight: 700, fontFamily: "var(--font-mono)", color }}
      >
        {has ? `${signed && v >= 0 ? "+" : signed ? "−" : ""}${money ? usd(v) : v}` : "—"}
      </span>
      {!has && metric.note && (
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", lineHeight: 1.3 }}>{metric.note}</span>
      )}
    </div>
  );
}

function TextTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="prof-metric">
      <span style={LABEL_CAPS}>{label}</span>
      <span style={{ fontSize: "0.86rem", fontWeight: 700, color: color ?? "var(--ink)", textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}

// ── P3 item 4 — financial metrics strip (6 tiles, early on the page) ─────────

// Small amber chip marking incomplete data — truncated totals must never look complete.
export function TruncatedChip() {
  return (
    <span
      title="Transaction fetch hit its limit inside this window — older in-window activity was not scanned, so totals may understate real activity."
      style={{
        fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px", borderRadius: 4,
        background: "color-mix(in srgb, #F59E0B 12%, transparent)",
        border: "1px solid color-mix(in srgb, #F59E0B 35%, transparent)",
        color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.05em",
      }}
    >
      Truncated
    </span>
  );
}

function asOf(ts: string | null): string | null {
  if (!ts) return null;
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Footer under every financial metric surface: period source + "as of" + staleness.
// Financial numbers must never look live when they are old.
export function MetricsAsOfLine({ generatedAt, truncated }: { generatedAt: string | null; truncated: boolean }) {
  const label = asOf(generatedAt);
  const ageMs = generatedAt ? Date.now() - new Date(generatedAt).getTime() : null;
  const isStale = ageMs != null && ageMs > 8 * 60 * 60 * 1000; // beyond 2 refresh cycles
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.66rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        30d window · {label ? `as of ${label}` : "not yet computed"}
      </span>
      {isStale && (
        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#F97316", textTransform: "uppercase", letterSpacing: "0.05em" }}
          title="These figures are from an older indexing run and may not reflect current activity.">
          Stale
        </span>
      )}
      {truncated && <TruncatedChip />}
    </div>
  );
}

export function MetricsStrip({ metrics }: { metrics: ProfileMetrics }) {
  const confColor =
    metrics.confidence === "high" ? "#6DB874" : metrics.confidence === "medium" ? "#F59E0B" : metrics.confidence === "low" ? "#ef4444" : "var(--muted)";
  return (
    <section className="prof-section" style={{ padding: 0, border: "none" }}>
      <div className="prof-metrics">
        <MetricTile label="30d Revenue" metric={metrics.revenue30d} />
        <MetricTile label="30d Expenses" metric={metrics.expenses30d} />
        <MetricTile label="Net Position" metric={metrics.netPosition} signed />
        <MetricTile label="Treasury Balance" metric={metrics.treasuryBalance} />
        <TextTile label="Books Status" value={metrics.booksStatus} />
        <TextTile label="Confidence" value={metrics.confidence} color={confColor} />
      </div>
      {(metrics.generatedAt || metrics.truncated) && (
        <MetricsAsOfLine generatedAt={metrics.generatedAt} truncated={metrics.truncated} />
      )}
    </section>
  );
}

// ── P4 books header — 11-metric strip ─────────────────────────────────────────

export function BooksSummaryStrip({ metrics }: { metrics: BooksMetrics }) {
  const confColor =
    metrics.classificationConfidence === "high" ? "#6DB874" : metrics.classificationConfidence === "medium" ? "#F59E0B" : "#ef4444";
  return (
    <div className="prof-books-metrics" style={{ marginBottom: 12 }}>
      <MetricTile label="Revenue" metric={metrics.revenue} />
      <MetricTile label="Expenses" metric={metrics.expenses} />
      <MetricTile label="Net Flow" metric={metrics.netFlow} signed />
      <MetricTile label="Treasury Balance" metric={metrics.treasuryBalance} />
      <MetricTile label="Runway (months)" metric={metrics.runwayMonths} money={false} />
      <MetricTile label="Wallets Used" metric={metrics.walletsUsed} money={false} />
      <MetricTile label="Transactions" metric={metrics.txCount} money={false} />
      <TextTile label="Classification Confidence" value={metrics.classificationConfidence} color={confColor} />
      <MetricTile label="Quarantined Inflows" metric={metrics.quarantinedInflows} />
      <MetricTile label="Unknown Activity" metric={metrics.unknownActivity} />
      <div className="prof-metric">
        <span style={LABEL_CAPS}>Last Updated</span>
        <span style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          {metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <MetricsAsOfLine generatedAt={metrics.lastUpdated} truncated={metrics.truncated} />
      </div>
    </div>
  );
}

// ── P4 revenue breakdown — token revenue is NEVER operating revenue ──────────

export function RevenueBreakdown({ buckets }: { buckets: RevenueBuckets }) {
  const rows: { label: string; value: number; color: string; note: string }[] = [
    { label: "Settlement revenue", value: buckets.settlement, color: "var(--accent)", note: "Stablecoin inflows from known counterparties — highest-confidence tier" },
    { label: "Agent-token revenue", value: buckets.agentToken, color: "#5B8FA8", note: "Agent-token inflows — tracked separately, NOT operating revenue" },
    { label: "Quarantined inflows", value: buckets.quarantined, color: "#F59E0B", note: "Held out of revenue pending classification (capital injections, grants, bridges)" },
    { label: "Unknown inflows", value: buckets.unknown, color: "var(--muted)", note: "Operating inflows without a confident classification — stays unknown" },
  ];
  return (
    <section className="prof-section">
      <p className="prof-section-title">Revenue Breakdown</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => (
          <div key={r.label} className="prof-breakdown-row" title={r.note}>
            <span style={{ fontSize: "0.8rem", color: "var(--ink)" }}>{r.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: r.value > 0 ? r.color : "var(--muted)" }}>
              {usd(r.value)}
            </span>
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.55 }}>
        Agent-token inflows and quarantined amounts are never counted as operating revenue.
      </p>
    </section>
  );
}

// ── P4 expense breakdown — notTracked renders honestly, never "$0.00" ────────

function ExpenseRow({ label, bucket, note }: { label: string; bucket: Bucket; note: string }) {
  return (
    <div className="prof-breakdown-row" title={note}>
      <span style={{ fontSize: "0.8rem", color: "var(--ink)" }}>{label}</span>
      {isTracked(bucket) ? (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: bucket.value > 0 ? "#f87171" : "var(--muted)" }}>
          −{usd(bucket.value)}
          <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 6, fontSize: "0.68rem" }}>{bucket.txCount} txs</span>
        </span>
      ) : (
        <span className="prof-not-tracked">not tracked</span>
      )}
    </div>
  );
}

export function ExpenseBreakdown({ buckets }: { buckets: ExpenseBuckets }) {
  return (
    <section className="prof-section">
      <p className="prof-section-title">Expense Breakdown</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ExpenseRow label="Inference spend" bucket={buckets.inference} note="Model/inference purchases, API calls, compute" />
        <ExpenseRow label="Provider spend" bucket={buckets.provider} note="Provider and fallback-provider payments" />
        <ExpenseRow label="Gas" bucket={buckets.gas} note="On-chain gas is not tracked by the ledger today" />
        <ExpenseRow label="External expenses" bucket={buckets.external} note="Agent services, subscriptions, data access, refunds" />
        <ExpenseRow label="Unknown expenses" bucket={buckets.unknown} note="Outflows without a confident classification — stays unknown" />
      </div>
    </section>
  );
}

// ── P3 item 7 / P4 wallet attribution — role groups + source pills ───────────

const SOURCE_COLORS: Record<string, string> = {
  manifest: "#22c55e",
  admin: "#5B8FA8",
  inferred: "#F59E0B",
  candidate: "var(--muted)",
};

const ROLE_ORDER: WalletRole[] = ["treasury", "deployer", "operator", "unknown"];

// Attribution trust order. Source dominates role in the display hierarchy:
// a discovered (candidate) wallet must never visually outrank a
// manifest-declared one, regardless of its declared role.
const SOURCE_ORDER: WalletSource[] = ["manifest", "admin", "inferred", "candidate"];

const SOURCE_GROUP_META: Record<WalletSource, { title: string; sub: string; dimmed: boolean }> = {
  manifest:  { title: "Manifest-declared", sub: "Declared by the team via .agent/wallets.json — used for books", dimmed: false },
  admin:     { title: "Admin-added",       sub: "Added after manual review",                                    dimmed: true },
  inferred:  { title: "Inferred",          sub: "Attributed by Luca — not team-declared",                       dimmed: true },
  candidate: { title: "Candidate / discovered", sub: "Discovered from public data — unconfirmed, never used for books", dimmed: true },
};

function SourcePill({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? "var(--muted)";
  return (
    <span
      title={`Attribution source: ${source}`}
      style={{
        fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        color, textTransform: "lowercase",
      }}
    >
      {source}
    </span>
  );
}

export function WalletAttributionSection({ agent, toolDecisionsBlock }: { agent: Agent; toolDecisionsBlock?: ReactNode }) {
  const CONTRACT_TYPES = new Set(["token_contract", "smart_contract", "proxy_contract", "vault"]);
  const allWallets = Array.from(
    new Map((agent.wallets ?? []).map((w) => [w.address.toLowerCase(), w])).values(),
  );

  const isContract = (w: AgentWallet) => {
    const atype = (w.address_type ?? "").toLowerCase();
    const isTokenAddr = agent.tokenAddress && w.address.toLowerCase() === agent.tokenAddress.toLowerCase();
    return CONTRACT_TYPES.has(atype) || Boolean(isTokenAddr) || (w.role ?? "").toLowerCase() === "token_contract";
  };

  const operationalWallets = allWallets.filter((w) => !isContract(w));
  const contractWallets = allWallets.filter(isContract);
  // Group by SOURCE first (trust order), then role order within each group.
  const roleRank = (w: AgentWallet) => ROLE_ORDER.indexOf(walletRoleLabel(w.role));
  const bySource = new Map<WalletSource, AgentWallet[]>();
  for (const w of operationalWallets) {
    const src = walletSourceLabel(w.evidenceSource);
    bySource.set(src, [...(bySource.get(src) ?? []), w]);
  }
  for (const list of bySource.values()) list.sort((a, b) => roleRank(a) - roleRank(b));
  const hasManifest = operationalWallets.some((w) => walletSourceLabel(w.evidenceSource) === "manifest");

  const wsMeta = WALLET_STATUS_META[agent.walletStatus];

  return (
    <section className="prof-section" id="wallet-attribution">
      <p className="prof-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        Wallet Attribution
        <span
          title={wsMeta.tip}
          style={{
            fontSize: "0.62rem", fontWeight: 600, padding: "1px 8px", borderRadius: 99,
            border: `1px solid color-mix(in srgb, ${wsMeta.color} 30%, transparent)`,
            background: `color-mix(in srgb, ${wsMeta.color} 9%, transparent)`,
            color: wsMeta.color, textTransform: "none", letterSpacing: 0,
          }}
        >
          {wsMeta.label}
        </span>
      </p>

      {!hasManifest && allWallets.length > 0 && (
        <div style={{ marginBottom: 10, padding: "8px 12px", background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 6 }}>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#f59e0b", lineHeight: 1.5 }}>
            Wallet manifest required. Candidate and contract addresses are not used for books.{" "}
            <a href="/api#manifest" style={{ color: "#f59e0b", textDecoration: "underline" }}>Add .agent/wallets.json →</a>
          </p>
        </div>
      )}

      {SOURCE_ORDER.map((source) => {
        const wallets = bySource.get(source);
        if (!wallets || wallets.length === 0) return null;
        const meta = SOURCE_GROUP_META[source];
        return (
          <div key={source} style={{ marginBottom: 12, opacity: meta.dimmed ? 0.72 : 1 }}>
            <p style={{ margin: "0 0 2px", ...LABEL_CAPS, color: meta.dimmed ? "var(--muted)" : "var(--ink)" }}>
              {meta.title}
            </p>
            <p style={{ margin: "0 0 6px", fontSize: "0.66rem", color: "var(--muted)" }}>{meta.sub}</p>
            {wallets.map((w) => {
              const eligibility = isBooksEligibleWallet(w, agent.tokenAddress);
              return (
                <div key={w.address} className="reg-card-wallet-row">
                  <SourcePill source={source} />
                  <span className={`reg-wallet-label-pill reg-wallet-${w.label.replace(/\s+/g, "-")}`}>{w.label}</span>
                  {eligibility.eligible ? (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#22c55e" }} title="Counted toward agent books">
                      books ✓
                    </span>
                  ) : (
                    <span
                      style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--muted)", textDecoration: "underline dotted" }}
                      title={eligibility.reason ?? "Not eligible for books"}
                    >
                      not in books
                    </span>
                  )}
                  {w.chain && <span className="reg-wallet-chain">{w.chain}</span>}
                  <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                    {truncate(w.address)}
                  </a>
                  {w.notes && <span className="reg-wallet-note">{w.notes}</span>}
                </div>
              );
            })}
          </div>
        );
      })}

      {(contractWallets.length > 0 || agent.tokenAddress) && (
        <>
          <p style={{ margin: "12px 0 6px", ...LABEL_CAPS }}>Contract addresses — not used for books</p>
          {agent.tokenAddress && !contractWallets.some((w) => w.address.toLowerCase() === agent.tokenAddress!.toLowerCase()) && (
            <div className="reg-card-wallet-row" style={{ opacity: 0.65 }}>
              <span className="reg-wallet-label-pill reg-wallet-candidate">token contract</span>
              <a href={`https://basescan.org/token/${agent.tokenAddress}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                {truncate(agent.tokenAddress)}
              </a>
            </div>
          )}
          {contractWallets.map((w) => (
            <div key={w.address} className="reg-card-wallet-row" style={{ opacity: 0.65 }}>
              <span className="reg-wallet-label-pill reg-wallet-candidate">{w.address_type ?? "contract"}</span>
              <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                {truncate(w.address)}
              </a>
            </div>
          ))}
        </>
      )}

      {allWallets.length === 0 && !agent.tokenAddress && (
        <p className="reg-card-no-wallet">Wallet discovery pending — Luca is researching public data.</p>
      )}

      {toolDecisionsBlock}

      <p className="prof-footer-note" style={{ marginTop: 12 }}>
        Sources: <strong>manifest</strong> = declared by the team · <strong>admin</strong> = added after review ·{" "}
        <strong>inferred</strong> = attributed by Luca · <strong>candidate</strong> = discovered, unconfirmed.
      </p>
    </section>
  );
}

// ── P3 item 10 — data quality (rendered on EVERY profile) ────────────────────

export function DataQualityBlock({ dq }: { dq: DataQuality }) {
  const freshColor = dq.dataFreshness === "fresh" ? "#6DB874" : dq.dataFreshness === "stale" ? "#F97316" : "var(--muted)";
  const rows: [string, ReactNode][] = [
    ["Wallet attribution", dq.walletAttribution],
    ["Books status", dq.booksStatus],
    ["Last indexed", dq.lastIndexed ? new Date(dq.lastIndexed).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"],
    ["Data freshness", <span key="f" style={{ color: freshColor, fontWeight: 600, textTransform: "capitalize" }}>{dq.dataFreshness}</span>],
    ["Transaction coverage", dq.truncated
      ? <span key="t" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><TruncatedChip /><span style={{ color: "var(--muted)" }}>window incomplete</span></span>
      : <span key="t" style={{ color: "#6DB874", fontWeight: 600 }}>Complete</span>],
  ];
  return (
    <section className="prof-section" id="data-quality">
      <p className="prof-section-title">Data Quality</p>
      <div className="prof-dq">
        {rows.map(([label, value]) => (
          <div key={label} className="prof-breakdown-row">
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{label}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--ink)" }}>{value}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: "12px 0 4px", ...LABEL_CAPS }}>Missing data</p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
        {dq.missing.map((m) => (
          <li key={m} style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.5 }}>{m}</li>
        ))}
      </ul>
      <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 6, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
        <span style={{ ...LABEL_CAPS, marginRight: 8 }}>Next action</span>
        <span style={{ fontSize: "0.78rem", color: "var(--ink)" }}>{dq.nextAction}</span>
      </div>
    </section>
  );
}

// ── P3 item 5 / P4 Luca verdict — operator-grade ─────────────────────────────

export function LucaVerdictBlock({
  verdict,
  adminNotes,
  lastChecked,
  classification,
}: {
  verdict: OperatorVerdict;
  adminNotes: string | null;
  lastChecked: string | null;
  classification?: SettlementClassification;
}) {
  return (
    <div className="prof-verdict">
      <div className="prof-verdict-label">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
        Luca Verdict
      </div>

      {adminNotes && <p className="prof-verdict-text">{adminNotes}</p>}

      <p style={{ margin: "10px 0 4px", ...LABEL_CAPS }}>What we know</p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
        {verdict.whatWeKnow.map((k) => (
          <li key={k} style={{ fontSize: "0.78rem", color: "var(--ink)", lineHeight: 1.55 }}>{k}</li>
        ))}
        {classification?.signals.slice(0, 2).map((s) => (
          <li key={s} style={{ fontSize: "0.78rem", color: "var(--ink)", lineHeight: 1.55 }}>{s}</li>
        ))}
      </ul>

      <p style={{ margin: "10px 0 4px", ...LABEL_CAPS }}>What is missing</p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
        {verdict.missing.map((m) => (
          <li key={m} style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.5 }}>{m}</li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: "0.76rem" }}>
        <span>
          <span style={{ ...LABEL_CAPS, marginRight: 6 }}>Confidence</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>{verdict.confidence}</span>
        </span>
        <span>
          <span style={{ ...LABEL_CAPS, marginRight: 6 }}>Next action</span>
          <span style={{ color: "var(--ink)" }}>{verdict.nextAction}</span>
        </span>
      </div>

      {lastChecked && <p className="prof-verdict-date">Last reviewed: {lastChecked}</p>}
    </div>
  );
}
