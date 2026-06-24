import { getB20Token, getB20Activity, buildActivitySummaryFromDb } from "@/lib/b20-db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 120;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatRaw(raw: string, decimals = 18): string {
  if (!raw || raw === "0") return "0";
  try {
    const n = BigInt(raw);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = n / divisor;
    const frac = n % divisor;
    if (frac === BigInt(0)) return whole.toLocaleString();
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
    return `${whole.toLocaleString()}.${fracStr}`;
  } catch {
    return raw;
  }
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export default async function B20TokenProfilePage(
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!ADDRESS_RE.test(address)) notFound();

  const [tokenResult, eventsResult] = await Promise.allSettled([
    getB20Token(address),
    getB20Activity(address, 30),
  ]);

  const token = tokenResult.status === "fulfilled" ? tokenResult.value : null;
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];

  if (!token) {
    return (
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <HomeHeader />
        <div style={{ padding: 40 }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Token not indexed</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              {address} has not been indexed by Zetta yet.
            </div>
            <Link href="/b20" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>← Back to B20 Intelligence</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const activity = buildActivitySummaryFromDb(address, events);
  const agentSlug = token.linked_agent_name
    ? token.linked_agent_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : null;

  const manifestColor =
    token.manifest_status === "attributed" ? "#22c55e" :
    token.manifest_status === "candidate"  ? "#f59e0b" : "#6b7280";

  const manifestLabel =
    token.manifest_status === "attributed" ? "Attributed" :
    token.manifest_status === "candidate"  ? "Awaiting Manifest" : "No Manifest";

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <HomeHeader />

      {/* Nav */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/b20" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← B20 Intelligence</Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{token.symbol ?? shortAddr(token.address)}</span>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>

        {/* Token identity header */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                {token.symbol ?? "—"}
                {token.name && <span style={{ fontSize: 16, fontWeight: 400, color: "var(--muted)", marginLeft: 10 }}>{token.name}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                <a href={`https://basescan.org/address/${token.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                  {token.address}
                </a>
                <span style={{ marginLeft: 8 }}>· Base</span>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 6, background: `${manifestColor}18`, color: manifestColor }}>
              {manifestLabel}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* Identity */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Token Identity</div>
            {[
              { label: "Contract",       value: <a href={`https://basescan.org/address/${token.address}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>{shortAddr(token.address)}</a> },
              { label: "Chain",          value: token.chain },
              { label: "Decimals",       value: token.decimals ?? 18 },
              { label: "Total Supply",   value: formatRaw(token.total_supply ?? "0", token.decimals ?? 18) },
              { label: "Deployed Block", value: token.deployed_block?.toLocaleString() ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Attribution */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Attribution</div>
            {[
              {
                label: "Issuer Wallet",
                value: token.issuer_wallet
                  ? <a href={`https://basescan.org/address/${token.issuer_wallet}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>{shortAddr(token.issuer_wallet)}</a>
                  : "—",
              },
              {
                label: "Owner Wallet",
                value: token.owner_wallet
                  ? <a href={`https://basescan.org/address/${token.owner_wallet}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>{shortAddr(token.owner_wallet)}</a>
                  : "—",
              },
              {
                label: "Linked Agent",
                value: agentSlug && token.linked_agent_name
                  ? <Link href={`/registry/${agentSlug}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{token.linked_agent_name}</Link>
                  : "—",
              },
              { label: "Link Method",    value: token.link_method    },
              { label: "Link Confidence",value: token.link_confidence ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial readiness */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Financial Readiness</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Books Eligible",    value: "No",                                         note: "Token contracts are never books-eligible",              color: "#6b7280" },
              { label: "Issuer Attributed", value: token.manifest_status === "attributed" ? "Yes" : "No", note: token.manifest_status === "attributed" ? "Manifest confirmed" : "Declare in .agent/wallets.json", color: token.manifest_status === "attributed" ? "#22c55e" : "#6b7280" },
              { label: "In Agent GDP",      value: "No",                                         note: "B20 activity excluded from GDP",                        color: "#6b7280" },
              { label: "Token Transfers = Revenue", value: "No",                                  note: "Token transfers are not operating revenue",            color: "#6b7280" },
            ].map((r) => (
              <div key={r.label} style={{ background: "var(--bg)", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.color, marginBottom: 2 }}>{r.value}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.4 }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "Mint Activity", events: activity.recentMints, count: activity.mintCount, vol: activity.mintVolumeRaw, type: "mint" as const },
            { label: "Burn Activity", events: activity.recentBurns, count: activity.burnCount, vol: activity.burnVolumeRaw, type: "burn" as const },
          ].map(({ label, events: evts, count, vol }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{count} events</div>
              </div>
              {evts.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)" }}>No events recorded yet</div>
              ) : evts.slice(0, 5).map((e) => (
                <div key={e.txHash} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)", fontSize: 11 }}>
                  <a href={`https://basescan.org/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)" }}>
                    {e.txHash.slice(0, 10)}…
                  </a>
                  <span style={{ color: "var(--muted)" }}>
                    {e.timestamp ? new Date(e.timestamp).toLocaleDateString() : "—"}
                  </span>
                </div>
              ))}
              {count === 0 && vol !== "0" && (
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                  Volume raw: {vol}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Luca summary */}
        {token.luca_summary && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "3px solid #6DB874", borderRadius: 8, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6DB874", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Luca Read</div>
            <p style={{ fontSize: 13, color: "var(--ink)", margin: 0, lineHeight: 1.65 }}>{token.luca_summary}</p>
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          Last indexed: {new Date(token.last_indexed_at).toLocaleString()}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
