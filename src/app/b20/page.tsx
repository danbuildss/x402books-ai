import { getB20Tokens, getB20Stats } from "@/lib/b20-db";
import type { B20TokenRow } from "@/lib/b20-db";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 120;

const STATUS_META: Record<string, { label: string; color: string }> = {
  attributed: { label: "Attributed",      color: "#22c55e" },
  candidate:  { label: "Candidate",       color: "#f59e0b" },
  none:       { label: "Awaiting Manifest", color: "#6b7280" },
};

const LINK_META: Record<string, { label: string }> = {
  known_token: { label: "Registry Token" },
  manifest:    { label: "Manifest"       },
  erc8004:     { label: "ERC-8004"       },
  admin:       { label: "Admin"          },
  none:        { label: "Unlinked"       },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default async function B20Page() {
  const [tokensResult, statsResult] = await Promise.allSettled([
    getB20Tokens(),
    getB20Stats(),
  ]);

  const tokens: B20TokenRow[] = tokensResult.status === "fulfilled" ? tokensResult.value : [];
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <HomeHeader />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Zetta Intelligence
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 6 }}>B20 Token Intelligence</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 600 }}>
            Zetta indexes B20 tokens, connects them to agents and issuers, monitors activity, and checks financial readiness.
            Token transfers are not revenue. Token contracts are not operator wallets.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Tokens Indexed",   value: stats.total,            color: "var(--ink)" },
              { label: "Linked to Agents", value: stats.linked,           color: "#6DB874"    },
              { label: "Attributed",       value: stats.attributed,       color: "#22c55e"    },
              { label: "Awaiting Manifest",value: stats.awaiting_manifest, color: "#f59e0b"   },
              { label: "Unlinked",         value: stats.unlinked,         color: "#6b7280"    },
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: 8, padding: "12px 18px", minWidth: 120,
              }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data integrity callout */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "12px 16px", marginBottom: 24,
          display: "flex", gap: 24, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>Data Integrity: </span>
            Token contracts are never books-eligible ·
            Token transfers are not operating revenue ·
            Issuer wallets require manifest declaration for attribution ·
            B20 activity is excluded from Agent GDP
          </div>
        </div>

        {/* Empty state */}
        {tokens.length === 0 && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No tokens indexed yet</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Run the B20 indexer to discover tokens linked to registered agents.
            </div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)", background: "var(--bg)", padding: "8px 14px", borderRadius: 6, display: "inline-block" }}>
              POST /api/admin/index-b20 {"{"} mode: &quot;from_registry&quot;, dryRun: true {"}"}
            </div>
          </div>
        )}

        {/* Token table */}
        {tokens.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}>
              B20 Tokens ({tokens.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Token", "Contract", "Issuer", "Linked Agent", "Link Method", "Manifest Status", "Books", "Profile"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t, i) => {
                    const sm = STATUS_META[t.manifest_status] ?? STATUS_META.none;
                    const lm = LINK_META[t.link_method] ?? LINK_META.none;
                    return (
                      <tr key={t.address} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                          {t.symbol ?? "—"}
                          {t.name && <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6, fontSize: 11 }}>{t.name}</span>}
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          <a href={`https://basescan.org/address/${t.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                            {shortAddr(t.address)}
                          </a>
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
                          {t.issuer_wallet ? (
                            <a href={`https://basescan.org/address/${t.issuer_wallet}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                              {shortAddr(t.issuer_wallet)}
                            </a>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {t.linked_agent_name ? (
                            <Link href={`/registry/${t.linked_agent_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                              {t.linked_agent_name}
                            </Link>
                          ) : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--muted)" }}>
                          {lm.label}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${sm.color}18`, color: sm.color }}>
                            {sm.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                          No
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <Link href={`/b20/${t.address}`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Positioning footer */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--ink)" }}>Zetta B20 Intelligence</strong> tracks token issuers, treasury activity,
          and financial readiness for B20 assets on Base. Index a token at{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "var(--surface)", padding: "1px 5px", borderRadius: 3 }}>
            POST /api/admin/index-b20
          </code>.
          Analyse a token via the{" "}
          <Link href="/luca-admin" style={{ color: "var(--accent)", textDecoration: "none" }}>
            b20-token-analysis
          </Link>{" "}
          Luca Skill.
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
