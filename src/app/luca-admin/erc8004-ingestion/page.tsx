"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type AgentResult = {
  agent_id: string;
  name: string;
  status: "upserted" | "skipped" | "error";
  metadata_ok: boolean;
  wallet_address: string | null;
  wallet_type: string | null;
  manifest_uri: string | null;
  has_did: boolean;
  books_eligible: boolean;
  warnings: string[];
  error?: string;
};

type IngestionSummary = {
  total_discovered: number;
  // 7 coverage KPIs
  metadata_coverage_pct: number;
  did_coverage_pct: number;
  reputation_coverage_pct: number;
  validation_coverage_pct: number;
  manifest_coverage_pct: number;
  books_coverage_pct: number;
  // Raw counts
  metadata_fetched: number;
  agents_with_did: number;
  manifest_uris_found: number;
  wallets_found: number;
  books_eligible_wallets: number;
  token_contracts_found: number;
  agents_upserted: number;
  agents_skipped: number;
  errors: number;
};

type LogsDiagnostic = {
  registry_address: string;
  method: string;
  from_block_input: string;
  total_transfers_found: number;
  pages_fetched: number;
  rpc_errors: Array<{ page: number; error: string }>;
};

type IngestionReport = {
  ok: boolean;
  dry_run: boolean;
  summary: IngestionSummary;
  agents: AgentResult[];
  generated_at: string;
  error?: string;
  diagnostic?: LogsDiagnostic;
  suggestions?: string[];
};

