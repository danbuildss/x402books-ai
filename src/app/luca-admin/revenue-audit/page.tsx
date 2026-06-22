"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AgentRevenueAudit, AuditTx } from "@/lib/agent-books";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = "revenue" | "quarantined" | "dex" | "bridge" | "internal";

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "revenue",    label: "Operating Revenue", color: "#22c55e" },
  { key: "quarantined",label: "Quarantined",        color: "#f59e0b" },
  { key: "dex",        label: "DEX Excluded",       color: "#3b82f6" },
  { key: "bridge",     label: "Bridge Excluded",    color: "#8b5cf6" },
  { key: "internal",   label: "Internal Transfers", color: "#6b7280" },
];

const QUARANTINE_LABELS: Record<string, string> = {
  capital_injection:    "Capital Injection",
  grant_program:        "Grant Program",
  bridge_receipt:       "Bridge Receipt",
  token_distribution:   "Token Distribution",
  unknown_large_inflow: "Unknown Large Inflow",
};

const QUARANTINE_COLORS: Record<string, string> = {
  capital_injection:    "#ef4444",
  grant_program:        "#8b5cf6",
  bridge_receipt:       "#3b82f6",
  token_distribution:   "#f59e0b",
  unknown_large_inflow: "#6b7280",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function fmtAddr(addr: string) {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtHash(hash: string) {
  if (!hash || hash.length < 10) return hash || "—";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryWaterfall({ audit }: { audit: AgentRevenueAudit }) {
  const { summary } = audit;
  const rows = [
    { label: "Gross inflows (all income transfers)",    value: summary.gross_inflow_usd,           sign: null,  color: "#e2e8f0" },
    { label: "− Bridge receipts excluded",              value: summary.bridge_excluded_inflow_usd,  sign: "−",   color: "#8b5cf6" },
    { label: "− DEX swaps excluded",                   value: summary.dex_excluded_usd,            sign: "−",   color: "#3b82f6" },
    { label: "− Quarantined (cap. injections / grants)",value: summary.quarantined_usd,             sign: "−",   color: "#f59e0b" },
    { label: "= Operating revenue (what we report)",   value: summary.operating_revenue_usd,        sign: "=",   color: "#22c55e" },
  ];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: 13 }}>
        Revenue Waterfall — {audit.period}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
          background: row.sign === "=" ? "rgba(34,197,94,0.06)" : "transparent",
        }}>
          <span style={{ fontSize: 13, color: row.sign === "=" ? "#22c55e" : "var(--ink)" }}>
            {row.label}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: row.sign === "=" ? 700 : 400, color: row.color }}>
            {row.sign === "−" ? "−" : ""}{fmtUsd(row.value)}
          </span>
        </div>
      ))}
      <div style={{ padding: "8px 16px", background: "var(--surface-soft)", fontSize: 12, color: "var(--muted)" }}>
        {summary.total_txs_scanned.toLocaleString()} raw transactions scanned across {audit.period} · internal transfers not shown here
      </div>
    </div>
  );
}

