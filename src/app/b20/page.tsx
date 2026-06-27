import { getB20Tokens, getB20Stats } from "@/lib/b20-db";
import type { B20TokenRow } from "@/lib/b20-db";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 60;

const STATUS_META: Record<string, { label: string; color: string }> = {
  attributed: { label: "Attributed",        color: "#22c55e" },
  candidate:  { label: "Candidate",         color: "#f59e0b" },
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

function explorerBase(chain: string): string {
  return chain === "base-sepolia"
    ? "https://sepolia.basescan.org"
    : "https://basescan.org";
}

export default async function B20Page(
  { searchParams }: { searchParams: Promise<{ chain?: string }> },
) {
  const sp = await searchParams;
  const chain = sp.chain === "base-sepolia" ? "base-sepolia" : "base";
  const isTestnet = chain !== "base";

  const [tokensResult, statsResult] = await Promise.allSettled([
    getB20Tokens(chain),
    getB20Stats(chain),
  ]);

  const tokens: B20TokenRow[] = tokensResult.status === "fulfilled" ? tokensResult.value : [];
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const explorer = explorerBase(chain);

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
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 640 }}>
            {isTestnet
              ? "B20 Testnet Demo — proof that Zetta can detect, index, and explain B20 token activity before mainnet tokens are available."
              : "B20 Intelligence for Base mainnet tokens. Zetta indexes B20 tokens, connects them to agents and issuers, monitors activity, and checks financial readiness."}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* Mainnet / Testnet toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[
            { label: "Mainnet",        href: "/b20",                   active: !isTestnet },
            { label: "Testnet (Demo)", href: "/b20?chain=base-sepolia", active: isTestnet  },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                background: tab.active ? "var(--accent)" : "var(--surface)",
                color: tab.active ? "#fff" : "var(--muted)",
                border: `1px solid ${tab.active ? "var(--accent)" : "var(--line)"}`,
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Testnet warning banner */}
        {isTestnet && (
          <div style={{
            background: "#78350f18", border: "1px solid #d97706",
            borderLeft: "3px solid #d97706", borderRadius: 8,
            padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>⚠</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>
                TESTNET — BASE SEPOLIA · DEMO DATA ONLY
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                Testnet data is for demo/proof only. It is not production financial activity.
                Testnet tokens do not enter Agent Books, Agent GDP, or production B20 intelligence.
                Mainnet is the default public view.
              </p>
            </div>
          </div>
        )}

        {/* Live status banner */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderLeft: `3px solid ${isTestnet ? "#d97706" : "#6DB874"}`, borderRadius: 10,
          padding: "16px 20px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: isTestnet ? "#d97706" : "#6DB874", marginBottom: 6 }}>
              {isTestnet ? "B20 Intelligence · Testnet Demo" : "B20 Intelligence · Mainnet Live"}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
              Zetta indexes B20 tokens on {isTestnet ? "Base Sepolia (testnet)" : "Base mainnet"}, links them to agents and issuers, and monitors mint/burn activity.
              Token activity is tracked and classified — it is <strong style={{ color: "var(--ink)" }}>not operating revenue by default</strong>.
              Attribution still requires a manifest declaration.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            {[
              { label: "Token identity", note: "Name, symbol, deployer, issuer" },
              { label: "Agent linking",  note: "Issuer → manifest → attribution" },
              { label: "Activity scan",  note: "Mint and burn events on Base"    },
              { label: "Books gate",     note: "B20 activity excluded from GDP"  },
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
              { label: "Tokens indexed",    value: stats.total,             color: "var(--ink)"  },
              { label: "Linked to agent",   value: stats.linked,            color: "#22c55e"     },
              { label: "Attributed",        value: stats.attributed,        color: "#22c55e"     },
              { label: "Awaiting manifest", value: stats.awaiting_manifest, color: "#f59e0b"     },
              { label: "Unlinked",          value: stats.unlinked,          color: "#6b7280"     },
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
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
              <span>B20 Tokens ({tokens.length})</span>
              {isTestnet && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#d9770620", color: "#d97706" }}>
                  TESTNET · BASE SEPOLIA
                </span>
              )}
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
                            {t.symbol ?? shortAddr(t.address)}
                          </a>
                          {t.name && <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 5, fontSize: 11 }}>{t.name}</span>}
                          {!t.symbol && !t.name && isTestnet && (
                            <span style={{ fontWeight: 400, color: "#d97706", marginLeft: 5, fontSize: 10 }}>no metadata</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          <a href={`${explorer}/address/${t.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "none" }}>
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
                            <span style={{ color: "var(--muted)" }}>{lMeta.label}</span>
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
            borderRadius: 8, padding: "32px 24px", marginBottom: 24,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {isTestnet ? "No testnet tokens indexed yet." : "No B20 tokens indexed yet."}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              {isTestnet
                ? "Use mode=single with chain=base-sepolia in Luca Admin to index the testnet QA fixture."
                : "Run the indexer from Luca Admin once a confirmed Base mainnet B20 token is available."}
            </div>
          </div>
        )}

        {/* Data integrity callout */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "12px 16px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>Data Integrity: </span>
            Token contracts are never books-eligible ·
            Token transfers are not operating revenue ·
            Issuer wallets require manifest declaration for attribution ·
            B20 activity is excluded from Agent GDP
            {isTestnet && (
              <> · <span style={{ color: "#d97706", fontWeight: 600 }}>Testnet data excluded from all production stats</span></>
            )}
          </div>
        </div>

        {/* Positioning footer */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
          {isTestnet ? (
            <>
              <strong style={{ color: "var(--ink)" }}>Zetta B20 Testnet Demo</strong> — proof that Zetta can detect, index, and explain B20 token activity before Base mainnet B20 tokens are available.
              Switch to{" "}
              <Link href="/b20" style={{ color: "var(--accent)", textDecoration: "none" }}>Mainnet</Link>{" "}
              for production data. Analyse a specific token via the{" "}
              <Link href="/luca#skills" style={{ color: "var(--accent)", textDecoration: "none" }}>b20-token-analysis</Link>{" "}
              Luca Skill.
            </>
          ) : (
            <>
              <strong style={{ color: "var(--ink)" }}>Zetta B20 Intelligence</strong> tracks token issuers, mint/burn activity,
              and agent attribution for B20 assets on Base mainnet.
              Analyse a specific token via the{" "}
              <Link href="/luca#skills" style={{ color: "var(--accent)", textDecoration: "none" }}>b20-token-analysis</Link>{" "}
              Luca Skill. Token activity is not operating revenue and is excluded from Agent GDP.
              View{" "}
              <Link href="/b20?chain=base-sepolia" style={{ color: "var(--accent)", textDecoration: "none" }}>Testnet Demo</Link>.
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
