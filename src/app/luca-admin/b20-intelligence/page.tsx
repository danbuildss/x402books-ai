"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TokenResult = {
  address: string;
  name: string | null;
  symbol: string | null;
  issuer_wallet: string | null;
  linked_agent: string | null;
  link_method: string;
  link_confidence: string;
  manifest_status: string;
  activity_events_inserted: number;
  status: "indexed" | "skipped" | "error";
  error?: string;
};

type IndexReport = {
  ok: boolean;
  dry_run: boolean;
  summary: {
    tokens_discovered: number;
    tokens_indexed: number;
    errors: number;
    attributed: number;
    candidates: number;
    awaiting_manifest: number;
    data_integrity_note: string;
  };
  tokens: TokenResult[];
  generated_at: string;
  error?: string;
};

const STATUS_COLOR: Record<string, string> = {
  attributed: "#22c55e",
  candidate:  "#f59e0b",
  none:       "#6b7280",
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function B20IntelligencePage() {
  const [secret, setSecret] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);

  const [mode, setMode] = useState<"from_registry" | "single" | "activity_only">("from_registry");
  const [address, setAddress] = useState("");
  const [includeActivity, setIncludeActivity] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<IndexReport | null>(null);

  async function runIndexer() {
    setLoading(true);
    setError("");
    setReport(null);

    const body: Record<string, unknown> = { mode, includeActivity, dryRun };
    if (mode !== "from_registry") body.address = address.trim().toLowerCase();

    try {
      const res = await fetch("/api/admin/index-b20", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json() as IndexReport;
      if (!json.ok) { setError(json.error ?? "Indexing failed"); return; }
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
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Admin</Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>B20 Intelligence</span>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>

        {/* Data integrity reminder */}
        <div style={{ background: "#6DB87410", border: "1px solid #6DB87440", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--ink)" }}>
          <strong>Data integrity:</strong> Token contracts are never books-eligible · Token transfers are not operating revenue ·
          Issuer wallets are not attributed unless manifest-confirmed · B20 activity is excluded from Agent GDP
        </div>

        {/* Config panel */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>B20 Indexer Config</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Internal Secret</div>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
              placeholder="ZETTA_INTERNAL_SECRET"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 260 }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mode</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                ["from_registry", "From Registry (all agent tokens)"],
                ["single",        "Single Token"],
                ["activity_only", "Activity Only (existing token)"],
              ] as const).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid var(--line)",
                  background: mode === m ? "#6DB874" : "var(--bg)",
                  color: mode === m ? "#fff" : "var(--ink)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(mode === "single" || mode === "activity_only") && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Token Address</div>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 340, fontFamily: "var(--font-mono)" }} />
            </div>
          )}

          {mode !== "activity_only" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button onClick={() => setIncludeActivity((v) => !v)} style={{
                width: 36, height: 20, borderRadius: 10,
                background: includeActivity ? "#6DB874" : "var(--line)",
                border: "none", cursor: "pointer", position: "relative",
              }}>
                <span style={{ position: "absolute", top: 3, left: includeActivity ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
              </button>
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>Include Activity Scan</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Fetches mint/burn events (slower)</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setDryRun((v) => !v)} style={{
              width: 36, height: 20, borderRadius: 10,
              background: dryRun ? "#6DB874" : "var(--line)",
              border: "none", cursor: "pointer", position: "relative",
            }}>
              <span style={{ position: "absolute", top: 3, left: dryRun ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
            </button>
            <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>Dry Run</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{dryRun ? "Preview only — no DB writes" : "Will write to DB"}</span>
          </div>

          <button onClick={runIndexer} disabled={loading} style={{
            padding: "8px 20px", borderRadius: 6, background: "#6DB874", color: "#fff",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600, fontSize: 13, opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "Indexing…" : "Run B20 Indexer"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {report && (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
              {report.dry_run && <span style={{ fontWeight: 700, color: "#f59e0b", marginRight: 8 }}>[DRY RUN]</span>}
              Generated {new Date(report.generated_at).toLocaleString()}
            </div>

            {/* Summary */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "Discovered",       value: report.summary.tokens_discovered, color: "var(--ink)"  },
                { label: "Indexed",          value: report.summary.tokens_indexed,    color: "#22c55e"     },
                { label: "Attributed",       value: report.summary.attributed,        color: "#22c55e"     },
                { label: "Candidate",        value: report.summary.candidates,        color: "#f59e0b"     },
                { label: "Awaiting Manifest",value: report.summary.awaiting_manifest, color: "#f59e0b"     },
                { label: "Errors",           value: report.summary.errors,            color: "#ef4444"     },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 12px", marginBottom: 20, fontSize: 11, color: "var(--muted)" }}>
              {report.summary.data_integrity_note}
            </div>

            {/* Token results */}
            {report.tokens.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}>
                  Token Results ({report.tokens.length})
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Token", "Contract", "Issuer", "Linked Agent", "Method", "Confidence", "Manifest", "Status"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.tokens.map((t, i) => {
                        const statusColor = t.status === "indexed" ? "#22c55e" : t.status === "error" ? "#ef4444" : "#f59e0b";
                        const mColor = STATUS_COLOR[t.manifest_status] ?? "#6b7280";
                        return (
                          <tr key={t.address} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                              {t.symbol ?? "—"}
                              {t.name && <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 5, fontSize: 11 }}>{t.name}</span>}
                            </td>
                            <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                              <a href={`https://basescan.org/address/${t.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                                {shortAddr(t.address)}
                              </a>
                            </td>
                            <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
                              {t.issuer_wallet ? shortAddr(t.issuer_wallet) : "—"}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 11 }}>
                              {t.linked_agent ?? <span style={{ color: "var(--muted)" }}>—</span>}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--muted)" }}>{t.link_method}</td>
                            <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--muted)" }}>{t.link_confidence}</td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${mColor}18`, color: mColor }}>
                                {t.manifest_status}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>
                                {t.status}
                              </span>
                              {t.error && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>{t.error}</div>}
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
