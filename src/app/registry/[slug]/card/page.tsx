import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { Agent } from "@/app/registry/types";
import { classifySettlementPattern } from "@/lib/luca-classify";
import type { SettlementPattern } from "@/lib/luca-classify";
import { toSlug } from "../slug";

export const revalidate = 60;

function deriveTreasuryScore(agent: Agent): number {
  const map: Record<string, number> = { Healthy: 92, Stable: 78, Watch: 45, "At Risk": 18 };
  return map[agent.treasuryHealth] ?? 0;
}

function deriveTransparencyScore(agent: Agent): number {
  let s = 0;
  if      (agent.verificationStatus === "Luca Managed")     s += 62;
  else if (agent.verificationStatus === "Verified")         s += 58;
  else if (agent.verificationStatus === "Claimed")          s += 40;
  else if (agent.verificationStatus === "Wallets Declared") s += 20;
  if ((agent.financialActivityScore ?? 0) > 0) s += 18;
  if (agent.evidenceSources.length > 0)        s += 10;
  if (agent.adminNotes)                         s += 8;
  return Math.min(100, s);
}

function statusLabel(agent: Agent): string {
  const map: Record<string, string> = {
    "Verified": "Verified", "Luca Managed": "Luca Managed",
    "Claimed": "Claimed by Team", "Wallets Declared": "Wallets Declared",
    "Needs Verification": "Needs Verification", "Candidate": "Candidate",
  };
  return map[agent.verificationStatus] ?? agent.verificationStatus;
}

function lucaVerdict(agent: Agent): string {
  if (!agent.adminNotes) return `${agent.name} is indexed in the registry. No verdict available yet.`;
  const notes = agent.adminNotes.trim();
  if (notes.length <= 160) return notes;
  const cut = notes.slice(0, 160);
  const lastDot = cut.lastIndexOf(".");
  return lastDot > 80 ? cut.slice(0, lastDot + 1) : cut + "…";
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
    title: `${agent.name} — x402Books Registry Card`,
    description: `${agent.name} · Treasury: ${agent.treasuryHealth} · ${statusLabel(agent)} · Tracked by x402Books AI.`,
  };
}

