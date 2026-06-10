import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import { getRegistryAgents } from "@/lib/registry-db";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { computeKya, type KyaAssessment } from "@/lib/kya";
import { toSlug } from "@/app/registry/[slug]/slug";
import type { Agent } from "@/app/registry/types";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "State of Agent Trust — x402Books",
  description:
    "The live trust leaderboard for the agent economy. Top trust scores, highest confidence, new wallet declarations, and trust checks executed — computed against the public methodology.",
};

const TIER: Record<string, number> = {
  "Candidate": 0, "Needs Verification": 1, "Wallets Declared": 2,
  "Claimed": 3, "Verified": 4, "Luca Managed": 5,
};

const REC_STYLE: Record<string, { color: string; bg: string }> = {
  ALLOW:  { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  REVIEW: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  BLOCK:  { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

type Row = { agent: Agent; slug: string; kya: KyaAssessment };

async function getTrustCheckCounts() {
  const empty = { last_7d: 0, unique_callers_7d: 0 };
  if (!hasSupabaseAdminEnv()) return empty;
  try {
    const sb = getSupabaseAdminClient();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await sb
      .from("api_usage")
      .select("key_id")
      .eq("endpoint", "/api/v1/kya")
      .gte("created_at", since)
      .limit(10_000);
    const rows = (data ?? []) as Array<{ key_id: string | null }>;
    return { last_7d: rows.length, unique_callers_7d: new Set(rows.map((r) => r.key_id ?? "anon")).size };
  } catch {
    return empty;
  }
}

async function getBehavioralAgents(): Promise<Set<string>> {
  if (!hasSupabaseAdminEnv()) return new Set();
  try {
    const sb = getSupabaseAdminClient();
    const { data } = await sb.from("tool_decision_events").select("agent_id").limit(2000);
    return new Set(((data ?? []) as Array<{ agent_id: string }>).map((r) => r.agent_id));
  } catch {
    return new Set();
  }
}

function RecPill({ rec }: { rec: string }) {
  const s = REC_STYLE[rec] ?? REC_STYLE.REVIEW;
  return (
    <span style={{ fontSize: "0.64rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: s.color, background: s.bg, border: `1px solid ${s.color}33`, whiteSpace: "nowrap" }}>
      {rec}
    </span>
  );
}

function BoardRow({ row, rank, metric }: { row: Row; rank: number; metric: number }) {
  return (
    <Link href={`/registry/${row.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, textDecoration: "none", color: "var(--ink)", marginBottom: 6 }}>
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", width: 22 }}>{rank}</span>
      <span style={{ fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>{row.agent.name}</span>
      <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{row.agent.ecosystem}</span>
      <span style={{ fontSize: "0.68rem", color: "var(--muted)", width: 110, textAlign: "right" }}>{row.kya.verification_status}</span>
      <RecPill rec={row.kya.recommendation} />
      <span style={{ fontSize: "0.95rem", fontWeight: 700, width: 34, textAlign: "right", color: "var(--accent)" }}>{metric}</span>
    </Link>
  );
}

function Board({ title, sub, rows, metricOf }: { title: string; sub: string; rows: Row[]; metricOf: (r: Row) => number }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 className="reg-h2" style={{ fontSize: "1.15rem", marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 14 }}>{sub}</p>
      {rows.map((r, i) => (
        <BoardRow key={r.slug} row={r} rank={i + 1} metric={metricOf(r)} />
      ))}
    </section>
  );
}

export default async function StateOfAgentTrustPage() {
  const [{ agents }, trustChecks, behavioral] = await Promise.all([
    getRegistryAgents(),
    getTrustCheckCounts(),
    getBehavioralAgents(),
  ]);

  const rows: Row[] = agents.map((agent) => {
    const slug = toSlug(agent.name);
    return { agent, slug, kya: computeKya(agent, { hasToolDecisions: behavioral.has(slug) }) };
  });

  const declared = rows.filter((r) => TIER[r.agent.verificationStatus] >= TIER["Wallets Declared"]);
  const claimed  = rows.filter((r) => TIER[r.agent.verificationStatus] >= TIER["Claimed"]);

  const topTrust = [...rows]
    .sort((a, b) => b.kya.trust_score - a.kya.trust_score || b.kya.confidence - a.kya.confidence)
    .slice(0, 10);

  const topConfidence = [...rows]
    .sort((a, b) => b.kya.confidence - a.kya.confidence || b.kya.trust_score - a.kya.trust_score)
    .slice(0, 10);

  const recentlyDeclared = [...declared]
    .sort((a, b) => (b.agent.lastChecked ?? "").localeCompare(a.agent.lastChecked ?? ""))
    .slice(0, 8);

  const scoreboard = [
    { label: "Manifests Declared", value: declared.length },
    { label: "Profiles Claimed",   value: claimed.length },
    { label: "Trust Checks (7d)",  value: trustChecks.last_7d },
    { label: "Unique Callers (7d)", value: trustChecks.unique_callers_7d },
  ];

  return (
    <div className="reg-page">
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/registry">Registry</Link>
          <Link href="/trust" style={{ color: "var(--accent)" }}>Trust</Link>
          <Link href="/luca">Luca</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/registry" className="lp-btn-primary">Open Registry</Link>
        </div>
      </header>

      <section className="reg-hero">
        <p className="reg-label">Live · refreshes every 5 minutes</p>
        <h1 className="reg-h1">State of Agent Trust</h1>
        <p className="reg-hero-sub">
          The trust leaderboard for the agent economy. Every number computed against the{" "}
          <Link href="/methodology" style={{ color: "var(--accent)" }}>public methodology</Link> —
          the same code behind <code style={{ fontSize: "0.85em" }}>GET /api/v1/kya/[agent]</code>.
        </p>
        <div className="reg-hero-stats">
          {scoreboard.map((s) => (
            <div key={s.label} className="reg-hero-stat">
              <span className="reg-hero-stat-val">{s.value}</span>
              <span className="reg-hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="reg-section" style={{ maxWidth: 860, margin: "0 auto" }}>
        <Board
          title="Top Trust Scores"
          sub="How good the agent looks, based on verification, declared wallet roles, treasury health, and activity."
          rows={topTrust}
          metricOf={(r) => r.kya.trust_score}
        />
        <Board
          title="Highest Confidence"
          sub="How much evidence sits behind the score — manifests, claims, reviews, freshness, behavioral history."
          rows={topConfidence}
          metricOf={(r) => r.kya.confidence}
        />
        <Board
          title="Recently Declared"
          sub="Agents that declared wallets via .agent/wallets.json — the newest financial identities."
          rows={recentlyDeclared}
          metricOf={(r) => r.kya.trust_score}
        />

        <section style={{ marginBottom: 36, padding: "16px 18px", border: "1px dashed var(--line)", borderRadius: 12 }}>
          <h2 className="reg-h2" style={{ fontSize: "1.05rem", marginBottom: 6 }}>Most Improved</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
            Score history tracking began June 2026. Most Improved debuts in the next edition —
            declare wallets or claim your profile now and your trajectory starts counting.
          </p>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "28px 20px", border: "1px solid var(--line)", borderRadius: 14, marginBottom: 40 }}>
          <h2 className="reg-h2" style={{ marginBottom: 8 }}>Want a higher score?</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 16, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Every tier of verification raises your trust score and confidence. Declare your wallets,
            claim your profile, get verified — the path is public.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/registry#verify" className="lp-btn-primary">Declare your wallets</Link>
            <Link href="/methodology" className="lp-btn-ghost">Read the methodology</Link>
          </div>
        </section>
      </section>

      <footer className="lp-footer">
        <p className="lp-footer-copy" style={{ textAlign: "center" }}>
          © 2026 x402Books · Scores are advisory signals computed from registry data — not financial advice.
        </p>
      </footer>
    </div>
  );
}