const STATUS_META: Record<AgentResult["status"], { label: string; color: string }> = {
  upserted: { label: "Upserted", color: "#22c55e" },
  skipped:  { label: "Skipped",  color: "#f59e0b" },
  error:    { label: "Error",    color: "#ef4444" },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Erc8004IngestionPage() {
  const [secret, setSecret]     = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);
  const [mode, setMode]         = useState<"contract" | "batch">("contract");
  const [fromBlock, setFromBlock] = useState("0xE4E1C0");
  const [agentIdsText, setAgentIdsText] = useState("");
  const [dryRun, setDryRun]     = useState(true);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [report, setReport]         = useState<IngestionReport | null>(null);
  const [errorDiagnostic, setErrorDiagnostic] = useState<LogsDiagnostic | null>(null);
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([]);

  async function runIngestion() {
    setLoading(true);
    setError("");
    setReport(null);
    setErrorDiagnostic(null);
    setErrorSuggestions([]);

    const body: Record<string, unknown> = { mode, dryRun };
    if (mode === "contract") {
      body.fromBlock = fromBlock || "0xE4E1C0";
    } else {
      body.agentIds = agentIdsText
        .split(/[\n,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      const res = await fetch("/api/admin/ingest-erc8004", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json() as IngestionReport;
      if (!json.ok) {
        setError(json.error ?? "Ingestion failed");
        if (json.diagnostic) setErrorDiagnostic(json.diagnostic);
        if (json.suggestions) setErrorSuggestions(json.suggestions);
        return;
      }
      setReport(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>
          {"← Admin"}
        </Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>ERC-8004 Ingestion</span>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>

        {/* Config panel */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Ingestion Config</div>

          {/* Auth */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Internal Secret</div>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ZETTA_INTERNAL_SECRET"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 260 }}
            />
          </div>

          {/* Mode selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mode</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["contract", "batch"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "1px solid var(--line)",
                    background: mode === m ? "#4AE8A0" : "var(--bg)",
                    color: mode === m ? "#fff" : "var(--ink)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {m === "contract" ? "All Agents (contract scan)" : "Batch (specific IDs)"}
                </button>
              ))}
            </div>
          </div>

          {mode === "contract" && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>From Block (hex)</div>
              <input
                value={fromBlock}
                onChange={(e) => setFromBlock(e.target.value)}
                placeholder="0xE4E1C0"
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 200, fontFamily: "var(--font-mono)" }}
              />
            </div>
          )}

          {mode === "batch" && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agent IDs (one per line or comma-separated)</div>
              <textarea
                value={agentIdsText}
                onChange={(e) => setAgentIdsText(e.target.value)}
                placeholder={"1\n2\n3"}
                rows={4}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: "100%", fontFamily: "var(--font-mono)", resize: "vertical" }}
              />
            </div>
          )}

          {/* Dry run toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setDryRun((v) => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: dryRun ? "#4AE8A0" : "var(--line)",
                border: "none", cursor: "pointer", position: "relative", transition: "background 0.15s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: dryRun ? 18 : 3,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left 0.15s",
              }} />
            </button>
            <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>Dry Run</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{dryRun ? "Report only — no DB writes" : "Will write to DB"}</span>
          </div>

          <button
            onClick={runIngestion}
            disabled={loading}
            style={{
              padding: "8px 20px", borderRadius: 6, background: "#4AE8A0", color: "#fff",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: 13, opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Running…" : "Run Ingestion"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {errorDiagnostic && (
          <div style={{ background: "var(--surface)", border: "1px solid #ef444440", borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Scan Diagnostic</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Registry address",    value: errorDiagnostic.registry_address },
                { label: "Method",              value: errorDiagnostic.method },
                { label: "From block (input)",  value: errorDiagnostic.from_block_input },
                { label: "Transfers found",     value: errorDiagnostic.total_transfers_found },
                { label: "Pages fetched",       value: errorDiagnostic.pages_fetched },
                { label: "RPC errors",          value: errorDiagnostic.rpc_errors.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--bg)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink)", wordBreak: "break-all" }}>{String(value)}</div>
                </div>
              ))}
            </div>
            {errorDiagnostic.rpc_errors.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 4 }}>RPC errors:</div>
                {errorDiagnostic.rpc_errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#ef4444" }}>• Page {e.page}: {e.error}</div>
                ))}
              </div>
            )}
            {errorSuggestions.length > 0 && (
              <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Suggestions:</div>
                {errorSuggestions.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--ink)", marginBottom: 2 }}>• {s}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {report && (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
              {report.dry_run && <span style={{ fontWeight: 700, color: "#f59e0b", marginRight: 8 }}>[DRY RUN]</span>}
              Generated {new Date(report.generated_at).toLocaleString()}
            </div>

            {/* Primary KPI: total indexed */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>ERC-8004 Agents Indexed</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{report.summary.total_discovered}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 400, lineHeight: 1.6 }}>
                ERC-8004 → Discovery → Identity → Reputation → Validation → Attribution → Financial Intelligence
              </div>
            </div>

            {report.summary.total_discovered === 0 && (
              <div style={{ background: "#f59e0b18", border: "1px solid #f59e0b", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f59e0b", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>&#9888; 0 agents discovered.</span>{" "}
                The contract scan may have scanned a block range with no mints.
                Try: (1) set fromBlock closer to deployment block ~15,000,000 (0xE4E1C0), or (2) use batch mode with known agent IDs.
              </div>
            )}

            {/* 7 Coverage KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
              {([
                { label: "Metadata",    pct: report.summary.metadata_coverage_pct,    count: report.summary.metadata_fetched,     color: "#22c55e",  note: "metadata fetched" },
                { label: "DID",         pct: report.summary.did_coverage_pct,         count: report.summary.agents_with_did,      color: "#a855f7",  note: "with DID" },
                { label: "Reputation",  pct: report.summary.reputation_coverage_pct,  count: null,                                color: "#5B9EF4",  note: "Phase 2" },
                { label: "Validation",  pct: report.summary.validation_coverage_pct,  count: null,                                color: "#f59e0b",  note: "Phase 2" },
                { label: "Manifest",    pct: report.summary.manifest_coverage_pct,    count: report.summary.manifest_uris_found,  color: "#4AE8A0",  note: "manifest URIs" },
                { label: "Books",       pct: report.summary.books_coverage_pct,       count: report.summary.books_eligible_wallets, color: "#6b7280", note: "books-eligible" },
              ] as const).map((kpi) => (
                <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label} Coverage</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)" }}>{kpi.pct}%</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    {kpi.count !== null ? `${kpi.count} ${kpi.note}` : kpi.note}
                  </div>
                </div>
              ))}
            </div>

            {/* Op stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "Upserted",        value: report.summary.agents_upserted,    color: "#22c55e" },
                { label: "Skipped",         value: report.summary.agents_skipped,     color: "#f59e0b" },
                { label: "Errors",          value: report.summary.errors,             color: "#ef4444" },
                { label: "Token contracts", value: report.summary.token_contracts_found, color: "#ef4444" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Per-agent table */}
            {report.agents.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}>
                  Agent Results ({report.agents.length})
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Agent ID", "Name", "Status", "DID", "Wallet", "Type", "Manifest URI", "Books Eligible", "Warnings"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.agents.map((agent, i) => {
                        const sMeta = STATUS_META[agent.status];
                        return (
                          <tr key={agent.agent_id} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                            <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{agent.agent_id}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 600 }}>{agent.name}</td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${sMeta.color}18`, color: sMeta.color }}>
                                {sMeta.label}
                              </span>
                              {agent.error && (
                                <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>{agent.error}</div>
                              )}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 11, color: agent.has_did ? "#a855f7" : "var(--muted)" }}>
                              {agent.has_did ? "✓" : "—"}
                            </td>
                            <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                              {agent.wallet_address ? (
                                <a
                                  href={`https://basescan.org/address/${agent.wallet_address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "var(--accent)", textDecoration: "none" }}
                                >
                                  {shortAddr(agent.wallet_address)}
                                </a>
                              ) : <span style={{ color: "var(--muted)" }}>—</span>}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--muted)" }}>
                              {agent.wallet_type ?? "—"}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {agent.manifest_uri ? (
                                <a
                                  href={agent.manifest_uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "var(--accent)", textDecoration: "none" }}
                                  title={agent.manifest_uri}
                                >
                                  {agent.manifest_uri.replace(/^https?:\/\//, "").slice(0, 30)}…
                                </a>
                              ) : <span style={{ color: "var(--muted)" }}>—</span>}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 12, color: agent.books_eligible ? "#22c55e" : "var(--muted)" }}>
                              {agent.books_eligible ? "Yes" : "No"}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--muted)", maxWidth: 200 }}>
                              {agent.warnings.length > 0 ? (
                                <ul style={{ margin: 0, padding: "0 0 0 14px", listStyle: "disc" }}>
                                  {agent.warnings.map((w, wi) => <li key={wi}>{w}</li>)}
                                </ul>
                              ) : <span style={{ color: "#22c55e" }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
