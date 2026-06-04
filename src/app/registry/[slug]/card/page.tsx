import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { Agent } from "@/app/registry/types";
import { classifySettlementPattern } from "@/lib/luca-classify";
import type { SettlementPattern } from "@/lib/luca-classify";
import { toSlug } from "../slug";

export const revalidate = 60;

const HEALTH_RATIO: Partial<Record<string, number>> = {
  "Healthy": 0.72, "Stable": 0.95, "Watch": 1.35, "At Risk": 1.90,
};

// 1. Who is this?  → name + description + ecosystem
// 2. Is it verified? → status badge
// 3. Is it active?   → treasury health score + settlement patterns
// 4. Can I trust it? → transparency score
// 5. What does Luca think? → verdict

function deriveTreasuryScore(agent: Agent): number {
  const map: Record<string, number> = { Healthy: 92, Stable: 78, Watch: 45, "At Risk": 18 };
  return map[agent.treasuryHealth] ?? 0;
}

function deriveTransparencyScore(agent: Agent): number {
  let score = 0;
  const wallets = agent.wallets ?? [];
  if (wallets.length > 0)                                                          score += 30;
  if (agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed") score += 30;
  else if (agent.verificationStatus === "Claimed")                                score += 20;
  else if (agent.verificationStatus === "Wallets Declared")                       score += 10;
  if ((agent.financialActivityScore ?? 0) > 0)                                    score += 20;
  if (agent.evidenceSources.length > 0)                                           score += 10;
  if (agent.adminNotes)                                                            score += 10;
  return Math.min(100, score);
}

function shortDescription(agent: Agent): string {
  if (agent.adminNotes) {
    const first = agent.adminNotes.split(".")[0].trim();
    if (first.length > 8 && first.length < 80) return first + ".";
  }
  return `Autonomous agent on ${agent.ecosystem}.`;
}

function statusLabel(agent: Agent): string {
  const map: Record<string, string> = {
    "Verified":           "Verified",
    "Luca Managed":       "Luca Managed",
    "Claimed":            "Claimed by Team",
    "Wallets Declared":   "Wallets Declared",
    "Needs Verification": "Needs Verification",
    "Candidate":          "Candidate",
  };
  return map[agent.verificationStatus] ?? agent.verificationStatus;
}

function statusColor(agent: Agent): string {
  const s = agent.verificationStatus;
  if (s === "Verified" || s === "Luca Managed")  return "#6DB874";
  if (s === "Claimed")                           return "#6DB874";
  if (s === "Wallets Declared")                  return "#5B8FA8";
  return "#7d828d";
}

function lucaVerdictSnippet(agent: Agent): string {
  if (!agent.adminNotes) return `${agent.name} is indexed in the registry. No verdict available yet.`;
  // Take up to ~180 chars, end on a sentence boundary
  const notes = agent.adminNotes.trim();
  if (notes.length <= 180) return notes;
  const cut = notes.slice(0, 180);
  const lastDot = cut.lastIndexOf(".");
  return lastDot > 80 ? cut.slice(0, lastDot + 1) : cut + "…";
}

const PATTERN_LABEL: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "Stable Treasury",
  revenue_generating:        "Revenue Activity",
  high_spend_low_revenue:    "High Spend",
  heavy_outbound_settlement: "Heavy Outbound",
  recurring_flow_detected:   "Recurring Flows",
  incomplete_wallet_role:    "Roles Unverified",
  dormant:                   "Dormant",
};

const PATTERN_COLOR: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "#6DB874",
  revenue_generating:        "#5B8FA8",
  high_spend_low_revenue:    "#f87171",
  heavy_outbound_settlement: "#f59e0b",
  recurring_flow_detected:   "#5B8FA8",
  incomplete_wallet_role:    "#f59e0b",
  dormant:                   "#7d828d",
};

async function getAgent(slug: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    return agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return AGENTS.find((a) => toSlug(a.name) === slug) ?? null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) return { title: "Agent not found" };
  return {
    title: `${agent.name} — x402Books Registry Card`,
    description: `${agent.name} · Treasury: ${agent.treasuryHealth} · ${statusLabel(agent)} · Tracked by x402Books AI.`,
  };
}

