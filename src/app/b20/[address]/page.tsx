import { getB20Token, getB20Activity, buildActivitySummaryFromDb } from "@/lib/b20-db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 60;

function explorerBase(chain: string): string {
  return chain === "base-sepolia" ? "https://sepolia.basescan.org" : "https://basescan.org";
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatRaw(raw: string | null, decimals: number | null = 18): string {
  if (!raw || raw === "0") return "0";
  try {
    const n = BigInt(raw);
    const dec = decimals ?? 18;
    const divisor = BigInt(10) ** BigInt(dec);
    const whole = n / divisor;
    const frac = n % divisor;
    if (frac === BigInt(0)) return whole.toLocaleString();
    const fracStr = frac.toString().padStart(dec, "0").slice(0, 4).replace(/0+$/, "");
    return `${whole.toLocaleString()}.${fracStr}`;
  } catch {
    return raw;
  }
}

function formatSupplyShort(raw: string | null, decimals: number | null): string {
  if (!raw || raw === "0") return "0";
  try {
    const n = BigInt(raw);
    const dec = decimals ?? 18;
    const divisor = BigInt(10) ** BigInt(dec);
    const whole = Number(n / divisor);
    if (whole >= 1_000_000_000) return `${(whole / 1_000_000_000).toFixed(2)}B`;
    if (whole >= 1_000_000) return `${(whole / 1_000_000).toFixed(2)}M`;
    if (whole >= 1_000) return `${(whole / 1_000).toFixed(2)}K`;
    return whole.toLocaleString();
  } catch {
    return "—";
  }
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const ATTRIBUTION_META = {
  attributed: { label: "Attributed",   color: "#4AE8A0" },
  candidate:  { label: "Candidate",    color: "#F4B942" },
  none:       { label: "Unattributed", color: "var(--muted)" },
} as const;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default async function B20TokenProfilePage(
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!ADDRESS_RE.test(address)) notFound();

  const [tokenResult, eventsResult] = await Promise.allSettled([
    getB20Token(address),
    getB20Activity(address, 50),
  ]);

  const token = tokenResult.status === "fulfilled" ? tokenResult.value : null;
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];

  if (!token) {
    return (
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <HomeHeader />
        <div style={{ maxWidth: 700, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Token not indexed</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
            {address}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>
            This address has not been indexed by Zetta yet. Tokens are indexed automatically as they are discovered via the B20 factory.
          </div>
          <Link href="/b20" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>← B20 Ecosystem</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const isTestnet = token.chain === "base-sepolia";
  const explorer = explorerBase(token.chain);
  const activity = buildActivitySummaryFromDb(address, events);
  const agentSlug = token.linked_agent_name
    ? token.linked_agent_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : null;

  const attrMeta = ATTRIBUTION_META[token.manifest_status as keyof typeof ATTRIBUTION_META] ?? ATTRIBUTION_META.none;

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <HomeHeader />

      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/b20" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 12 }}>B20 Ecosystem</Link>
        <span style={{ color: "var(--line)", fontSize: 12 }}>/</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)" }}>
          {token.symbol ?? shortAddr(token.address)}
        </span>
        {isTestnet && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: "rgba(244,185,66,0.12)", color: "#F4B942", marginLeft: 4 }}>
            TESTNET
          </span>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>

        {/* Testnet warning */}
        {isTestnet && (
          <div style={{
            background: "rgba(244,185,66,0.08)", border: "1px solid #F4B942",
            borderLeft: "3px solid #F4B942", borderRadius: 8,
            padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
          }}>
            <strong style={{ color: "#F4B942" }}>TESTNET · BASE SEPOLIA · DEMO DATA ONLY.</strong>{" "}
            This token is not production financial activity and does not enter Agent Books, Agent GDP, or production B20 intelligence.
          </div>
        )}

        {/* Token header */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 4 }}>
                {token.symbol ?? "—"}
                {token.name && (
                  <span style={{ fontSize: 17, fontWeight: 400, color: "var(--muted)", marginLeft: 12 }}>{token.name}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <a href={`${explorer}/address/${token.address}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
                  {token.address}
                </a>
                <span style={{ color: "var(--line)" }}>·</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Base{isTestnet ? " Sepolia" : ""}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 6, background: `${attrMeta.color}18`, color: attrMeta.color }}>
                {attrMeta.label}
              </span>
              {token.total_supply && (
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>
                  {formatSupplyShort(token.total_supply, token.decimals)} supply
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Supply",  value: formatRaw(token.total_supply, token.decimals), mono: true },
            { label: "Mint Events",   value: activity.mintCount.toString(), color: "#4AE8A0", mono: true },
            { label: "Burn Events",   value: activity.burnCount.toString(), color: "#F46060", mono: true },
            { label: "Decimals",      value: (token.decimals ?? 18).toString(), mono: true },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 16px", minWidth: 100 }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? "var(--ink)", fontFamily: s.mono ? "var(--font-mono)" : "inherit" }}>{s.value || "0"}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* Token Identity */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Token Identity</div>
            <Row label="Contract" value={
              <a href={`${explorer}/address/${token.address}`} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {shortAddr(token.address)}
              </a>
            } />
            <Row label="Chain" value={isTestnet ? "Base Sepolia (testnet)" : "Base"} />
            <Row label="Decimals" value={token.decimals ?? 18} />
            <Row label="Total Supply" value={
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {formatRaw(token.total_supply, token.decimals)}
              </span>
            } />
            <Row label="Deployed Block" value={token.deployed_block?.toLocaleString() ?? "—"} />
            {token.deployment_tx && (
              <Row label="Deploy Tx" value={
                <a href={`${explorer}/tx/${token.deployment_tx}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {shortAddr(token.deployment_tx)}
                </a>
              } />
            )}
          </div>

          {/* Attribution */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Attribution</div>
            <Row label="Issuer Wallet" value={
              token.issuer_wallet ? (
                <a href={`${explorer}/address/${token.issuer_wallet}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {shortAddr(token.issuer_wallet)}
                </a>
              ) : "—"
            } />
            <Row label="Owner Wallet" value={
              token.owner_wallet ? (
                <a href={`${explorer}/address/${token.owner_wallet}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {shortAddr(token.owner_wallet)}
                </a>
              ) : "—"
            } />
            <Row label="Linked Agent" value={
              agentSlug && token.linked_agent_name ? (
                <Link href={`/registry/${agentSlug}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                  {token.linked_agent_name}
                </Link>
              ) : <span style={{ color: "var(--muted)" }}>—</span>
            } />
            <Row label="Link Method" value={token.link_method ?? "—"} />
            <Row label="Confidence" value={token.link_confidence ?? "—"} />
            <Row label="Status" value={
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${attrMeta.color}18`, color: attrMeta.color }}>
                {attrMeta.label}
              </span>
            } />
          </div>
        </div>

        {/* Luca read */}
        {token.luca_summary && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "3px solid #4AE8A0", borderRadius: 8, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4AE8A0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Luca Read</div>
            <p style={{ fontSize: 13, color: "var(--ink)", margin: 0, lineHeight: 1.7 }}>{token.luca_summary}</p>
          </div>
        )}

        {/* Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "Mint Activity", evts: activity.recentMints, count: activity.mintCount, typeColor: "#4AE8A0" },
            { label: "Burn Activity", evts: activity.recentBurns, count: activity.burnCount, typeColor: "#F46060" },
          ].map(({ label, evts, count, typeColor }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: typeColor, fontWeight: 700 }}>{count}</div>
              </div>
              {evts.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)" }}>No events recorded yet</div>
              ) : (
                evts.map((e) => (
                  <div key={e.txHash} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--line)", fontSize: 11, alignItems: "center" }}>
                    <a href={`${explorer}/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.txHash.slice(0, 12)}…
                    </a>
                    <span style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      {formatRaw(e.amountRaw, token.decimals)}
                    </span>
                    <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {e.timestamp ? new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

        {/* Data integrity */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>Data Integrity: </span>
            Token contracts are never books-eligible ·
            Token transfers are not operating revenue ·
            B20 activity is excluded from Agent GDP ·
            Attribution requires manifest declaration
          </div>
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          Last indexed: {new Date(token.last_indexed_at).toLocaleString()}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
