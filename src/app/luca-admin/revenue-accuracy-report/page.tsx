"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AgentRevenueAudit } from "@/lib/agent-books";
import type { AuditFlag } from "@/app/api/admin/revenue-audit/route";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentMetrics = {
  quarantine_rate: number;
  dex_rate: number;
  bridge_rate: number;
  wallet_coverage: number;
  revenue_per_tx: number;
};

type AgentResult =
  | { ok: true; audit: AgentRevenueAudit; metrics: AgentMetrics; flags: AuditFlag[] }
  | { ok: false; slug: string; error: string };

type BatchResponse = {
  ok: boolean;
  period: string;
  agent_count: number;
  generated_at: string;
  summary: {
    total_gross_inflows: number;
    total_operating_revenue: number;
    total_quarantined: number;
    high_risk_agents: string[];
  };
  flags: {
    high: Array<AuditFlag & { agent: string }>;
    medium: Array<AuditFlag & { agent: string }>;
  };
  results: AgentResult[];
};

// ── Named agents always included ──────────────────────────────────────────────

const NAMED_SLUGS = ["luca", "bankr", "virtuals-protocol"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function pct(n: number) { return `${(n * 100).toFixed(0)}%`; }

function coverageBadge(cov: number) {
  if (cov >= 0.9) return { label: `${pct(cov)}`, color: "#22c55e" };
  if (cov >= 0.5) return { label: `${pct(cov)}`, color: "#f59e0b" };
  return { label: `${pct(cov)}`, color: "#ef4444" };
}

function confidenceBadge(flags: AuditFlag[]) {
  const hasHigh   = flags.some((f) => f.severity === "high");
  const hasMedium = flags.some((f) => f.severity === "medium");
  if (hasHigh)   return { label: "Low",    color: "#ef4444" };
  if (hasMedium) return { label: "Medium", color: "#f59e0b" };
  return { label: "High", color: "#22c55e" };
}

function severityColor(s: AuditFlag["severity"]) {
  return s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#6b7280";
}

const KNOWN_NAMES: Record<string, string> = {
  "luca":               "AEON / Luca",
  "bankr":              "Bankr",
  "virtuals-protocol":  "Virtuals Protocol",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryBanner({ data }: { data: BatchResponse }) {
  const { summary } = data;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 24 }}>
      {[
        { label: "Agents Audited",         value: data.agent_count.toString(),            color: "var(--ink)" },
        { label: "Total Gross Inflows",    value: fmtUsd(summary.total_gross_inflows),    color: "#e2e8f0" },
        { label: "Total Operating Revenue",value: fmtUsd(summary.total_operating_revenue),color: "#22c55e" },
        { label: "Total Quarantined",      value: fmtUsd(summary.total_quarantined),       color: "#f59e0b" },
        { label: "High-Risk Agents",       value: summary.high_risk_agents.length.toString(), color: "#ef4444" },
      ].map((card) => (
        <div key={card.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: card.color }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

function FlagSummary({ data }: { data: BatchResponse }) {
  const all = [...data.flags.high, ...data.flags.medium];
  if (all.length === 0) return null;
  return (
    <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
        Classification Concerns — {data.flags.high.length} high / {data.flags.medium.length} medium
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {all.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: severityColor(f.severity), fontWeight: 700, fontSize: 11, minWidth: 46, paddingTop: 1 }}>
              {f.severity.toUpperCase()}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", minWidth: 120 }}>
              {KNOWN_NAMES[f.agent] ?? f.agent}
            </span>
            <span style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{f.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsTable({ results }: { results: AgentResult[] }) {
  const [sort, setSort] = useState<"revenue" | "quarantine_rate" | "bridge" | "coverage">("revenue");
  const [detail, setDetail] = useState<string | null>(null);

  const sorted = [...results].sort((a, b) => {
    if (!a.ok) return 1;
    if (!b.ok) return -1;
    switch (sort) {
      case "revenue":        return b.audit.summary.operating_revenue_usd - a.audit.summary.operating_revenue_usd;
      case "quarantine_rate":return b.metrics.quarantine_rate - a.metrics.quarantine_rate;
      case "bridge":         return b.audit.summary.bridge_excluded_inflow_usd - a.audit.summary.bridge_excluded_inflow_usd;
      case "coverage":       return a.metrics.wallet_coverage - b.metrics.wallet_coverage;
    }
  });

  const hdr = (key: typeof sort, label: string) => (
    <th
      onClick={() => setSort(key)}
      style={{ padding: "8px 12px", color: sort === key ? "var(--accent)" : "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer", textAlign: "right", userSelect: "none" }}
    >
      {label}{sort === key ? " ▾" : ""}
    </th>
  );

  return (
    <>
      <div style={{ overflowX: "auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left" }}>Agent</th>
              {hdr("revenue",        "Op. Revenue")}
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "right" }}>Gross Inflows</th>
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "right" }}>Quarantined</th>
              {hdr("quarantine_rate","Quar. Rate")}
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "right" }}>DEX Excl.</th>
              {hdr("bridge",         "Bridge Excl.")}
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "right" }}>Internal</th>
              {hdr("coverage",       "Wallet Cov.")}
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center" }}>Confidence</th>
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center" }}>Flags</th>
              <th style={{ padding: "8px 12px" }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              if (!r.ok) {
                return (
                  <tr key={r.slug} style={{ borderBottom: "1px solid var(--line)", background: "rgba(239,68,68,0.04)" }}>
                    <td style={{ padding: "8px 12px", color: "#ef4444" }}>{r.slug}</td>
                    <td colSpan={10} style={{ padding: "8px 12px", color: "#ef4444", fontSize: 12 }}>Error: {r.error}</td>
                  </tr>
                );
              }
              const s = r.audit.summary;
              const m = r.metrics;
              const cov = coverageBadge(m.wallet_coverage);
              const conf = confidenceBadge(r.flags);
              const isOpen = detail === r.audit.agent.slug;
              const highCount = r.flags.filter((f) => f.severity === "high").length;
              const medCount  = r.flags.filter((f) => f.severity === "medium").length;
              return [
                <tr key={r.audit.agent.slug} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    <Link href={`/registry/${r.audit.agent.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "none" }}>
                      {KNOWN_NAMES[r.audit.agent.slug] ?? r.audit.agent.name}
                    </Link>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#22c55e" }}>
                    {fmtUsd(s.operating_revenue_usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                    {fmtUsd(s.gross_inflow_usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "#f59e0b" }}>
                    {fmtUsd(s.quarantined_usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: m.quarantine_rate > 0.4 ? "#f59e0b" : "var(--muted)" }}>
                    {pct(m.quarantine_rate)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                    {fmtUsd(s.dex_excluded_usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: s.bridge_excluded_inflow_usd > 0 ? "#8b5cf6" : "var(--muted)" }}>
                    {fmtUsd(s.bridge_excluded_inflow_usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                    {fmtUsd(s.internal_transfer_usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${cov.color}22`, color: cov.color }}>
                      {cov.label}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${conf.color}22`, color: conf.color }}>
                      {conf.label}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    {(highCount + medCount > 0) && (
                      <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        {highCount > 0 && <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>H:{highCount}</span>}
                        {medCount > 0  && <span style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>M:{medCount}</span>}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <button
                      onClick={() => setDetail(isOpen ? null : r.audit.agent.slug)}
                      style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "var(--muted)" }}
                    >
                      {isOpen ? "▲" : "▼"}
                    </button>
                  </td>
                </tr>,
                isOpen && (
                  <tr key={`${r.audit.agent.slug}-detail`} style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
                    <td colSpan={12} style={{ padding: "12px 20px" }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                        {r.audit.wallets.declared} wallet(s) declared · {r.audit.wallets.analyzed} scanned · roles: {r.audit.wallets.roles.join(", ") || "unknown"} · {s.total_txs_scanned} raw txs
                      </div>
                      {r.flags.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#22c55e" }}>No classification flags.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {r.flags.map((f, fi) => (
                            <div key={fi} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ color: severityColor(f.severity), fontWeight: 700, fontSize: 10, minWidth: 46, paddingTop: 2 }}>{f.severity.toUpperCase()}</span>
                              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", minWidth: 180 }}>{f.code}</span>
                              <span style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{f.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RevenueAccuracyReportPage() {
  const [secret,  setSecret]  = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);
  const [period,  setPeriod]  = useState<"7d" | "14d" | "30d" | "90d">("30d");
  const [mode,    setMode]    = useState<"named" | "all">("all");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [data,    setData]    = useState<BatchResponse | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const run = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError("");
    setData(null);
    setElapsed(null);
    const t0 = Date.now();

    const slugs = mode === "named" ? NAMED_SLUGS : undefined;

    try {
      const res = await fetch("/api/admin/revenue-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify({ slugs, period }),
      });
      const json = await res.json();
      setElapsed(Math.round((Date.now() - t0) / 1000));
      if (!res.ok) { setError((json as { error?: string }).error ?? `HTTP ${res.status}`); return; }
      setData(json as BatchResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [secret, period, mode]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Admin</Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Revenue Accuracy Report</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          Read-only · no classification changes
        </span>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>

        {/* Controls */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>INTERNAL SECRET</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="X402BOOKS_INTERNAL_SECRET"
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, width: 220 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>PERIOD</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "7d" | "14d" | "30d" | "90d")}
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13 }}
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>SCOPE</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "named" | "all")}
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13 }}
            >
              <option value="named">AEON + Bankr + Virtuals only</option>
              <option value="all">All indexed agents (up to 20)</option>
            </select>
          </div>
          <button
            onClick={run}
            disabled={loading || !secret}
            style={{
              padding: "8px 24px", borderRadius: 6, border: "none",
              background: loading || !secret ? "var(--line)" : "var(--accent)",
              color: loading || !secret ? "var(--muted)" : "#fff",
              fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer",
              alignSelf: "flex-end",
            }}
          >
            {loading ? "Running audit…" : "Run Accuracy Report"}
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 8 }}>
              Scanning on-chain transactions… this may take 1–3 minutes for all agents.
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", opacity: 0.6 }}>
              Audits run with a concurrency of 3 to respect Alchemy rate limits.
            </div>
          </div>
        )}

        {data && (
          <>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Revenue Accuracy Report</h2>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {data.period} · {data.agent_count} agents · generated {new Date(data.generated_at).toLocaleString()}
                  {elapsed !== null && ` · ${elapsed}s`}
                </div>
              </div>
              <Link
                href="/luca-admin/revenue-audit"
                style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
              >
                Per-agent deep audit →
              </Link>
            </div>

            <SummaryBanner data={data} />
            <FlagSummary data={data} />
            <ResultsTable results={data.results} />

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>How to read this report</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                <div><strong style={{ color: "var(--ink)" }}>Quarantine rate above 40%</strong> — most gross inflows were removed. Common for grant recipients and treasury-funded agents. Not necessarily wrong, but review the quarantined txs.</div>
                <div><strong style={{ color: "var(--ink)" }}>Bridge excluded</strong> — agent is cross-chain. Our figures are Base-only. AEON may aggregate across chains, explaining a higher figure.</div>
                <div><strong style={{ color: "var(--ink)" }}>Wallet coverage below 100%</strong> — declared wallets that are not on Base are excluded. The revenue figure is a lower bound.</div>
                <div><strong style={{ color: "var(--ink)" }}>Near-threshold inflows (LOW flag)</strong> — $1k–$10k stablecoin inflows that passed the capital injection check. These are counted as operating revenue but may be one-time payments not recurring revenue.</div>
                <div><strong style={{ color: "var(--ink)" }}>Do not change classification rules yet.</strong> Use the per-agent Revenue Audit Mode to inspect individual transactions before adjusting thresholds.</div>
              </div>
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Revenue Accuracy Report</div>
            <div style={{ color: "var(--muted)", fontSize: 14, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              Runs a live on-chain audit for AEON, Bankr, Virtuals, and the top revenue agents.
              Shows every classification metric side-by-side and flags agents most likely to have incorrect revenue figures.
            </div>
            <div style={{ marginTop: 20, fontSize: 12, color: "var(--muted)", opacity: 0.7 }}>
              Requires Alchemy API key and X402BOOKS_INTERNAL_SECRET configured in production.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
