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

type DetectResult = {
  address: string;
  agent_name: string;
  passes_prefix: boolean;
  confirmed_on_chain: boolean;
  name: string | null;
  symbol: string | null;
  issuer_wallet: string | null;
  recommendation: string;
};

type DetectReport = {
  ok: boolean;
  mode: "detect_from_registry";
  total_with_token_address: number;
  b20_prefix_matches: number;
  confirmed_b20: number;
  results: DetectResult[];
  non_b20_addresses: { agent_name: string; address: string }[];
  note: string;
  generated_at: string;
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
  attributed: "#4AE8A0",
  candidate:  "#F4B942",
  none:       "var(--muted)",
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

  const [mode, setMode] = useState<"detect_from_registry" | "from_registry" | "single" | "activity_only">("detect_from_registry");
  const [chain, setChain] = useState<"base" | "base-sepolia">("base");
  const [address, setAddress] = useState("");
  const [includeActivity, setIncludeActivity] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<IndexReport | null>(null);
  const [detectReport, setDetectReport] = useState<DetectReport | null>(null);

  async function runIndexer() {
    setLoading(true);
    setError("");
    setReport(null);
    setDetectReport(null);

    const body: Record<string, unknown> = { mode, chain, includeActivity, dryRun };
    if (mode === "single" || mode === "activity_only") body.address = address.trim().toLowerCase();

    try {
      const res = await fetch("/api/admin/index-b20", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!json.ok) { setError((json.error as string | undefined) ?? "Indexing failed"); return; }
      if (json.mode === "detect_from_registry") {
        setDetectReport(json as unknown as DetectReport);
      } else {
        setReport(json as unknown as IndexReport);
      }
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
        <div style={{ background: "#4AE8A010", border: "1px solid #4AE8A040", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "var(--ink)" }}>
          <strong>Data integrity:</strong> Token contracts are never books-eligible · Token transfers are not operating revenue ·
          Issuer wallets are not attributed unless manifest-confirmed · B20 activity is excluded from Agent GDP
        </div>

        {/* Indexing gate rule */}
        <div style={{ background: "#F4B94210", border: "1px solid #F4B94240", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--ink)" }}>
          <strong>Indexing gate:</strong> Detect mode suggests candidates — it never indexes.
          To activate indexing, set <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg)", padding: "1px 4px", borderRadius: 3 }}>isB20Token: true</code> in <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg)", padding: "1px 4px", borderRadius: 3 }}>src/app/registry/data.ts</code> only for confirmed <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg)", padding: "1px 4px", borderRadius: 3 }}>0xB200…</code> tokens.
          Normal registry tokens ($LUCA, $BNKR, $VIRTUAL, etc.) must never be flagged — they are standard ERC-20s, not B20 tokens.
        </div>

        {/* Sourcing checklist */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>B20 Token Sourcing Guide</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
            Guide only — no automatic activation at any step. Admin must complete all three steps before indexing.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              {
                step: "1",
                label: "Source",
                color: "#4AE8A0",
                items: [
                  "Collect address from B20 launch announcement",
                  "Or from partner team / agent builder directly",
                  "Or from registry submission (b20_token_address field)",
                ],
              },
              {
                step: "2",
                label: "Verify",
                color: "#F4B942",
                items: [
                  "Confirm address starts with 0xB200 (not 0xb2 or anything else)",
                  "Open on Basescan — contract must exist on Base mainnet",
                  "Run detect_from_registry — must show confirmed_on_chain: true",
                ],
              },
              {
                step: "3",
                label: "Activate",
                color: "#4AE8A0",
                items: [
                  "Set isB20Token: true in src/app/registry/data.ts for that agent only",
                  "Deploy the change to production",
                  "Run from_registry dry run — confirm token appears",
                  "Run from_registry live — indexed, no DB writes until this step",
                ],
              },
            ].map((s) => (
              <div key={s.step} style={{ flex: 1, minWidth: 200, background: "var(--bg)", border: "1px solid var(--line)", borderTop: `3px solid ${s.color}`, borderRadius: 7, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.color, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {s.step}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>{s.label}</span>
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                  {s.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                ["detect_from_registry", "Detect B20 (safe scan)"],
                ["from_registry",        "Index from Registry"],
                ["single",               "Single Token"],
                ["activity_only",        "Activity Only"],
              ] as const).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid var(--line)",
                  background: mode === m ? "#4AE8A0" : "var(--bg)",
                  color: mode === m ? "#fff" : "var(--ink)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>
            {mode === "detect_from_registry" && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                Scans all registry tokenAddresses for the 0xB200 prefix, confirms on-chain via Alchemy.
                Read-only — does not write to DB. Review results before running "Index from Registry".
              </div>
            )}
          </div>

          {/* Chain selector — always visible */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Chain</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                ["base",         "Base Mainnet"],
                ["base-sepolia", "Base Sepolia (Testnet)"],
              ] as const).map(([c, label]) => (
                <button key={c} onClick={() => setChain(c)} style={{
                  padding: "6px 14px", borderRadius: 6, border: `1px solid ${c === "base-sepolia" ? "#F4B94260" : "var(--line)"}`,
                  background: chain === c ? (c === "base-sepolia" ? "#F4B942" : "#4AE8A0") : "var(--bg)",
                  color: chain === c ? "#fff" : "var(--ink)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>
            {chain === "base-sepolia" && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#F4B94210", border: "1px solid #F4B94240", borderRadius: 6, fontSize: 11, color: "#F4B942", fontWeight: 600 }}>
                ⚠ Testnet mode — data is for proof/demo only. Will not appear on public /b20 page. Does not enter production stats, Agent Books, or Agent GDP.
              </div>
            )}
          </div>

          {(mode === "single" || mode === "activity_only") && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Token Address</div>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder={chain === "base-sepolia" ? "0xB200… (Base Sepolia testnet address)" : "0x..."}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 340, fontFamily: "var(--font-mono)" }} />
            </div>
          )}

          {mode !== "activity_only" && mode !== "detect_from_registry" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button onClick={() => setIncludeActivity((v) => !v)} style={{
                width: 36, height: 20, borderRadius: 10,
                background: includeActivity ? "#4AE8A0" : "var(--line)",
                border: "none", cursor: "pointer", position: "relative",
              }}>
                <span style={{ position: "absolute", top: 3, left: includeActivity ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
              </button>
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>Include Activity Scan</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Fetches mint/burn events (slower)</span>
            </div>
          )}

          {mode !== "detect_from_registry" && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setDryRun((v) => !v)} style={{
              width: 36, height: 20, borderRadius: 10,
              background: dryRun ? "#4AE8A0" : "var(--line)",
              border: "none", cursor: "pointer", position: "relative",
            }}>
              <span style={{ position: "absolute", top: 3, left: dryRun ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
            </button>
            <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>Dry Run</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{dryRun ? "Preview only — no DB writes" : "Will write to DB"}</span>
          </div>}

          <button onClick={runIndexer} disabled={loading} style={{
            padding: "8px 20px", borderRadius: 6, background: "#4AE8A0", color: "#fff",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600, fontSize: 13, opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "Running…" : mode === "detect_from_registry" ? "Detect B20 Tokens" : "Run B20 Indexer"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#F4606018", border: "1px solid #F46060", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#F46060", fontSize: 13 }}>
            {error}
          </div>
        )}

        {detectReport && (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
              Detect scan completed — {new Date(detectReport.generated_at).toLocaleString()}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "With token address", value: detectReport.total_with_token_address, color: "var(--ink)"  },
                { label: "0xB200 prefix",      value: detectReport.b20_prefix_matches,       color: "#4AE8A0"    },
                { label: "Confirmed on-chain", value: detectReport.confirmed_b20,            color: "#4AE8A0"    },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {detectReport.results.length > 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}>
                  B20 Candidates ({detectReport.results.length})
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Agent", "Token Address", "Symbol/Name", "Confirmed", "Issuer", "Recommendation"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detectReport.results.map((r, i) => (
                        <tr key={r.address} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.agent_name}</td>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                            <a href={`https://basescan.org/address/${r.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                              {shortAddr(r.address)}
                            </a>
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 11 }}>
                            {r.symbol ?? "—"}{r.name ? ` · ${r.name}` : ""}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: r.confirmed_on_chain ? "#4AE8A0" : "#F4B942" }}>
                              {r.confirmed_on_chain ? "Yes" : "Unconfirmed"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
                            {r.issuer_wallet ? shortAddr(r.issuer_wallet) : "—"}
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--muted)", maxWidth: 280 }}>{r.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px", marginBottom: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No registry agents have a tokenAddress starting with 0xB200. B20 mainnet may not have launched yet, or tokens are not yet in the registry.
              </div>
            )}

            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "10px 14px", fontSize: 11, color: "var(--muted)" }}>
              {detectReport.note}
            </div>
          </>
        )}

        {report && (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
              {report.dry_run && <span style={{ fontWeight: 700, color: "#F4B942", marginRight: 8 }}>[DRY RUN]</span>}
              {Boolean((report as unknown as Record<string, unknown>).is_testnet) && <span style={{ fontWeight: 700, color: "#F4B942", marginRight: 8 }}>[TESTNET · BASE SEPOLIA]</span>}
              Generated {new Date(report.generated_at).toLocaleString()}
            </div>

            {/* Summary */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "Discovered",       value: report.summary.tokens_discovered, color: "var(--ink)"  },
                { label: "Indexed",          value: report.summary.tokens_indexed,    color: "#4AE8A0"     },
                { label: "Attributed",       value: report.summary.attributed,        color: "#4AE8A0"     },
                { label: "Candidate",        value: report.summary.candidates,        color: "#F4B942"     },
                { label: "Awaiting Manifest",value: report.summary.awaiting_manifest, color: "#F4B942"     },
                { label: "Errors",           value: report.summary.errors,            color: "#F46060"     },
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
                        const statusColor = t.status === "indexed" ? "#4AE8A0" : t.status === "error" ? "#F46060" : "#F4B942";
                        const mColor = STATUS_COLOR[t.manifest_status] ?? "var(--muted)";
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
                              {t.error && <div style={{ fontSize: 10, color: "#F46060", marginTop: 2 }}>{t.error}</div>}
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