export default async function AgentCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const score       = agent.financialActivityScore ?? 0;
  const isActive    = score >= 10;
  const ratio       = HEALTH_RATIO[agent.treasuryHealth] ?? 1.0;

  const classification = classifySettlementPattern({
    totalInflow:         isActive ? 100 : 0,
    totalOutflow:        isActive ? 100 * ratio : 0,
    txCount:             isActive ? Math.max(10, score) : 0,
    categories:          [],
    walletRolesDeclared: (agent.wallets ?? []).length > 0,
  });

  const visiblePatterns = classification.patterns
    .filter((p) => p !== "active_operational" && PATTERN_LABEL[p])
    .slice(0, 4);

  const treasuryScore    = deriveTreasuryScore(agent);
  const transparencyScore = deriveTransparencyScore(agent);
  const description      = shortDescription(agent);
  const verdict          = lucaVerdictSnippet(agent);
  const vstatus          = statusLabel(agent);
  const vcolor           = statusColor(agent);

  const ecoColor =
    agent.ecosystem === "BANKR"       ? "#6DB874" :
    agent.ecosystem === "Virtuals"    ? "#5B8FA8" :
    agent.ecosystem === "AEON"        ? "#8B5CF6" :
    agent.ecosystem === "EigenCloud"  ? "#F97316" : "#C9A84C";

  const healthColor =
    agent.treasuryHealth === "Healthy" ? "#6DB874" :
    agent.treasuryHealth === "Stable"  ? "#6DB874" :
    agent.treasuryHealth === "Watch"   ? "#f59e0b" :
    agent.treasuryHealth === "At Risk" ? "#f87171" : "#7d828d";

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { width: 100%; min-height: 100%; background: #0a0c0b; font-family: 'Inter', sans-serif; }
          body { display: flex; align-items: center; justify-content: center; padding: 24px; }

          .card {
            width: 100%; max-width: 420px;
            background: #111412;
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 32px rgba(0,0,0,0.4);
          }

          /* Section 1 — Who is this? */
          .card-identity {
            padding: 22px 22px 18px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }
          .agent-name {
            font-size: 1.3rem; font-weight: 700;
            color: #eae8e3; letter-spacing: -0.01em;
            margin-bottom: 4px;
          }
          .agent-desc {
            font-size: 0.78rem; color: rgba(234,232,227,0.4);
            line-height: 1.45; margin-bottom: 12px;
            font-weight: 400;
          }
          .badges { display: flex; gap: 6px; flex-wrap: wrap; }
          .badge {
            font-size: 0.66rem; font-weight: 600;
            padding: 3px 9px; border-radius: 99px; border: 1px solid;
          }

          /* Section 2 — Is it verified + active? */
          .card-stats {
            padding: 16px 22px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex; flex-direction: column; gap: 9px;
          }
          .stat-row {
            display: flex; align-items: center; justify-content: space-between;
          }
          .stat-label {
            font-size: 0.74rem; color: rgba(234,232,227,0.38);
            font-weight: 500;
          }
          .stat-val {
            font-size: 0.78rem; font-weight: 700;
          }

          /* Section 3 — Can I trust it? (scores) */
          .card-scores {
            padding: 14px 22px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex; flex-direction: column; gap: 10px;
          }
          .score-row { display: flex; align-items: center; gap: 10px; }
          .score-label { font-size: 0.72rem; color: rgba(234,232,227,0.38); width: 150px; flex-shrink: 0; }
          .score-track { flex: 1; height: 3px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
          .score-fill  { height: 100%; border-radius: 99px; }

          /* Settlement patterns */
          .card-patterns {
            padding: 12px 22px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex; flex-wrap: wrap; gap: 5px;
          }
          .pattern-pill {
            font-size: 0.65rem; font-weight: 600;
            padding: 3px 9px; border-radius: 99px; border: 1px solid;
          }

          /* Section 5 — What does Luca think? */
          .card-verdict {
            padding: 15px 22px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }
          .verdict-label {
            font-size: 0.62rem; font-weight: 700;
            color: rgba(109,184,116,0.7);
            text-transform: uppercase; letter-spacing: 0.07em;
            margin-bottom: 7px;
          }
          .verdict-text {
            font-size: 0.76rem; color: rgba(234,232,227,0.55);
            line-height: 1.6; font-weight: 400;
          }

          /* Footer */
          .card-footer {
            padding: 12px 22px;
            display: flex; align-items: center; justify-content: space-between;
          }
          .x402-brand {
            font-size: 0.7rem; color: rgba(234,232,227,0.22);
            font-weight: 600; letter-spacing: 0.02em;
          }
          .view-link {
            font-size: 0.72rem; font-weight: 600; color: #6DB874;
            text-decoration: none;
          }
          .view-link:hover { text-decoration: underline; }
        `}</style>
      </head>
      <body>
        <div className="card">

          {/* 1. Who is this? */}
          <div className="card-identity">
            <p className="agent-name">{agent.name}</p>
            <p className="agent-desc">{description}</p>
            <div className="badges">
              <span className="badge" style={{ color: ecoColor, borderColor: `color-mix(in srgb, ${ecoColor} 28%, transparent)`, background: `color-mix(in srgb, ${ecoColor} 9%, transparent)` }}>
                {agent.ecosystem} Ecosystem
              </span>
              <span className="badge" style={{ color: vcolor, borderColor: `color-mix(in srgb, ${vcolor} 28%, transparent)`, background: `color-mix(in srgb, ${vcolor} 9%, transparent)` }}>
                {vstatus}
              </span>
            </div>
          </div>

          {/* 2 + 3. Is it verified? Is it active? */}
          <div className="card-stats">
            <div className="stat-row">
              <span className="stat-label">Treasury Health</span>
              <span className="stat-val" style={{ color: healthColor }}>
                {agent.treasuryHealth === "Pending" ? "—" : `${treasuryScore} / 100`}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Verification Status</span>
              <span className="stat-val" style={{ color: vcolor }}>{vstatus}</span>
            </div>
            {agent.financialActivityScore !== null && (
              <div className="stat-row">
                <span className="stat-label">Financial Activity</span>
                <span className="stat-val" style={{ color: "rgba(234,232,227,0.7)" }}>{agent.financialActivityScore} / 100</span>
              </div>
            )}
          </div>

          {/* 4. Can I trust it? */}
          <div className="card-scores">
            {agent.financialActivityScore !== null && (
              <div className="score-row">
                <span className="score-label">Financial Activity</span>
                <div className="score-track">
                  <div className="score-fill" style={{ width: `${agent.financialActivityScore}%`, background: agent.financialActivityScore >= 70 ? "#6DB874" : agent.financialActivityScore >= 40 ? "#5B8FA8" : "#555" }} />
                </div>
              </div>
            )}
            <div className="score-row">
              <span className="score-label">Transparency Score</span>
              <div className="score-track">
                <div className="score-fill" style={{ width: `${transparencyScore}%`, background: transparencyScore >= 70 ? "#6DB874" : transparencyScore >= 40 ? "#5B8FA8" : "#555" }} />
              </div>
            </div>
          </div>

          {/* Settlement patterns */}
          {visiblePatterns.length > 0 && (
            <div className="card-patterns">
              {visiblePatterns.map((p) => (
                <span key={p} className="pattern-pill" style={{
                  color: PATTERN_COLOR[p] ?? "rgba(234,232,227,0.4)",
                  borderColor: `color-mix(in srgb, ${PATTERN_COLOR[p] ?? "rgba(234,232,227,0.4)"} 28%, transparent)`,
                  background:  `color-mix(in srgb, ${PATTERN_COLOR[p] ?? "rgba(234,232,227,0.4)"} 8%, transparent)`,
                }}>
                  {PATTERN_LABEL[p]}
                </span>
              ))}
            </div>
          )}

          {/* 5. What does Luca think? */}
          <div className="card-verdict">
            <p className="verdict-label">Luca&apos;s Verdict</p>
            <p className="verdict-text">{verdict}</p>
          </div>

          {/* Footer */}
          <div className="card-footer">
            <span className="x402-brand">x402Books AI</span>
            <a href={`https://www.x402books.xyz/registry/${slug}`} target="_blank" rel="noreferrer" className="view-link">
              View profile →
            </a>
          </div>

        </div>
      </body>
    </html>
  );
}
