import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { LedgerRow, LedgerCard } from "@/components/ui/ledger";
import { EcoBadge, StatusBadge } from "@/components/ui/badge";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getGDPHistory } from "@/lib/gdp-history";
import { getRegistryAgents } from "@/lib/registry-db";
import { agentHealthScore } from "@/lib/agent-health-score";
import { scoreAgent } from "@/lib/verification-scorer";
import { TIER_LABELS } from "@/lib/verification-scorer";
import { AGENTS } from "@/app/registry/data";
import { LeaderboardTable } from "./leaderboard-table";
import type { AwaitingManifestEntry } from "@/lib/agent-gdp";
import type { GDPSnapshot } from "@/lib/gdp-history";
import { BANKR_ONLY, FOCUS_ECOSYSTEM } from "@/lib/focus";

export const revalidate = 3600;

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function netColor(n: number): string {
  if (n > 0) return "#4AE8A0";
  if (n < 0) return "#F46060";
  return "var(--muted)";
}

// ── GDP Trend Chart (server-rendered SVG) ────────────────────────────────────

type TrendField = "total_revenue_usd" | "total_expenses_usd" | "total_net_income_usd";

function GDPSparkline({
  snapshots,
  field,
  color,
  width = 260,
  height = 48,
}: {
  snapshots: GDPSnapshot[];
  field: TrendField;
  color: string;
  width?: number;
  height?: number;
}) {
  if (snapshots.length < 2) return null;
  const values = snapshots.map((s) => s[field]);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const range  = max - min || 1;
  const PAD    = 4;
  const pts    = snapshots.map((s, i) => {
    const x = PAD + (i / (snapshots.length - 1)) * (width - PAD * 2);
    const y = height - PAD - ((s[field] - min) / range) * (height - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const first = values[0], last = values[values.length - 1];
  const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = last >= first;
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ display: "block", overflow: "visible" }}
      >
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* End dot */}
        <circle
          cx={pts[pts.length - 1].split(",")[0]}
          cy={pts[pts.length - 1].split(",")[1]}
          r="3"
          fill={color}
        />
      </svg>
      <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: isUp ? "var(--accent)" : "#F46060", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
        {isUp ? "↑" : "↓"} {Math.abs(pctChange).toFixed(1)}%
        <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>
          across {snapshots.length} snapshots
        </span>
      </p>
    </div>
  );
}

