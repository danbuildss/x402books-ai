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

const PATTERN_LABEL: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "Stable Treasury",
  revenue_generating:        "Revenue",
  high_spend_low_revenue:    "High Spend",
  heavy_outbound_settlement: "Heavy Outbound",
  recurring_flow_detected:   "Recurring Flows",
  incomplete_wallet_role:    "Roles Unverified",
  dormant:                   "Dormant",
};

const PATTERN_COLOR: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "var(--accent)",
  revenue_generating:        "var(--blue)",
  high_spend_low_revenue:    "#f87171",
  heavy_outbound_settlement: "#f59e0b",
  recurring_flow_detected:   "var(--blue)",
  incomplete_wallet_role:    "#f59e0b",
  dormant:                   "var(--muted)",
};

type DataStatus = "Candidate" | "Wallets Declared" | "Verified" | "Live Financial Data";
type DataConfidence = "Low" | "Medium" | "High";

function deriveDataStatus(agent: Agent): DataStatus {
  const isVerified = agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed";
  const hasLiveData = (agent.financialActivityScore ?? 0) >= 20;
  if (isVerified && hasLiveData) return "Live Financial Data";
  if (isVerified) return "Verified";
  if (agent.wallets.length > 0) return "Wallets Declared";
  return "Candidate";
}

function deriveDataConfidence(agent: Agent): DataConfidence {
  const isVerified = agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed";
  const hasWallets = agent.wallets.length > 0 || !!agent.tokenAddress;
  const hasActivity = (agent.financialActivityScore ?? 0) > 0;
  if (isVerified && hasWallets && hasActivity) return "High";
  if (isVerified || hasWallets) return "Medium";
  return "Low";
}

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
    title: `${agent.name} — x402Books Agent Card`,
    description: `Financial profile card for ${agent.name}. Treasury: ${agent.treasuryHealth}. Tracked by x402Books AI.`,
  };
}

