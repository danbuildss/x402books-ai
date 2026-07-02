"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types (mirrors API response) ─────────────────────────────────────────────

type AddressType =
  | "eoa"
  | "token_contract"
  | "proxy_contract"
  | "treasury_contract"
  | "vault"
  | "smart_contract"
  | "smart_account"
  | "unknown";

type WalletReport = {
  address: string;
  label: string;
  role: string | null;
  chain: string | null;
  evidence_source: string | null;
  address_type: AddressType;
  attribution: "manifest" | "discovered" | "unknown";
  is_valid_for_books: boolean;
  error?: string;
};

type AgentReport = {
  name: string;
  slug: string;
  ecosystem: string;
  token_address: string | null;
  wallets: WalletReport[];
  manifest_wallet_count: number;
  discovered_wallet_count: number;
  eoa_count: number;
  contract_count: number;
  token_contract_count: number;
  attribution_status: "attributed" | "discovered_only" | "unattributed";
};

type Summary = {
  total_agents: number;
  attributed_agents: number;
  discovered_only_agents: number;
  unattributed_agents: number;
  attribution_coverage_pct: number;
  total_addresses: number;
  eoa_count: number;
  token_contract_count: number;
  proxy_contract_count: number;
  treasury_contract_count: number;
  vault_count: number;
  smart_contract_count: number;
  unknown_count: number;
  valid_for_books_count: number;
  critical_issues_count: number;
};