function GDPTrendSection({ snapshots }: { snapshots: GDPSnapshot[] }) {
  if (snapshots.length < 2) return null;
  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.snapshotted_at).getTime() - new Date(b.snapshotted_at).getTime(),
  );
  const oldest = new Date(ordered[0].snapshotted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const newest = new Date(ordered[ordered.length - 1].snapshotted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div style={{
      marginBottom: 24,
      padding: "16px 20px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: 8,
    }}>
      <div className="tla-section-label" style={{ marginBottom: 14 }}>
        Agent GDP Trend · {oldest} → {newest}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        {([
          { label: "Revenue",    field: "total_revenue_usd"    as TrendField, color: "#4AE8A0" },
          { label: "Expenses",   field: "total_expenses_usd"   as TrendField, color: "#F46060" },
          { label: "Net Income", field: "total_net_income_usd" as TrendField, color: "#5B9EF4" },
        ]).map(({ label, field, color }) => (
          <div key={label}>
            <p style={{ margin: "0 0 8px", fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
            <p style={{ margin: "0 0 6px", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9rem", color }}>
              {fmtUSD(ordered[ordered.length - 1][field])}
            </p>
            <GDPSparkline snapshots={ordered} field={field} color={color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function LeaderboardPage() {
  let gdp = null;
  let gdpFailed = false;
  try {
    gdp = await getAgentGDP();
  } catch {
    gdpFailed = true;
    // renders empty state
  }

  const [historyResult, registryResult] = await Promise.allSettled([
    Promise.race([
      getGDPHistory(90),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]),
    getRegistryAgents().catch(() => ({ agents: AGENTS })),
  ]);

  const history = historyResult.status === "fulfilled" ? historyResult.value as GDPSnapshot[] : [];
  const registryAgents = registryResult.status === "fulfilled"
    ? (registryResult.value as { agents: typeof AGENTS }).agents
    : AGENTS;

  // Build slug → verification score map
  const vscoreMap = new Map<string, { total: number; tier: string }>();
  for (const a of registryAgents) {
    const slug = toSlug(a.name);
    const vs = scoreAgent(a, false);
    vscoreMap.set(slug, { total: vs.total, tier: TIER_LABELS[vs.tier] });
  }

  // Scope lock: leaderboard rows show only focus-ecosystem agents
  // (aggregate GDP stats above stay economy-wide this sprint).
  const agents = (gdp?.all_attributed ?? []).filter(
    (a) => !BANKR_ONLY || a.ecosystem === FOCUS_ECOSYSTEM,
  );
  const hasData = agents.length > 0;
  const awaitingManifest = (gdp?.awaiting_manifest ?? []).filter(
    (a) => !BANKR_ONLY || a.ecosystem === FOCUS_ECOSYSTEM,
  );

  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 1000, margin: "0 auto", padding: "3rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Economic Leaderboard</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="tla-section-label" style={{ marginBottom: 10 }}>Agent Economy · 30 days</div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, lineHeight: 1.15, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", color: "var(--ink-em)" }}>
            Economic Leaderboard
          </h1>
          <p style={{ margin: 0, color: "var(--ink-mid)", fontSize: "0.82rem", maxWidth: 560, lineHeight: 1.65 }}>
            Ranked by 30-day revenue. Only agents with declared wallet manifests are included —{" "}
            {gdp ? `${gdp.attributed_agents} of ${gdp.total_agents} indexed agents are attributed.` : "attribution is the prerequisite."}
          </p>
        </div>

        {/* GDP aggregate — seamless TL-A metric grid */}
        {gdp && (
          <div className="tla-metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 28 }}>
            {[
              { label: "Agent GDP (Revenue)", value: fmtUSD(gdp.total_revenue_usd),       color: "var(--accent)" },
              { label: "Total Expenses",       value: fmtUSD(gdp.total_expenses_usd),      color: "var(--ink-hi)" },
              { label: "Net Income",           value: fmtUSD(gdp.total_net_income_usd),    color: gdp.total_net_income_usd >= 0 ? "var(--accent)" : "var(--negative, #F46060)" },
              { label: "Attributed Agents",    value: String(gdp.attributed_agents),       color: "var(--ink-hi)" },
              { label: "ERC-8004 Indexed",     value: String(gdp.erc8004_agents),          color: "#8B7CF6" },
              { label: "Total Indexed",        value: String(gdp.total_agents),            color: "var(--muted)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="tla-metric-cell">
                <div className="tla-metric-label">{label}</div>
                <div className="tla-metric-value" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Last updated + methodology link */}
        {gdp && (
          <div style={{ margin: "-24px 0 20px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "0.7rem", color: "var(--muted)" }}>
              Last updated{" "}
              {new Date(gdp.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              {" · "}
              <Link href="/methodology" style={{ color: "var(--accent)" }}>How this is calculated →</Link>
            </p>
            <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.55 }}>
              Revenue reflects operating inflows only. Capital injections, bridge transfers, grants, token distributions, and swaps are excluded or quarantined.
            </p>
          </div>
        )}

        {/* GDP Trend */}
        <GDPTrendSection snapshots={history} />

        {/* Attribution gap — shown above the table so the scope is clear upfront */}
        {gdp && gdp.total_agents > gdp.attributed_agents && (
          <div style={{
            marginBottom: 16,
            padding: "12px 16px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--surface-soft)",
            fontSize: "0.78rem",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--ink-em)" }}>Attribution gap: </strong>
            {gdp.total_agents - gdp.attributed_agents} of {gdp.total_agents} indexed agents — including {gdp.erc8004_agents} indexed via ERC-8004 — have not yet declared a wallet manifest and are excluded from financial rankings.
            Their on-chain identity is real and verified. Their finances become readable once they declare wallets.{" "}
            <Link href="/methodology" style={{ color: "var(--accent)" }}>Why attribution is required →</Link>
            {"  "}
            <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
          </div>
        )}

        {/* Table */}
        <LeaderboardTable agents={agents} vscoreMap={vscoreMap} />


        {/* Indexed agents awaiting manifest declaration */}
        {awaitingManifest.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <LedgerCard
              eyebrow="Indexed — Revenue Locked"
              action={
                <Link href="/api#manifest" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>
                  Submit manifest →
                </Link>
              }
            >
              <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                {awaitingManifest.length} agent{awaitingManifest.length !== 1 ? "s" : ""} indexed
                {(gdp?.erc8004_agents ?? 0) > 0 && <> — {gdp!.erc8004_agents} via ERC-8004</>}.
                {" "}Revenue attribution unlocks when they declare a wallet manifest.
              </p>
              {awaitingManifest.map((a: AwaitingManifestEntry, i: number) => {
                const vs = vscoreMap.get(a.slug);
                const scoreColor = vs
                  ? vs.total >= 75 ? "#4AE8A0" : vs.total >= 50 ? "#5B9EF4" : vs.total >= 25 ? "#F4B942" : "var(--muted)"
                  : "var(--muted)";
                return (
                  <LedgerRow
                    key={a.slug}
                    first={i === 0}
                    last={i === awaitingManifest.length - 1}
                    label={
                      <Link href={`/registry/${a.slug}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 700 }}>
                        {a.name}
                      </Link>
                    }
                    badge={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {a.isErc8004 && <StatusBadge variant="erc8004">ERC-8004</StatusBadge>}
                        <EcoBadge ecosystem={a.ecosystem} />
                        <StatusBadge variant="neutral">{a.verificationStatus}</StatusBadge>
                      </span>
                    }
                    value={
                      <Link href={`/registry/${a.slug}#claim`} style={{
                        fontSize: "0.72rem", fontWeight: 600,
                        color: "var(--accent)", textDecoration: "none",
                        padding: "4px 10px", borderRadius: 6,
                        border: "1px solid rgba(74,232,160,0.3)",
                        background: "var(--accent-soft)",
                      }}>Declare →</Link>
                    }
                    detail={
                      vs ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{
                            fontSize: "0.62rem", fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                            background: `color-mix(in srgb, ${scoreColor} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${scoreColor} 28%, transparent)`,
                            color: scoreColor, fontFamily: "var(--font-mono)",
                          }}>{vs.total}</span>
                          <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{vs.tier}</span>
                        </span>
                      ) : <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>
                    }
                  />
                );
              })}
            </LedgerCard>
          </div>
        )}

        {/* GDP failure note */}
        {gdpFailed && (
          <div style={{
            marginTop: 20,
            padding: "12px 16px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--surface-soft)",
            fontSize: "0.78rem",
            color: "var(--muted)",
          }}>
            Economic data temporarily unavailable. Updated hourly.
          </div>
        )}


        {/* Period note */}
        <p style={{ marginTop: 14, fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic" }}>
          All figures represent 30-day on-chain activity from attributed wallets only. Updated hourly. Not financial advice.
        </p>

        {/* Nav */}
        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/registry" className="lp-btn-ghost">← Registry</Link>
          <Link href="/research" className="lp-btn-primary">State of the Agent Economy →</Link>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