export default async function AgentCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const score     = agent.financialActivityScore ?? 0;
  const isActive  = score >= 10;
  const ratio     = HEALTH_RATIO[agent.treasuryHealth] ?? 1.0;
  const classification = classifySettlementPattern({
    totalInflow:         isActive ? 100 : 0,
    totalOutflow:        isActive ? 100 * ratio : 0,
    txCount:             isActive ? Math.max(10, score) : 0,
    categories:          [],
    walletRolesDeclared: agent.wallets.length > 0,
  });

  const visiblePatterns = classification.patterns
    .filter((p) => p !== "active_operational" && PATTERN_LABEL[p])
    .slice(0, 4);

  const dataStatus     = deriveDataStatus(agent);
  const dataConfidence = deriveDataConfidence(agent);
  const isVerified     = dataStatus === "Verified" || dataStatus === "Live Financial Data";

  const healthColor =
    agent.treasuryHealth === "Healthy" ? "#6DB874" :
    agent.treasuryHealth === "Stable"  ? "#6DB874" :
    agent.treasuryHealth === "Watch"   ? "#f59e0b" :
    agent.treasuryHealth === "At Risk" ? "#f87171" : "#7d828d";

  const ecoColor =
    agent.ecosystem === "BANKR"       ? "#6DB874" :
    agent.ecosystem === "Virtuals"    ? "#5B8FA8" :
    agent.ecosystem === "AEON"        ? "#8B5CF6" :
    agent.ecosystem === "EigenCloud"  ? "#F97316" : "#C9A84C";

  const statusColor =
    dataStatus === "Live Financial Data" ? "#6DB874" :
    dataStatus === "Verified"            ? "#6DB874" :
    dataStatus === "Wallets Declared"    ? "#5B8FA8" : "#7d828d";

  const confidenceColor =
    dataConfidence === "High"   ? "#6DB874" :
    dataConfidence === "Medium" ? "#f59e0b" : "#7d828d";

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
          html, body { width: 100%; min-height: 100%; background: #0d0f0e; font-family: 'Inter', sans-serif; }
          body { display: flex; align-items: center; justify-content: center; padding: 24px; }
          .card {
            width: 100%; max-width: 400px;
            background: #141714;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            overflow: hidden;
          }
          .card-top { padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
          .name { font-size: 1.15rem; font-weight: 700; color: #e8e6e1; }
          .symbol { font-size: 0.78rem; color: rgba(232,230,225,0.4); font-weight: 500; }
          .badges { display: flex; gap: 6px; flex-wrap: wrap; }
          .badge {
            font-size: 0.68rem; font-weight: 600;
            padding: 2px 8px; border-radius: 99px;
            border: 1px solid;
          }
          .card-status {
            padding: 10px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex; align-items: center; justify-content: space-between;
            gap: 8px;
          }
          .status-pair { display: flex; flex-direction: column; gap: 3px; }
          .status-label { font-size: 0.62rem; color: rgba(232,230,225,0.3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
          .status-val { font-size: 0.75rem; font-weight: 700; }
          .status-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.07); }
          .card-scores { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 8px; }
          .score-row { display: flex; align-items: center; gap: 10px; }
          .score-label { font-size: 0.75rem; color: rgba(232,230,225,0.45); width: 130px; flex-shrink: 0; }
          .score-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
          .score-fill { height: 100%; border-radius: 99px; }
          .score-val { font-size: 0.75rem; font-weight: 700; color: #e8e6e1; width: 24px; text-align: right; }
          .card-patterns { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; flex-wrap: wrap; gap: 6px; }
          .pattern-pill {
            font-size: 0.68rem; font-weight: 600;
            padding: 3px 9px; border-radius: 99px;
            border: 1px solid;
          }
          .card-claim {
            padding: 12px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex; align-items: center; gap: 8px;
          }
          .claim-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }
          .claim-text { font-size: 0.72rem; color: rgba(232,230,225,0.5); flex: 1; line-height: 1.45; }
          .claim-link { font-size: 0.72rem; font-weight: 600; color: #6DB874; text-decoration: none; white-space: nowrap; }
          .claim-link:hover { text-decoration: underline; }
          .card-bottom {
            padding: 12px 20px;
            display: flex; align-items: center; justify-content: space-between;
          }
          .x402-brand { font-size: 0.72rem; color: rgba(232,230,225,0.3); font-weight: 600; letter-spacing: 0.01em; }
          .view-link {
            font-size: 0.72rem; font-weight: 600; color: #6DB874;
            text-decoration: none; display: flex; align-items: center; gap: 4px;
          }
          .view-link:hover { text-decoration: underline; }
        `}</style>
      </head>
      <body>
        <div className="card">
          {/* Identity */}
          <div className="card-top">
            <div className="name-row">
              <span className="name">{agent.name}</span>
              <span className="symbol">{agent.symbol}</span>
            </div>
            <div className="badges">
              <span className="badge" style={{ color: ecoColor, borderColor: `color-mix(in srgb, ${ecoColor} 30%, transparent)`, background: `color-mix(in srgb, ${ecoColor} 10%, transparent)` }}>
                {agent.ecosystem}
              </span>
              <span className="badge" style={{ color: healthColor, borderColor: `color-mix(in srgb, ${healthColor} 30%, transparent)`, background: `color-mix(in srgb, ${healthColor} 10%, transparent)` }}>
                {agent.treasuryHealth}
              </span>
            </div>
          </div>

          {/* Status + confidence row */}
          <div className="card-status">
            <div className="status-pair">
              <span className="status-label">Profile Status</span>
              <span className="status-val" style={{ color: statusColor }}>{dataStatus}</span>
            </div>
            <div className="status-divider" />
            <div className="status-pair" style={{ textAlign: "right" }}>
              <span className="status-label">Data Confidence</span>
              <span className="status-val" style={{ color: confidenceColor }}>{dataConfidence}</span>
            </div>
          </div>

          {/* Scores */}
          {(agent.financialActivityScore !== null || agent.partnershipFitScore !== null) && (
            <div className="card-scores">
              {agent.financialActivityScore !== null && (
                <div className="score-row">
                  <span className="score-label">Financial Activity</span>
                  <div className="score-track">
                    <div className="score-fill" style={{ width: `${agent.financialActivityScore}%`, background: agent.financialActivityScore >= 70 ? "#6DB874" : agent.financialActivityScore >= 40 ? "#5B8FA8" : "#666" }} />
                  </div>
                  <span className="score-val">{agent.financialActivityScore}</span>
                </div>
              )}
              {agent.partnershipFitScore !== null && (
                <div className="score-row">
                  <span className="score-label">Partnership Fit</span>
                  <div className="score-track">
                    <div className="score-fill" style={{ width: `${agent.partnershipFitScore}%`, background: agent.partnershipFitScore >= 70 ? "#6DB874" : agent.partnershipFitScore >= 40 ? "#5B8FA8" : "#666" }} />
                  </div>
                  <span className="score-val">{agent.partnershipFitScore}</span>
                </div>
              )}
            </div>
          )}

          {/* Settlement patterns */}
          {visiblePatterns.length > 0 && (
            <div className="card-patterns">
              {visiblePatterns.map((p) => (
                <span
                  key={p}
                  className="pattern-pill"
                  style={{
                    color: PATTERN_COLOR[p] ?? "rgba(232,230,225,0.5)",
                    borderColor: `color-mix(in srgb, ${PATTERN_COLOR[p] ?? "rgba(232,230,225,0.5)"} 30%, transparent)`,
                    background: `color-mix(in srgb, ${PATTERN_COLOR[p] ?? "rgba(232,230,225,0.5)"} 10%, transparent)`,
                  }}
                >
                  {PATTERN_LABEL[p]}
                </span>
              ))}
            </div>
          )}

          {/* Claim / verify CTA for unverified profiles */}
          {!isVerified && (
            <div className="card-claim">
              <span className="claim-dot" />
              <span className="claim-text">
                {dataStatus === "Wallets Declared"
                  ? "Wallets declared — submit for Luca verification to upgrade this profile."
                  : "This profile is based on public data. Submit a wallet manifest to verify."}
              </span>
              <a href={`https://www.x402books.xyz/registry#verify`} target="_blank" rel="noreferrer" className="claim-link">
                Verify →
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="card-bottom">
            <span className="x402-brand">x402Books AI</span>
            <a href={`https://www.x402books.xyz/registry/${slug}`} target="_blank" rel="noreferrer" className="view-link">
              Full profile →
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
