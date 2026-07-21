import { notFound } from "next/navigation";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import { toSlug } from "@/app/registry/[slug]/slug";
import { agentHealthScore, gradeColor } from "@/lib/agent-health-score";
import type { Agent } from "@/app/registry/types";

export const revalidate = 300;

// /registry/[slug]/embed — self-contained iframe widget.
// Usage: <iframe src="https://zetta.finance/registry/my-agent/embed"
//          width="340" height="140" frameborder="0" />

async function getAgent(slug: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    return agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return AGENTS.find((a) => toSlug(a.name) === slug) ?? null;
  }
}

function statusColor(s: string): string {
  if (s === "Verified" || s === "Luca Managed") return "#4AE8A0";
  if (s === "ERC-8004 Indexed" || s === "Claimed") return "#4AE8A0";
  if (s === "Wallets Declared") return "#5B9EF4";
  return "#94a3b8";
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const score  = agentHealthScore(agent);
  const color  = gradeColor(score.grade);
  const sColor = statusColor(agent.verificationStatus);
  const walletCount = (agent.wallets ?? []).length;

  return (
    <html lang="en" style={{ margin: 0, padding: 0 }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{agent.name} — Zetta</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%; height: 100%;
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f1117;
            color: #e2e8f0;
          }
          a { text-decoration: none; color: inherit; }
        `}</style>
      </head>
      <body>
        <a
          href={`https://zetta.finance/registry/${slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            padding: "16px 20px",
            background: "#0f1117",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            width: "100%",
            maxWidth: 360,
            margin: "0 auto",
          }}
        >
          {/* Top row — name + grade */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "0.72rem", color: "#4AE8A0", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                Zetta Registry
              </p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agent.name}
              </p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginLeft: 10,
            }}>
              <span style={{ fontSize: "1rem", fontWeight: 800, color, lineHeight: 1 }}>{score.grade}</span>
              <span style={{ fontSize: "0.55rem", color: "#94a3b8", marginTop: 1 }}>{score.total}/100</span>
            </div>
          </div>

          {/* Status badge + ecosystem */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
            <span style={{
              fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: `color-mix(in srgb, ${sColor} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${sColor} 35%, transparent)`,
              color: sColor,
            }}>
              {agent.verificationStatus}
            </span>
            <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{agent.ecosystem}</span>
          </div>

          {/* Score bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: color, width: `${score.total}%`, borderRadius: 2 }} />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Wallets",   val: walletCount.toString() },
              { label: "Evidence",  val: agent.evidenceSources.length.toString() },
              { label: "Score",     val: `${score.total}` },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: "0.6rem", color: "#64748b", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.65rem", color: "#4AE8A0", fontWeight: 600 }}>zetta.finance →</span>
            </div>
          </div>
        </a>
      </body>
    </html>
  );
}