export default async function AgentCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const score             = agent.financialActivityScore ?? 0;
  const isActive          = score >= 10;
  const treasuryScore     = deriveTreasuryScore(agent);
  const transparencyScore = deriveTransparencyScore(agent);
  const vstatus           = statusLabel(agent);
  const verdict           = lucaVerdict(agent);

  const healthColor =
    agent.treasuryHealth === "Healthy" || agent.treasuryHealth === "Stable" ? "#2d6e35"
    : agent.treasuryHealth === "Watch"   ? "#a06020"
    : agent.treasuryHealth === "At Risk" ? "#a03030" : "#888";

  const verifyColor =
    agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed" || agent.verificationStatus === "Claimed"
      ? "#2d6e35"
      : agent.verificationStatus === "Wallets Declared" ? "#376e8a"
      : "#888";

  const classification = classifySettlementPattern({
    totalInflow:         isActive ? 100 : 0,
    totalOutflow:        isActive ? 100 * (({ Healthy: 0.72, Stable: 0.95, Watch: 1.35, "At Risk": 1.90 } as Record<string, number>)[agent.treasuryHealth] ?? 1) : 0,
    txCount:             isActive ? Math.max(10, score) : 0,
    categories:          [],
    walletRolesDeclared: (agent.wallets ?? []).length > 0,
  });

  const patterns: SettlementPattern[] = classification.patterns
    .filter((p): p is SettlementPattern => p !== "active_operational" && p !== "dormant")
    .slice(0, 3);

  const PATTERN_LABEL: Partial<Record<SettlementPattern, string>> = {
    stable_treasury: "Stable Treasury", revenue_generating: "Revenue Activity",
    high_spend_low_revenue: "High Spend", heavy_outbound_settlement: "Heavy Outbound",
    recurring_flow_detected: "Recurring Flows", incomplete_wallet_role: "Roles Unverified",
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%; min-height: 100%;
            background: #ddd9cc;
            font-family: 'Inter', system-ui, sans-serif;
          }
          body {
            display: flex; align-items: center; justify-content: center;
            padding: 32px 24px;
          }

          .card {
            position: relative;
            width: 100%; max-width: 660px;
            background: #f0ece0;
            border-radius: 20px;
            overflow: hidden;
            padding: 36px 40px 30px;
            box-shadow: 0 2px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
          }

          /* Ghost watermark */
          .card-watermark {
            position: absolute;
            right: -20px; top: 50%;
            transform: translateY(-50%);
            font-size: 200px; font-weight: 800;
            color: rgba(80,70,50,0.045);
            letter-spacing: -0.05em;
            pointer-events: none;
            user-select: none;
            line-height: 1;
          }

          /* Brand row */
          .card-brand {
            display: flex; align-items: center; gap: 8px;
            margin-bottom: 28px;
          }
          .brand-dot {
            width: 20px; height: 20px; border-radius: 5px;
            background: #3b7a45;
            display: flex; align-items: center; justify-content: center;
          }
          .brand-dot-inner {
            width: 8px; height: 8px; border-radius: 2px;
            background: #f0ece0;
          }
          .brand-name {
            font-size: 0.8rem; font-weight: 700;
            color: #3b5e43; letter-spacing: 0.01em;
          }

          /* Hero */
          .card-headline {
            font-size: 1.5rem; font-weight: 300;
            color: #7a7364;
            margin-bottom: 10px;
            line-height: 1.2;
          }
          .card-headline strong {
            font-weight: 600; color: #3c3830;
          }

          .card-hero {
            font-size: 3.6rem; font-weight: 700;
            color: ${healthColor};
            letter-spacing: -0.03em;
            line-height: 1;
            margin-bottom: 6px;
          }
          .card-hero-label {
            font-size: 0.78rem; color: #9a9180;
            font-weight: 400; margin-bottom: 24px;
          }

          /* Divider */
          .card-divider {
            width: 100%; height: 1px;
            background: rgba(80,70,50,0.12);
            margin-bottom: 22px;
          }

          /* Stats row */
          .card-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0;
            position: relative;
            z-index: 1;
          }
          .stat-col { display: flex; flex-direction: column; gap: 4px; }
          .stat-col + .stat-col { border-left: 1px solid rgba(80,70,50,0.1); padding-left: 20px; }
          .stat-num {
            font-size: 1.35rem; font-weight: 600;
            color: #3c3830; letter-spacing: -0.02em;
            font-variant-numeric: tabular-nums;
          }
          .stat-label {
            font-size: 0.7rem; color: #9a9180;
            font-weight: 400;
          }
          .stat-badge {
            display: inline-block;
            font-size: 0.7rem; font-weight: 600;
            padding: 2px 8px; border-radius: 99px;
            margin-top: 2px;
          }

          /* Verdict */
          .card-verdict {
            margin-top: 20px; padding-top: 18px;
            border-top: 1px solid rgba(80,70,50,0.12);
            position: relative; z-index: 1;
          }
          .verdict-label {
            font-size: 0.62rem; font-weight: 700;
            color: rgba(59,122,69,0.65);
            text-transform: uppercase; letter-spacing: 0.08em;
            margin-bottom: 6px;
          }
          .verdict-text {
            font-size: 0.76rem; color: #7a7364;
            line-height: 1.6; font-weight: 400;
          }

          /* Footer */
          .card-footer {
            margin-top: 22px;
            display: flex; align-items: center; justify-content: space-between;
            position: relative; z-index: 1;
          }
          .footer-patterns { display: flex; gap: 5px; flex-wrap: wrap; }
          .pattern-pill {
            font-size: 0.63rem; font-weight: 600;
            padding: 2px 7px; border-radius: 99px;
            background: rgba(80,70,50,0.07);
            color: #7a7364; border: 1px solid rgba(80,70,50,0.12);
          }
          .footer-url {
            font-size: 0.68rem; color: #b0a990;
            font-weight: 400; white-space: nowrap;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="card-watermark">x402</div>

          {/* Brand */}
          <div className="card-brand">
            <div className="brand-dot"><div className="brand-dot-inner" /></div>
            <span className="brand-name">x402Books AI</span>
          </div>

          {/* Hero */}
          <p className="card-headline">
            <strong>{agent.name}</strong> is tracked by x402Books
          </p>
          <p className="card-hero">
            {agent.treasuryHealth === "Pending" ? "—" : agent.treasuryHealth}
          </p>
          <p className="card-hero-label">Treasury Health · Score {treasuryScore}/100</p>

          <div className="card-divider" />

          {/* Stats */}
          <div className="card-stats">
            <div className="stat-col">
              <span className="stat-num">{agent.financialActivityScore ?? "—"}</span>
              <span className="stat-label">Financial Activity</span>
            </div>
            <div className="stat-col" style={{ paddingLeft: 20 }}>
              <span className="stat-num">{transparencyScore}</span>
              <span className="stat-label">Transparency Score</span>
            </div>
            <div className="stat-col" style={{ paddingLeft: 20 }}>
              <span className="stat-num" style={{ fontSize: "0.85rem", color: verifyColor, marginTop: 4 }}>{vstatus}</span>
              <span className="stat-label">Verification</span>
            </div>
          </div>

          {/* Verdict */}
          <div className="card-verdict">
            <p className="verdict-label">Luca&apos;s Verdict</p>
            <p className="verdict-text">{verdict}</p>
          </div>

          {/* Footer */}
          <div className="card-footer">
            <div className="footer-patterns">
              {patterns.map((p) => (
                <span key={p} className="pattern-pill">{PATTERN_LABEL[p] ?? p}</span>
              ))}
            </div>
            <span className="footer-url">x402books.xyz/registry/{slug}</span>
          </div>
        </div>
      </body>
    </html>
  );
}