function AeonDiffNotes({ notes }: { notes: string[] }) {
  return (
    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        AEON Diff Analysis
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {notes.map((note, i) => (
          <li key={i} style={{ fontSize: 13, color: "var(--ink)", display: "flex", gap: 8 }}>
            <span style={{ color: "#ef4444", flexShrink: 0 }}>›</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TxTable({ txs, tab }: { txs: AuditTx[]; tab: TabKey }) {
  if (txs.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
        No transactions in this category.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>Tx Hash</th>
            <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>Time</th>
            <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600, textAlign: "right" }}>Amount</th>
            <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>Token</th>
            <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>Counterparty</th>
            {tab === "quarantined" && (
              <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>Quarantine Reason</th>
            )}
            <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>Classification Reason</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((tx, i) => (
            <tr key={tx.txHash + i} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                <a
                  href={`https://basescan.org/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#3b82f6", textDecoration: "none" }}
                >
                  {fmtHash(tx.txHash)}
                </a>
              </td>
              <td style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                {fmtDate(tx.timestamp)}
              </td>
              <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: tx.direction === "income" ? "#22c55e" : tx.direction === "expense" ? "#ef4444" : "var(--muted)" }}>
                {tx.direction === "expense" ? "−" : "+"}{fmtUsd(tx.amount_usd)}
              </td>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                {tx.token_symbol}
              </td>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                <a
                  href={`https://basescan.org/address/${tx.counterparty || tx.from}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--ink)", textDecoration: "none" }}
                >
                  {fmtAddr(tx.counterparty || tx.from)}
                </a>
              </td>
              {tab === "quarantined" && (
                <td style={{ padding: "8px 12px" }}>
                  {tx.quarantine_reason ? (
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${QUARANTINE_COLORS[tx.quarantine_reason]}22`,
                      color: QUARANTINE_COLORS[tx.quarantine_reason],
                    }}>
                      {QUARANTINE_LABELS[tx.quarantine_reason] ?? tx.quarantine_reason}
                    </span>
                  ) : "—"}
                </td>
              )}
              <td style={{ padding: "8px 12px", color: "var(--muted)", maxWidth: 300, lineHeight: 1.4 }}>
                {tx.audit_reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RevenueAuditPage() {
  const [secret,  setSecret]  = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);
  const [slug,    setSlug]    = useState("");
  const [period,  setPeriod]  = useState<"7d" | "14d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [audit,   setAudit]   = useState<AgentRevenueAudit | null>(null);
  const [tab,     setTab]     = useState<TabKey>("revenue");

  const load = useCallback(async () => {
    if (!secret || !slug) return;
    setLoading(true);
    setError("");
    setAudit(null);

    try {
      const res = await fetch(`/api/v1/agent/${encodeURIComponent(slug)}/revenue-audit?period=${period}`, {
        headers: { "x-internal-secret": secret },
      });
      const json = await res.json();
      if (!res.ok) {
        setError((json as { error?: string }).error ?? `HTTP ${res.status}`);
      } else if ("error" in json) {
        setError((json as { error: string }).error);
      } else {
        setAudit(json as AgentRevenueAudit);
        setTab("revenue");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [secret, slug, period]);

  function tabTxs(key: TabKey): AuditTx[] {
    if (!audit) return [];
    switch (key) {
      case "revenue":    return audit.transactions.operating_revenue;
      case "quarantined":return audit.transactions.quarantined;
      case "dex":        return audit.transactions.dex_excluded;
      case "bridge":     return audit.transactions.bridge_excluded;
      case "internal":   return audit.transactions.internal_transfers;
    }
  }

  function tabCount(key: TabKey): number { return tabTxs(key).length; }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>
          ← Admin
        </Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Revenue Audit Mode</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          Read-only · no classification changes
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>

        {/* Control bar */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end",
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: 16, marginBottom: 24,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>INTERNAL SECRET</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="X402BOOKS_INTERNAL_SECRET"
              style={{
                padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)",
                background: "var(--bg)", color: "var(--ink)", fontSize: 13, width: 220,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>AGENT SLUG</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
              placeholder="e.g. bankr-bot"
              onKeyDown={(e) => e.key === "Enter" && load()}
              style={{
                padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)",
                background: "var(--bg)", color: "var(--ink)", fontSize: 13, width: 180,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>PERIOD</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "7d" | "14d" | "30d" | "90d")}
              style={{
                padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)",
                background: "var(--bg)", color: "var(--ink)", fontSize: 13,
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <button
            onClick={load}
            disabled={loading || !secret || !slug}
            style={{
              padding: "8px 20px", borderRadius: 6, border: "none",
              background: loading || !secret || !slug ? "var(--line)" : "var(--accent)",
              color: loading || !secret || !slug ? "var(--muted)" : "#fff",
              fontWeight: 600, fontSize: 13, cursor: loading ? "wait" : "pointer",
              alignSelf: "flex-end",
            }}
          >
            {loading ? "Scanning…" : "Run Audit"}
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Scanning on-chain transactions for {slug}… this may take up to 30 seconds.
          </div>
        )}

        {audit && (
          <>
            {/* Agent header */}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{audit.agent.name}</h2>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {audit.period} audit · generated {new Date(audit.generated_at).toLocaleString()}
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Gross Inflows",       value: audit.summary.gross_inflow_usd,           color: "#e2e8f0" },
                { label: "Operating Revenue",    value: audit.summary.operating_revenue_usd,      color: "#22c55e" },
                { label: "Quarantined",          value: audit.summary.quarantined_usd,            color: "#f59e0b" },
                { label: "DEX Excluded",         value: audit.summary.dex_excluded_usd,           color: "#3b82f6" },
                { label: "Bridge Excluded",      value: audit.summary.bridge_excluded_inflow_usd, color: "#8b5cf6" },
                { label: "Internal Transfers",   value: audit.summary.internal_transfer_usd,      color: "#6b7280" },
              ].map((card) => (
                <div key={card.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: card.color }}>
                    {fmtUsd(card.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Waterfall */}
            <SummaryWaterfall audit={audit} />

            {/* AEON diff */}
            <AeonDiffNotes notes={audit.aeon_diff_notes} />

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "1px solid",
                    borderColor: tab === t.key ? t.color : "var(--line)",
                    background: tab === t.key ? `${t.color}18` : "transparent",
                    color: tab === t.key ? t.color : "var(--muted)",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}
                >
                  {t.label}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>({tabCount(t.key)})</span>
                </button>
              ))}
            </div>

            {/* Transaction table */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {TABS.find((t) => t.key === tab)?.label} — {tabCount(tab)} transaction(s)
                </span>
                {tab === "revenue" && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#22c55e", fontWeight: 700 }}>
                    {fmtUsd(audit.summary.operating_revenue_usd)}
                  </span>
                )}
                {tab === "quarantined" && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                    {fmtUsd(audit.summary.quarantined_usd)} withheld
                  </span>
                )}
              </div>
              <TxTable txs={tabTxs(tab)} tab={tab} />
            </div>
          </>
        )}

        {!audit && !loading && !error && (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Revenue Audit Mode</div>
            <div style={{ color: "var(--muted)", fontSize: 14, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
              Enter your internal secret and an agent slug to trace every transaction that was counted as operating revenue — and every transaction that was excluded.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
