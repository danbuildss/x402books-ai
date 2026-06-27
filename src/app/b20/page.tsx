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

        {/* Live status banner */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderLeft: "3px solid #6DB874", borderRadius: 10,
          padding: "16px 20px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6DB874", marginBottom: 6 }}>
              B20 Intelligence · Live
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
              Zetta indexes B20 tokens on Base, links them to agents and issuers, and monitors mint/burn activity.
              Token activity is tracked and classified — it is <strong style={{ color: "var(--ink)" }}>not operating revenue by default</strong>.
              Attribution still requires a manifest declaration.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            {[
              { label: "Token identity", note: "Name, symbol, deployer, issuer" },
              { label: "Agent linking",  note: "Issuer → manifest → attribution" },
              { label: "Activity scan",  note: "Mint and burn events on Base" },
              { label: "Books gate",     note: "B20 activity excluded from GDP" },
            ].map((item) => (
              <div key={item.label} style={{
                background: "var(--bg)", border: "1px solid var(--line)",
                borderRadius: 7, padding: "8px 12px", minWidth: 140,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.4 }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Tokens indexed",    value: stats.total,            color: "var(--ink)"  },
              { label: "Linked to agent",   value: stats.linked,           color: "#22c55e"     },
              { label: "Attributed",        value: stats.attributed,       color: "#22c55e"     },
              { label: "Awaiting manifest", value: stats.awaiting_manifest, color: "#f59e0b"    },
              { label: "Unlinked",          value: stats.unlinked,         color: "#6b7280"     },
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: 6, padding: "8px 14px",
              }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Token table */}
        {tokens.length > 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}>
              B20 Tokens ({tokens.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Token", "Contract", "Issuer", "Linked Agent", "Manifest", "Last Indexed"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t, i) => {
                    const mMeta = STATUS_META[t.manifest_status] ?? STATUS_META.none;
                    const lMeta = LINK_META[t.link_method] ?? LINK_META.none;
                    return (
                      <tr key={t.address} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                          <a href={`/b20/${t.address}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                            {t.symbol ?? "—"}
                          </a>
                          {t.name && <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 5, fontSize: 11 }}>{t.name}</span>}
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          <a href={`https://basescan.org/address/${t.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "none" }}>
                            {shortAddr(t.address)}
                          </a>
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
                          {t.issuer_wallet ? shortAddr(t.issuer_wallet) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 11 }}>
                          {t.linked_agent_name ? (
                            <span style={{ fontWeight: 600 }}>{t.linked_agent_name}</span>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>
                              {lMeta.label}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${mMeta.color}18`, color: mMeta.color }}>
                            {mMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--muted)" }}>
                          {new Date(t.last_indexed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "24px", marginBottom: 24,
            textAlign: "center", color: "var(--muted)", fontSize: 13,
          }}>
            No B20 tokens indexed yet. Run the indexer from Luca Admin to begin.
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

        {/* Positioning footer */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--ink)" }}>Zetta B20 Intelligence</strong> tracks token issuers, mint/burn activity,
          and agent attribution for B20 assets on Base mainnet.
          Analyse a specific token via the{" "}
          <Link href="/luca#skills" style={{ color: "var(--accent)", textDecoration: "none" }}>
            b20-token-analysis
          </Link>{" "}
          Luca Skill. Token activity is not operating revenue and is excluded from Agent GDP.
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