type ClassificationReport = {
  ok: boolean;
  summary: Summary;
  critical_issues: string[];
  agents: AgentReport[];
  sql_migration: string;
  generated_at: string;
  error?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<AddressType, { label: string; color: string }> = {
  eoa:               { label: "EOA",             color: "#22c55e" },
  token_contract:    { label: "Token Contract",  color: "#ef4444" },
  proxy_contract:    { label: "Proxy Contract",  color: "#f59e0b" },
  treasury_contract: { label: "Treasury (Safe)", color: "#6DB874" },
  vault:             { label: "Vault",           color: "#a855f7" },
  smart_contract:    { label: "Smart Contract",  color: "#f97316" },
  smart_account:     { label: "Smart Account",   color: "#3b82f6" },
  unknown:           { label: "Unknown",         color: "#6b7280" },
};

const ATTR_META: Record<WalletReport["attribution"], { label: string; color: string }> = {
  manifest:   { label: "Manifest",   color: "#22c55e" },
  discovered: { label: "Discovered", color: "#f59e0b" },
  unknown:    { label: "Unknown",    color: "#6b7280" },
};

const STATUS_META: Record<AgentReport["attribution_status"], { label: string; color: string }> = {
  attributed:      { label: "Attributed",      color: "#22c55e" },
  discovered_only: { label: "Discovered Only", color: "#f59e0b" },
  unattributed:    { label: "Unattributed",    color: "#6b7280" },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddressClassificationPage() {
  const [secret, setSecret]   = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);
  const [report, setReport] = useState<ClassificationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [writeMsg, setWriteMsg] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<AgentReport["attribution_status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);

  function runAudit(write = false) {
    if (write) { setWriting(true); setWriteMsg(""); }
    else { setLoading(true); setReport(null); }
    setError("");
    fetch(`/api/admin/address-classification${write ? "?write=true" : ""}`, {
      headers: { "x-internal-secret": secret },
    })
      .then((r) => r.json())
      .then((json: ClassificationReport & { write?: { rows_updated: number; error: string | null } }) => {
        if (!json.ok) { setError(json.error ?? "Classification failed"); return; }
        setReport(json);
        if (write && json.write) {
          setWriteMsg(json.write.error
            ? `Write error: ${json.write.error}`
            : `Wrote address_type to ${json.write.rows_updated} wallet rows.`
          );
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => { setLoading(false); setWriting(false); });
  }

  const visible = report
    ? report.agents.filter((a) => {
        if (filter !== "all" && a.attribution_status !== filter) return false;
        if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Admin</Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Address Classification Audit</span>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>

        {/* Run audit */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Classification Audit</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Classifies every wallet address via Alchemy RPC — EOA, Token Contract, Proxy, Treasury (Safe), Vault, Smart Contract.
              Takes ~30–90s depending on registry size.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ZETTA_INTERNAL_SECRET"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 260 }}
            />
            <button
              onClick={() => runAudit(false)}
              disabled={loading || writing}
              style={{ padding: "8px 18px", borderRadius: 6, background: "#6DB874", color: "#fff", border: "none", cursor: (loading || writing) ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, opacity: (loading || writing) ? 0.6 : 1 }}
            >
              {loading ? "Classifying…" : "Run Audit"}
            </button>
            <button
              onClick={() => runAudit(true)}
              disabled={loading || writing}
              title="Classify all wallets and write address_type back to the database"
              style={{ padding: "8px 18px", borderRadius: 6, background: "#3b82f6", color: "#fff", border: "none", cursor: (loading || writing) ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, opacity: (loading || writing) ? 0.6 : 1 }}
            >
              {writing ? "Classifying & Writing…" : "Classify & Write to DB"}
            </button>
          </div>
          {writeMsg && (
            <div style={{ marginTop: 10, fontSize: 12, color: writeMsg.startsWith("Write error") ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
              {writeMsg}
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {report && (
          <>
            {/* Generated at */}
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
              Generated {new Date(report.generated_at).toLocaleString()}
            </div>

            {/* Critical issues */}
            {report.critical_issues.length > 0 && (
              <div style={{ background: "#ef444410", border: "1px solid #ef444440", borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#ef4444", marginBottom: 8 }}>
                  ⚠ {report.critical_issues.length} Critical Issue{report.critical_issues.length > 1 ? "s" : ""}
                </div>
                {report.critical_issues.map((issue, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>• {issue}</div>
                ))}
              </div>
            )}

            {/* KPI grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Total Agents",        value: report.summary.total_agents,              color: "var(--ink)" },
                { label: "Attributed",           value: report.summary.attributed_agents,         color: "#22c55e" },
                { label: "Discovered Only",      value: report.summary.discovered_only_agents,    color: "#f59e0b" },
                { label: "Unattributed",         value: report.summary.unattributed_agents,       color: "#6b7280" },
                { label: "Coverage",             value: `${report.summary.attribution_coverage_pct}%`, color: "#6DB874" },
                { label: "Total Addresses",      value: report.summary.total_addresses,           color: "var(--ink)" },
                { label: "EOA",                  value: report.summary.eoa_count,                 color: "#22c55e" },
                { label: "Token Contracts",      value: report.summary.token_contract_count,      color: "#ef4444" },
                { label: "Smart Contracts",      value: report.summary.smart_contract_count,      color: "#f97316" },
                { label: "Proxy Contracts",      value: report.summary.proxy_contract_count,      color: "#f59e0b" },
                { label: "Treasury (Safe)",      value: report.summary.treasury_contract_count,   color: "#6DB874" },
                { label: "Valid for Books",      value: report.summary.valid_for_books_count,     color: "#22c55e" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Attribution bar */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ height: 6, borderRadius: 3, overflow: "hidden", background: "var(--line)", display: "flex", marginBottom: 10 }}>
                {(["attributed", "discovered_only", "unattributed"] as const).map((s) => {
                  const count = s === "attributed" ? report.summary.attributed_agents :
                    s === "discovered_only" ? report.summary.discovered_only_agents :
                    report.summary.unattributed_agents;
                  return (
                    <div
                      key={s}
                      style={{ width: `${(count / report.summary.total_agents) * 100}%`, background: STATUS_META[s].color }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {(["attributed", "discovered_only", "unattributed"] as const).map((s) => {
                  const count = s === "attributed" ? report.summary.attributed_agents :
                    s === "discovered_only" ? report.summary.discovered_only_agents :
                    report.summary.unattributed_agents;
                  const meta = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setFilter(filter === s ? "all" : s)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: filter !== "all" && filter !== s ? 0.5 : 1 }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{meta.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address type legend */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Address Types</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(Object.entries(TYPE_META) as [AddressType, typeof TYPE_META[AddressType]][]).map(([type, meta]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color }} />
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{meta.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SQL migration */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowSql((v) => !v)}
                style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}
              >
                {showSql ? "Hide" : "Show"} SQL Migration
              </button>
              {showSql && (
                <pre style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 16px", fontSize: 11, color: "var(--ink)", marginTop: 8, overflow: "auto" }}>
                  {report.sql_migration}
                </pre>
              )}
            </div>

            {/* Table controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents…"
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 200 }}
              />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{visible.length} agents</span>
            </div>

            {/* Agent table */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Agent", "Status", "Wallets", "Manifest", "Discovered", "EOA", "Contracts", "Valid for Books"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                    <th style={{ padding: "8px 12px", width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((agent, i) => {
                    const sMeta = STATUS_META[agent.attribution_status];
                    const isExpanded = expandedAgent === agent.name;
                    const validForBooks = agent.wallets.filter((w) => w.is_valid_for_books).length;
                    return (
                      <>
                        <tr
                          key={agent.name}
                          style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--bg)", cursor: agent.wallets.length > 0 ? "pointer" : "default" }}
                          onClick={() => agent.wallets.length > 0 && setExpandedAgent(isExpanded ? null : agent.name)}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <Link
                              href={`/registry/${agent.slug}`}
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", textDecoration: "none" }}
                            >
                              {agent.name}
                            </Link>
                            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{agent.ecosystem}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${sMeta.color}18`, color: sMeta.color }}>
                              {sMeta.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: agent.wallets.length > 0 ? "var(--ink)" : "var(--muted)" }}>
                            {agent.wallets.length > 0 ? agent.wallets.length : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: agent.manifest_wallet_count > 0 ? "#22c55e" : "var(--muted)" }}>
                            {agent.manifest_wallet_count > 0 ? agent.manifest_wallet_count : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: agent.discovered_wallet_count > 0 ? "#f59e0b" : "var(--muted)" }}>
                            {agent.discovered_wallet_count > 0 ? agent.discovered_wallet_count : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: agent.eoa_count > 0 ? "#22c55e" : "var(--muted)" }}>
                            {agent.eoa_count > 0 ? agent.eoa_count : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: agent.contract_count > 0 ? "#ef4444" : "var(--muted)" }}>
                            {agent.contract_count > 0 ? agent.contract_count : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: validForBooks > 0 ? "#22c55e" : "var(--muted)" }}>
                            {validForBooks > 0 ? validForBooks : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>
                            {agent.wallets.length > 0 && (isExpanded ? "▲" : "▼")}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${agent.name}-expanded`} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td colSpan={9} style={{ padding: "0 12px 12px 24px", background: "var(--surface)" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                    {["Address", "Type", "Attribution", "Role", "Chain", "Valid for Books"].map((h) => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {agent.wallets.map((w, wi) => {
                                    const tMeta = TYPE_META[w.address_type];
                                    const aMeta = ATTR_META[w.attribution];
                                    const isCritical = w.attribution === "manifest" && (w.address_type === "token_contract" || w.address_type === "smart_contract" || w.address_type === "proxy_contract");
                                    return (
                                      <tr key={wi} style={{ borderBottom: wi < agent.wallets.length - 1 ? "1px solid var(--line)" : "none", background: isCritical ? "#ef444408" : "transparent" }}>
                                        <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                                          {isCritical && <span style={{ color: "#ef4444", marginRight: 4 }}>⚠</span>}
                                          <a
                                            href={`https://basescan.org/address/${w.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: "var(--accent)", textDecoration: "none" }}
                                          >
                                            {shortAddr(w.address)}
                                          </a>
                                        </td>
                                        <td style={{ padding: "6px 10px" }}>
                                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: `${tMeta.color}18`, color: tMeta.color }}>
                                            {tMeta.label}
                                          </span>
                                        </td>
                                        <td style={{ padding: "6px 10px" }}>
                                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: `${aMeta.color}18`, color: aMeta.color }}>
                                            {aMeta.label}
                                          </span>
                                        </td>
                                        <td style={{ padding: "6px 10px", fontSize: 11, color: "var(--muted)" }}>{w.role ?? "—"}</td>
                                        <td style={{ padding: "6px 10px", fontSize: 11, color: "var(--muted)" }}>{w.chain ?? "base"}</td>
                                        <td style={{ padding: "6px 10px", fontSize: 12, color: w.is_valid_for_books ? "#22c55e" : "var(--muted)" }}>
                                          {w.is_valid_for_books ? "✓" : "✗"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
