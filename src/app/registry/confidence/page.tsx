import type { Metadata } from "next";
import Link from "next/link";
import { getAllConfidenceLabels, CONFIDENCE_META, type ConfidenceLevel } from "@/lib/revenue-confidence";
import { getRegistryAgents } from "@/lib/registry-db";
import { toSlug } from "@/app/registry/[slug]/slug";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Revenue Confidence Report | Zetta",
  description: "Which agent revenue figures are high confidence, under review, or pending verification. Zetta's commitment to financial transparency over inflated numbers.",
};

export const dynamic = "force-dynamic";

const LEVEL_ORDER: ConfidenceLevel[] = ["high", "medium", "low", "under_review"];

export default async function ConfidenceReportPage() {
  const [labels, { agents }] = await Promise.all([
    getAllConfidenceLabels(),
    getRegistryAgents(),
  ]);

  const labelsBySlug = Object.fromEntries(labels.map((l) => [l.agent_slug, l]));

  // Group labeled agents by level
  const grouped: Record<ConfidenceLevel, typeof labels> = {
    high:         labels.filter((l) => l.confidence_level === "high"),
    medium:       labels.filter((l) => l.confidence_level === "medium"),
    low:          labels.filter((l) => l.confidence_level === "low"),
    under_review: labels.filter((l) => l.confidence_level === "under_review"),
  };

  // Agents with no label
  const labeledSlugs = new Set(labels.map((l) => l.agent_slug));
  const unlabeled = agents.filter((a) => !labeledSlugs.has(toSlug(a.name)));

  const totalLabeled = labels.length;
  const totalAgents  = agents.length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-sans)" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid var(--line)", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, height: 56 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Zetta</Link>
        <Link href="/registry" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>Registry</Link>
        <Link href="/registry/confidence" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Confidence Report</Link>
        <Link href="/methodology" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13, marginLeft: "auto" }}>Methodology</Link>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
            Revenue Confidence Report
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 16px", maxWidth: 600 }}>
            We publish revenue figures only when we can trace them to verified on-chain transactions.
            Agents whose figures are uncertain are marked accordingly — not hidden.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEVEL_ORDER.map((level) => {
              const meta = CONFIDENCE_META[level];
              const count = grouped[level].length;
              return (
                <a key={level} href={`#${level}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, border: `1px solid ${meta.color}44`, background: `${meta.color}0d`, textDecoration: "none" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{count}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Principle box */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 24px", marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Our approach</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {[
              ["Traceability over totals", "Every revenue figure links to specific on-chain transactions. No estimates, no projections."],
              ["Honest uncertainty", "When we can't verify a figure, we say so. Showing Low Confidence is more trustworthy than hiding the agent."],
              ["Base-chain scope", "Current scans cover Base chain ERC-20 transfers only. Cross-chain agents are flagged accordingly."],
              ["No manipulation", "Classification rules are public. We do not adjust thresholds to inflate or deflate any agent's numbers."],
            ].map(([title, body]) => (
              <div key={title as string}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence groups */}
        {LEVEL_ORDER.map((level) => {
          const meta = CONFIDENCE_META[level];
          const items = grouped[level];
          return (
            <section key={level} id={level} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.color, flexShrink: 0, display: "inline-block" }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{meta.label}</h2>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>({items.length})</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>{meta.description}</p>
              {items.length === 0 ? (
                <div style={{ padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>No agents in this category yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((label) => {
                    const agent = agents.find((a) => toSlug(a.name) === label.agent_slug);
                    return (
                      <div key={label.agent_slug} style={{ background: "var(--surface)", border: `1px solid ${meta.color}33`, borderRadius: 8, padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                          <div>
                            <Link href={`/registry/${label.agent_slug}`} style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>
                              {agent?.name ?? label.agent_slug}
                            </Link>
                            {label.public_note && (
                              <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>{label.public_note}</p>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            {label.reviewed_at && (
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                Verified {new Date(label.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                            <Link href={`/registry/${label.agent_slug}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                              Profile →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {/* Unlabeled */}
        {unlabeled.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--muted)" }}>Pending Review</h2>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>({unlabeled.length})</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
              These agents are indexed in the registry but have not yet completed the revenue accuracy audit. Figures shown on their profiles reflect auto-computed classification only.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {unlabeled.slice(0, 20).map((agent) => (
                <Link
                  key={agent.name}
                  href={`/registry/${toSlug(agent.name)}`}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
                >
                  {agent.name}
                </Link>
              ))}
              {unlabeled.length > 20 && (
                <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>+{unlabeled.length - 20} more</span>
              )}
            </div>
          </section>
        )}

        {/* Methodology footer */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 6px" }}>
            <strong style={{ color: "var(--ink)" }}>Revenue definition:</strong> Operating inflows only — capital injections, bridge transfers, DEX swaps, grants, and token distributions are excluded or quarantined. Base chain ERC-20 transfers, 30-day rolling window.
          </p>
          <p style={{ margin: 0 }}>
            <Link href="/methodology" style={{ color: "var(--accent)", textDecoration: "none" }}>Full methodology →</Link>
            {" · "}
            <Link href="/manifest" style={{ color: "var(--accent)", textDecoration: "none" }}>Submit your wallet manifest →</Link>
            {" · "}Confidence labels are set by Zetta review after on-chain audit. {totalLabeled}/{totalAgents} agents reviewed.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
