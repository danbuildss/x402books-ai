import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge, EcoBadge } from "@/components/ui/badge";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getGDPHistory } from "@/lib/gdp-history";
import { getRegistryAgents } from "@/lib/registry-db";
import { agentHealthScore, gradeColor } from "@/lib/agent-health-score";
import { scoreAgent } from "@/lib/verification-scorer";
import { TIER_LABELS } from "@/lib/verification-scorer";
import { AGENTS } from "@/app/registry/data";
import type { AgentGDPEntry, AwaitingManifestEntry } from "@/lib/agent-gdp";
import type { GDPSnapshot } from "@/lib/gdp-history";

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
      <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: isUp ? "#4AE8A0" : "#F46060", fontFamily: "monospace", fontWeight: 600 }}>
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
      padding: "18px 20px",
      background: "var(--surface-soft)",
      border: "1px solid var(--line)",
      borderRadius: 10,
    }}>
      <p style={{ margin: "0 0 14px", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
        Agent GDP Trend · {oldest} → {newest}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        {([
          { label: "Revenue",    field: "total_revenue_usd"    as TrendField, color: "#4AE8A0" },
          { label: "Expenses",   field: "total_expenses_usd"   as TrendField, color: "#F46060" },
          { label: "Net Income", field: "total_net_income_usd" as TrendField, color: "#5B9EF4" },
        ]).map(({ label, field, color }) => (
          <div key={label}>
            <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 500 }}>{label}</p>
            <p style={{ margin: "0 0 6px", fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color }}>
              {fmtUSD(ordered[ordered.length - 1][field])}
            </p>
            <GDPSparkline snapshots={ordered} field={field} color={color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const top3: Record<number, { bg: string; color: string }> = {
    1: { bg: "rgba(74,232,160,0.15)", color: "#4AE8A0" },
    2: { bg: "rgba(255,255,255,0.08)", color: "var(--ink)" },
    3: { bg: "rgba(249,115,22,0.12)", color: "#F4B942" },
  };
  if (top3[rank]) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6,
        background: top3[rank].bg, color: top3[rank].color,
        fontWeight: 700, fontSize: "0.8rem", fontFamily: "var(--font-mono)",
        border: `1px solid color-mix(in srgb, ${top3[rank].color} 30%, transparent)`,
      }}>
        {rank}
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-mono)", minWidth: 24, display: "inline-block", textAlign: "center" }}>
      {rank}
    </span>
  );
}

