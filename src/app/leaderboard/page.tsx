import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getGDPHistory } from "@/lib/gdp-history";
import type { AgentGDPEntry } from "@/lib/agent-gdp";
import type { GDPSnapshot } from "@/lib/gdp-history";

export const revalidate = 3600;

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function netColor(n: number): string {
  if (n > 0) return "#6DB874";
  if (n < 0) return "#ef4444";
  return "var(--muted)";
}

const ECO_COLORS: Record<string, string> = {
  BANKR: "#6DB874",
  Virtuals: "#5B8FA8",
  AEON: "#8B5CF6",
  EigenCloud: "#F97316",
  Base: "#4F46E5",
};

function EcoBadge({ eco }: { eco: string }) {
  const c = ECO_COLORS[eco] ?? "var(--muted)";
  return (
    <span style={{
      fontSize: "0.67rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
      border: `1px solid color-mix(in srgb, ${c} 28%, transparent)`,
      background: `color-mix(in srgb, ${c} 10%, transparent)`,
      color: c,
    }}>
      {eco}
    </span>
  );
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
      <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: isUp ? "#6DB874" : "#ef4444", fontFamily: "monospace", fontWeight: 600 }}>
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
          { label: "Revenue",    field: "total_revenue_usd"    as TrendField, color: "#6DB874" },
          { label: "Expenses",   field: "total_expenses_usd"   as TrendField, color: "#ef4444" },
          { label: "Net Income", field: "total_net_income_usd" as TrendField, color: "#5B8FA8" },
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
    1: { bg: "rgba(109,184,116,0.15)", color: "#6DB874" },
    2: { bg: "rgba(255,255,255,0.08)", color: "var(--ink)" },
    3: { bg: "rgba(249,115,22,0.12)", color: "#F97316" },
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

function LeaderboardRow({ agent, rank }: { agent: AgentGDPEntry; rank: number }) {
  const net = agent.net_income_usd;
  return (
    <Link
      href={`/registry/${agent.slug}`}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 100px 110px 110px 100px 70px",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderBottom: "1px solid var(--line)",
        textDecoration: "none",
        color: "inherit",
        transition: "background 0.1s",
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
          <EcoBadge eco={agent.ecosystem} />
        </div>
      </div>

      {/* Revenue */}
      <div style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600, color: "#6DB874", textAlign: "right" }}>
        {fmtUSD(agent.revenue_usd)}
      </div>

      {/* Expenses */}
      <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--muted)", textAlign: "right" }}>
        {fmtUSD(agent.expenses_usd)}
      </div>

      {/* Net Income */}
      <div style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: netColor(net), textAlign: "right" }}>
        {net >= 0 ? "+" : ""}{fmtUSD(net)}
      </div>

      {/* Txs */}
      <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)", textAlign: "right" }}>
        {agent.tx_count.toLocaleString()}
      </div>

      {/* Arrow */}
      <div style={{ textAlign: "right", color: "var(--muted)", fontSize: "0.75rem" }}>→</div>
    </Link>
  );
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

  const historyPromise = getGDPHistory(90);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 5000)
  );
  const history = await Promise.race([historyPromise, timeoutPromise])
    .catch(() => [] as GDPSnapshot[]);

  const agents = gdp?.all_attributed ?? [];
  const hasData = agents.length > 0;

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
          <p style={{ margin: "0 0 8px", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            Agent Economy · 30 days
          </p>
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
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 36,
            padding: "18px 20px",
            background: "var(--surface-soft)",
            border: "1px solid var(--line)",
            borderRadius: 10,
          }}>
            {[
              { label: "Agent GDP (Revenue)", value: fmtUSD(gdp.total_revenue_usd), color: "#6DB874" },
              { label: "Total Expenses",      value: fmtUSD(gdp.total_expenses_usd), color: "var(--fg)" },
              { label: "Net Income",          value: fmtUSD(gdp.total_net_income_usd), color: gdp.total_net_income_usd >= 0 ? "#6DB874" : "#ef4444" },
              { label: "Attributed Agents",  value: String(gdp.attributed_agents), color: "var(--fg)" },
              { label: "Total Indexed",       value: `${gdp.total_agents}`, color: "var(--muted)" },
            ].map((s) => (
              <div key={s.label}>
                <p style={{ margin: "0 0 4px", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 600 }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, fontFamily: "monospace", color: s.color }}>{s.value}</p>
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
            <strong style={{ color: "var(--fg)" }}>Attribution gap: </strong>
            {gdp.total_agents - gdp.attributed_agents} of {gdp.total_agents} indexed agents have not declared wallet manifests and are excluded from this leaderboard.
            Their on-chain activity is real but unreadable without attribution.{" "}
            <Link href="/methodology" style={{ color: "var(--accent)" }}>Why attribution is required →</Link>
            {"  "}
            <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
          </div>
        )}

        {/* Table */}
        {hasData ? (
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>

            {/* Table header */}
            <div className="ldb-header" style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 100px 110px 110px 100px 70px",
              gap: 12,
              padding: "10px 16px",
              background: "var(--surface-soft)",
              borderBottom: "1px solid var(--line)",
            }}>
              {[
                { label: "#",          align: "center" },
                { label: "Agent",      align: "left"   },
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
              <LeaderboardRow key={agent.slug} agent={agent} rank={i + 1} />
            ))}
          </div>
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
