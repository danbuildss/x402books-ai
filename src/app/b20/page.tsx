import { getB20Tokens, getB20Stats, getB20ActivityCounts, getB20RecentActivity } from "@/lib/b20-db";
import type { B20TokenRow } from "@/lib/b20-db";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 60;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function explorerUrl(chain: string, addr: string): string {
  const base = chain === "base-sepolia" ? "https://sepolia.basescan.org" : "https://basescan.org";
  return `${base}/address/${addr}`;
}

function formatSupply(raw: string | null, decimals: number | null): string {
  if (!raw || raw === "0") return "—";
  try {
    const n = BigInt(raw);
    const dec = decimals ?? 18;
    const divisor = BigInt(10) ** BigInt(dec);
    const whole = n / divisor;
    if (whole >= BigInt(1_000_000_000)) return `${(Number(whole) / 1_000_000_000).toFixed(1)}B`;
    if (whole >= BigInt(1_000_000)) return `${(Number(whole) / 1_000_000).toFixed(1)}M`;
    if (whole >= BigInt(1_000)) return `${(Number(whole) / 1_000).toFixed(1)}K`;
    return whole.toLocaleString();
  } catch {
    return "—";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ATTRIBUTION_META: Record<string, { label: string; color: string }> = {
  attributed: { label: "Attributed",  color: "#4AE8A0" },
  candidate:  { label: "Candidate",   color: "#F4B942" },
  none:       { label: "Unattributed", color: "var(--muted)" },
};

export default async function B20Page(
  { searchParams }: { searchParams: Promise<{ chain?: string; q?: string }> },
) {
  const sp = await searchParams;
  const chain = sp.chain === "base-sepolia" ? "base-sepolia" : "base";
  const isTestnet = chain !== "base";
  const query = (sp.q ?? "").toLowerCase().trim();

  const [tokensResult, statsResult, recentResult] = await Promise.allSettled([
    getB20Tokens(chain),
    getB20Stats(chain),
    getB20RecentActivity(chain, 15),
  ]);

  const allTokens: B20TokenRow[] = tokensResult.status === "fulfilled" ? tokensResult.value : [];
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const recentActivity = recentResult.status === "fulfilled" ? recentResult.value : [];

  const activityCounts = await getB20ActivityCounts(allTokens.map((t) => t.address));

  const tokens = query
    ? allTokens.filter((t) =>
        (t.symbol ?? "").toLowerCase().includes(query) ||
        (t.name ?? "").toLowerCase().includes(query) ||
        t.address.toLowerCase().includes(query) ||
        (t.issuer_wallet ?? "").toLowerCase().includes(query),
      )
    : allTokens;

  const explorer = chain === "base-sepolia" ? "https://sepolia.basescan.org" : "https://basescan.org";

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <HomeHeader />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Zetta Intelligence
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 6 }}>B20 Ecosystem</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 560 }}>
              Financial intelligence for every B20 token deployed on Base.
              Zetta watches the factory, indexes every token, and tracks issuer attribution.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 5,
              background: isTestnet ? "rgba(244,185,66,0.12)" : "rgba(74,232,160,0.12)",
              color: isTestnet ? "#F4B942" : "#4AE8A0",
              border: `1px solid ${isTestnet ? "#F4B942" : "#4AE8A0"}`,
              letterSpacing: "0.05em",
            }}>
              {isTestnet ? "BASE SEPOLIA · TESTNET" : "BASE MAINNET · LIVE"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* Testnet warning */}
        {isTestnet && (
          <div style={{
            background: "rgba(244,185,66,0.08)", border: "1px solid #F4B942",
            borderLeft: "3px solid #F4B942", borderRadius: 8,
            padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
          }}>
            <strong style={{ color: "#F4B942" }}>TESTNET — DEMO DATA ONLY.</strong>{" "}
            Testnet tokens are not production financial activity. They do not enter Agent Books, Agent GDP, or production B20 intelligence.
          </div>
        )}

        {/* KPI row */}
        {stats && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Tokens indexed",  value: stats.total,             color: "var(--ink)"    },
              { label: "Attributed",      value: stats.attributed,        color: "#4AE8A0"       },
              { label: "Awaiting manifest", value: stats.awaiting_manifest, color: "#F4B942"     },
              { label: "Unlinked",        value: stats.unlinked,          color: "var(--muted)"  },
              { label: "Attribution rate", value: stats.total > 0 ? `${Math.round((stats.attributed / stats.total) * 100)}%` : "—", color: stats.attributed > 0 ? "#4AE8A0" : "var(--muted)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 16px", minWidth: 100 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: recentActivity.length > 0 ? "1fr 280px" : "1fr", gap: 20, alignItems: "start" }}>
          {/* Token table */}
          <div>
            {/* Search + chain toggle */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
              <form method="GET" style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
                {isTestnet && <input type="hidden" name="chain" value="base-sepolia" />}
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search by symbol, name, or address…"
                  style={{
                    flex: 1, padding: "7px 12px", borderRadius: 6,
                    border: "1px solid var(--line)", background: "var(--bg)",
                    color: "var(--ink)", fontSize: 12,
                  }}
                />
                <button type="submit" style={{
                  padding: "7px 14px", borderRadius: 6, border: "1px solid var(--line)",
                  background: "var(--surface)", color: "var(--muted)", fontSize: 12, cursor: "pointer",
                }}>Search</button>
              </form>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { label: "Mainnet", href: "/b20",                   active: !isTestnet },
                  { label: "Testnet", href: "/b20?chain=base-sepolia", active: isTestnet  },
                ].map((tab) => (
                  <Link key={tab.href} href={tab.href} style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    textDecoration: "none",
                    background: tab.active ? "var(--accent)" : "var(--surface)",
                    color: tab.active ? "#fff" : "var(--muted)",
                    border: `1px solid ${tab.active ? "var(--accent)" : "var(--line)"}`,
                  }}>
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>

            {tokens.length > 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>B20 Tokens</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{tokens.length} indexed</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Token", "Supply", "Issuer", "Mints / Burns", "Attribution", "Indexed"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((t, i) => {
                        const aMeta = ATTRIBUTION_META[t.manifest_status] ?? ATTRIBUTION_META.none;
                        const counts = activityCounts[t.address.toLowerCase()];
                        return (
                          <tr key={t.address} style={{ borderBottom: i < tokens.length - 1 ? "1px solid var(--line)" : "none", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                            <td style={{ padding: "10px 12px" }}>
                              <Link href={`/b20/${t.address}`} style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
                                {t.symbol ?? shortAddr(t.address)}
                              </Link>
                              {t.name && (
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{t.name}</div>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)" }}>
                              {formatSupply(t.total_supply, t.decimals)}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {t.issuer_wallet ? (
                                <a href={explorerUrl(t.chain, t.issuer_wallet)} target="_blank" rel="noopener noreferrer"
                                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", textDecoration: "none" }}>
                                  {shortAddr(t.issuer_wallet)}
                                </a>
                              ) : (
                                <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                              {counts ? (
                                <span>
                                  <span style={{ color: "#4AE8A0" }}>{counts.mints}</span>
                                  <span style={{ color: "var(--muted)" }}> / </span>
                                  <span style={{ color: "#F46060" }}>{counts.burns}</span>
                                </span>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${aMeta.color}18`, color: aMeta.color }}>
                                {aMeta.label}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                              {formatDate(t.last_indexed_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "48px 32px", textAlign: "center" }}>
                {query ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No tokens match &ldquo;{query}&rdquo;</div>
                    <Link href={isTestnet ? "/b20?chain=base-sepolia" : "/b20"} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Clear search</Link>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No B20 tokens indexed yet</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 440, margin: "0 auto", lineHeight: 1.65 }}>
                      B20 is a token standard on Base. Every B20 token is deployed through one factory contract at{" "}
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>0xB20f…</code>.
                      As tokens are deployed and indexed, they will appear here with identity, supply, issuer, and activity data.
                    </div>
                    <div style={{ marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
                      Tokens are indexed automatically by Luca via the B20 factory.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Recent activity feed */}
          {recentActivity.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Recent Activity
              </div>
              <div style={{ padding: "8px 0" }}>
                {recentActivity.map((e, i) => (
                  <div key={`${e.tx_hash}-${i}`} style={{ padding: "7px 14px", borderBottom: i < recentActivity.length - 1 ? "1px solid var(--line)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                      background: e.event_type === "mint" ? "rgba(74,232,160,0.12)" : "rgba(244,96,96,0.12)",
                      color: e.event_type === "mint" ? "#4AE8A0" : "#F46060",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {e.event_type}
                    </span>
                    <Link href={`/b20/${e.token_address}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.token_symbol ?? shortAddr(e.token_address)}
                    </Link>
                    <a href={`${explorer}/tx/${e.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-mono)" }}>
                      {e.tx_hash.slice(0, 8)}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* What is B20 callout */}
        <div style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>What is B20?</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                B20 is a native token standard for Base. Every B20 token is deployed through a singleton factory precompile, making the entire ecosystem observable from a single address.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>What Zetta tracks</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                Token identity (name, symbol, supply), issuer wallet, mint and burn activity, and attribution to known agents and protocols in the Zetta registry.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Data integrity</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                Token transfers are not operating revenue. B20 activity is excluded from Agent GDP. Attribution requires manifest declaration. Token contracts are never books-eligible.
              </div>
            </div>
          </div>
        </div>

      </div>
      <SiteFooter />
    </div>
  );
}