function HealthBadge({ grade, score }: { grade: string; score: number }) {
  const color = gradeColor(grade);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
      <span style={{ fontSize: "0.82rem", fontWeight: 800, color, fontFamily: "monospace" }}>{grade}</span>
      <div style={{ width: 48, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function LeaderboardRow({
  agent,
  rank,
  healthMap,
  first,
  last,
}: {
  agent: AgentGDPEntry;
  rank: number;
  healthMap: Map<string, { grade: string; total: number }>;
  first?: boolean;
  last?: boolean;
}) {
  const net = agent.net_income_usd;
  const health = healthMap.get(agent.slug);
  const borderRadius = first && last ? 0 : first ? "0 0 0 0" : last ? "0 0 0 0" : 0;
  return (
    <Link
      href={`/registry/${agent.slug}`}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 80px 100px 110px 110px 90px 44px",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderBottom: last ? "none" : "1px solid var(--line)",
        textDecoration: "none",
        color: "inherit",
        transition: "background 0.1s",
        borderRadius,
      }}
      className="ldb-row"
    >
      {/* Rank */}
      <div style={{ textAlign: "center" }}>
        <RankMedal rank={rank} />
      </div>

      {/* Agent */}
      <div>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)" }}>{agent.name}</span>
        <div style={{ marginTop: 2 }}>
          <EcoBadge ecosystem={agent.ecosystem} />
        </div>
      </div>

      {/* Health */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {health
          ? <HealthBadge grade={health.grade} score={health.total} />
          : <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>}
      </div>

      {/* Revenue */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "#4AE8A0", textAlign: "right" }}>
        {fmtUSD(agent.revenue_usd)}
      </div>

      {/* Expenses */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--muted)", textAlign: "right" }}>
        {fmtUSD(agent.expenses_usd)}
      </div>

      {/* Net Income */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: netColor(net), textAlign: "right" }}>
        {net >= 0 ? "+" : ""}{fmtUSD(net)}
      </div>

      {/* Txs */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--muted)", textAlign: "right" }}>
        {agent.tx_count.toLocaleString()}
      </div>

      {/* Arrow */}
      <div style={{ textAlign: "right", color: "var(--muted)", fontSize: "0.75rem" }}>→</div>
    </Link>
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

  // Build slug → health score map
  const healthMap = new Map<string, { grade: string; total: number }>();
  const vscoreMap = new Map<string, { total: number; tier: string }>();
  for (const a of registryAgents) {
    const slug = toSlug(a.name);
    const s  = agentHealthScore(a);
    const vs = scoreAgent(a, false);
    healthMap.set(slug, { grade: s.grade, total: s.total });
    vscoreMap.set(slug, { total: vs.total, tier: TIER_LABELS[vs.tier] });
  }

  const agents = gdp?.all_attributed ?? [];
  const hasData = agents.length > 0;
  const awaitingManifest = gdp?.awaiting_manifest ?? [];

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
        <div style={{ marginBottom: 36 }}>
          <SectionLabel style={{ marginBottom: 8 }}>Agent Economy · 30 days</SectionLabel>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, lineHeight: 1.15 }}>
            Economic Leaderboard
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem", maxWidth: 560, lineHeight: 1.65 }}>
            Ranked by 30-day revenue. Only agents with declared wallet manifests are included —{" "}
            {gdp ? `${gdp.attributed_agents} of ${gdp.total_agents} indexed agents are attributed.` : "attribution is the prerequisite."}
          </p>
        </div>

        {/* GDP aggregate bar */}
        {gdp && (
          <MetricGrid cols={3} style={{ marginBottom: 36 }}>
            <MetricCard
              label="Agent GDP (Revenue)"
              value={fmtUSD(gdp.total_revenue_usd)}
              valueColor="#4AE8A0"
            />
            <MetricCard
              label="Total Expenses"
              value={fmtUSD(gdp.total_expenses_usd)}
            />
            <MetricCard
              label="Net Income"
              value={fmtUSD(gdp.total_net_income_usd)}
              valueColor={gdp.total_net_income_usd >= 0 ? "#4AE8A0" : "#F46060"}
            />
            <MetricCard
              label="Attributed Agents"
              value={String(gdp.attributed_agents)}
            />
            <MetricCard
              label="ERC-8004 Indexed"
              value={String(gdp.erc8004_agents)}
              valueColor="#8B7CF6"
            />
            <MetricCard
              label="Total Indexed"
              value={String(gdp.total_agents)}
              valueColor="var(--muted)"
            />
          </MetricGrid>
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
            <strong style={{ color: "var(--fg)" }}>Attribution gap: </strong>
            {gdp.total_agents - gdp.attributed_agents} of {gdp.total_agents} indexed agents — including {gdp.erc8004_agents} indexed via ERC-8004 — have not yet declared a wallet manifest and are excluded from financial rankings.
            Their on-chain identity is real and verified. Their finances become readable once they declare wallets.{" "}
            <Link href="/methodology" style={{ color: "var(--accent)" }}>Why attribution is required →</Link>
            {"  "}
            <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
          </div>
        )}

        {/* Table */}
        {hasData ? (
          <LedgerCard
            eyebrow="Top Agents by Revenue · 30 Days"
            style={{ marginBottom: 0 }}
          >
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>

              {/* Table header */}
              <div className="ldb-header" style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 80px 100px 110px 110px 90px 44px",
                gap: 12,
                padding: "10px 16px",
                background: "var(--surface-soft)",
                borderBottom: "1px solid var(--line)",
              }}>
                {[
                  { label: "#",          align: "center" },
                  { label: "Agent",      align: "left"   },
                  { label: "Health",     align: "right"  },
                  { label: "Revenue",    align: "right"  },
                  { label: "Expenses",   align: "right"  },
                  { label: "Net Income", align: "right"  },
                  { label: "Txs",        align: "right"  },
                  { label: "",           align: "right"  },
                ].map((h, i) => (
                  <div key={i} style={{
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--muted)",
                    textAlign: h.align as React.CSSProperties["textAlign"],
                  }}>
                    {h.label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {agents.map((agent, i) => (
                <LeaderboardRow
                  key={agent.slug}
                  agent={agent}
                  rank={i + 1}
                  healthMap={healthMap}
                  first={i === 0}
                  last={i === agents.length - 1}
                />
              ))}
            </div>
          </LedgerCard>
        ) : (
          <div style={{
            padding: "48px 28px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "var(--surface-soft)",
            textAlign: "center",
          }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "0.95rem" }}>No attributed agents yet.</p>
            <p style={{ margin: "0 0 24px", fontSize: "0.83rem", color: "var(--muted)", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Agents appear here once they declare a wallet manifest. Attribution is the prerequisite for inclusion.
            </p>
            <Link href="/registry#verify" className="lp-btn-primary">Submit Manifest →</Link>
          </div>
        )}


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
                            fontSize: "0.62rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99,
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
