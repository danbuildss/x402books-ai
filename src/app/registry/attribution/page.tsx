import type { Metadata } from "next";
import Link from "next/link";
import { getAttributionMetrics } from "@/lib/attribution-health";
import type { ManifestStatus, AttributionConfidence, AgentAttributionHealth } from "@/lib/attribution-health";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Attribution Health Report | Zetta",
  description: "Which agents have verified wallet attribution, which are pending, and what coverage Zetta has across the autonomous agent economy.",
};

export const dynamic = "force-dynamic";

// ── Styling helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<ManifestStatus, { label: string; color: string; description: string }> = {
  manifest:  { label: "Manifest",    color: "#22c55e", description: "Wallets declared via .agent/wallets.json in the agent's repository. Highest trust." },
  admin:     { label: "Admin",       color: "#6DB874", description: "Wallets attributed by Zetta admin review. Verified but not self-declared." },
  inferred:  { label: "Inferred",    color: "#f59e0b", description: "Wallets identified via on-chain signals. Awaiting agent verification." },
  none:      { label: "Unattributed",color: "#6b7280", description: "No wallet data. Revenue and financial books are unavailable for this agent." },
};

const CONF_META: Record<AttributionConfidence, { label: string; color: string }> = {
  high:         { label: "High",         color: "#22c55e" },
  medium:       { label: "Medium",       color: "#f59e0b" },
  low:          { label: "Low",          color: "#ef4444" },
  unattributed: { label: "Unattributed", color: "#6b7280" },
};

const STATUS_ORDER: ManifestStatus[] = ["manifest", "admin", "inferred", "none"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AttributionHealthPage() {
  const metrics = await getAttributionMetrics();

  const grouped: Record<ManifestStatus, AgentAttributionHealth[]> = {
    manifest: metrics.agents.filter((a) => a.manifest_status === "manifest"),
    admin:    metrics.agents.filter((a) => a.manifest_status === "admin"),
    inferred: metrics.agents.filter((a) => a.manifest_status === "inferred"),
    none:     metrics.agents.filter((a) => a.manifest_status === "none"),
  };

  const attrTotal   = metrics.total_agents;
  const mPct        = attrTotal > 0 ? (metrics.status_breakdown.manifest        / attrTotal) * 100 : 0;
  const aPct        = attrTotal > 0 ? (metrics.status_breakdown.admin_attributed / attrTotal) * 100 : 0;
  const iPct        = attrTotal > 0 ? (metrics.status_breakdown.inferred         / attrTotal) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid var(--line)", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, height: 56 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Zetta</Link>
        <Link href="/registry" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>Registry</Link>
        <Link href="/registry/attribution" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Attribution Health</Link>
        <Link href="/methodology" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13, marginLeft: "auto" }}>Methodology</Link>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
            Attribution Health Report
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 16px", maxWidth: 600 }}>
            Attribution is the foundation of every financial product we build. Without wallet attribution, there are no books, no revenue, no GDP. This report tracks coverage across the registry.
          </p>
        </div>

        {/* Platform KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Indexed Agents",          value: String(metrics.total_agents),                   note: "total in registry",              color: "var(--ink)" },
            { label: "Attributed Agents",        value: String(metrics.manifest_attributed_agents),     note: "manifest-declared wallets",      color: "#22c55e" },
            { label: "Discovered Agents",        value: String(metrics.discovered_agents),              note: "admin/inferred — no books",      color: "#f59e0b" },
            { label: "Unattributed",             value: String(metrics.unattributed_agents),            note: "no wallets yet",                 color: "#6b7280" },
            { label: "Attribution Coverage",     value: `${metrics.attribution_coverage_pct}%`,         note: "manifest-attributed / total",    color: "#6DB874" },
            { label: "Books-eligible Wallets",   value: String(metrics.books_eligible_wallets),         note: "manifest + non-contract",        color: "#22c55e" },
            { label: "Contract Addresses",       value: String(metrics.contract_wallets),               note: "never used for books",           color: "#ef4444" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)", marginBottom: 2 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{kpi.note}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 24px", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Coverage breakdown</h2>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{metrics.total_agents} agents total</span>
          </div>

          <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: "var(--line)", display: "flex", marginBottom: 16 }}>
            <div style={{ width: `${mPct}%`, background: STATUS_META.manifest.color }} />
            <div style={{ width: `${aPct}%`, background: STATUS_META.admin.color, opacity: 0.7 }} />
            <div style={{ width: `${iPct}%`, background: STATUS_META.inferred.color, opacity: 0.5 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {STATUS_ORDER.map((status) => {
              const meta  = STATUS_META[status];
              const count = metrics.status_breakdown[status === "admin" ? "admin_attributed" : status === "none" ? "none" : status];
              const pct   = attrTotal > 0 ? Math.round((count / attrTotal) * 100) : 0;
              return (
                <div key={status} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{count} agents · {pct}%</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{meta.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent groups */}
        {STATUS_ORDER.map((status) => {
          const meta  = STATUS_META[status];
          const items = grouped[status];
          return (
            <section key={status} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{meta.label}</h2>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>({items.length})</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>{meta.description}</p>
              {items.length === 0 ? (
                <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>None in this category.</div>
              ) : status === "none" ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.slice(0, 30).map((agent) => (
                    <Link
                      key={agent.slug}
                      href={`/registry/${agent.slug}`}
                      style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--line)", fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
                    >
                      {agent.name}
                    </Link>
                  ))}
                  {items.length > 30 && (
                    <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>+{items.length - 30} more</span>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map((agent) => {
                    const conf = CONF_META[agent.confidence];
                    return (
                      <div key={agent.slug} style={{ background: "var(--surface)", border: `1px solid ${meta.color}33`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link href={`/registry/${agent.slug}`} style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", textDecoration: "none" }}>
                            {agent.name}
                          </Link>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{agent.ecosystem}</span>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            {agent.wallet_count} wallet{agent.wallet_count !== 1 ? "s" : ""}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            roles {agent.role_coverage_pct}%
                          </span>
                          {agent.has_revenue_wallet && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: "#22c55e22", color: "#22c55e" }}>rev</span>
                          )}
                          {agent.has_treasury_wallet && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: "#5B8FA822", color: "#5B8FA8" }}>treasury</span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${conf.color}18`, color: conf.color }}>
                            {conf.label}
                          </span>
                          <Link href={`/registry/${agent.slug}`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                            Profile →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {/* How to improve CTA */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "24px 28px", marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>How to improve your attribution</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 16px" }}>
            The fastest path to High Confidence attribution is a wallet manifest: a single JSON file in your repository that declares your wallets, their roles, and their chain.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["1. Add `.agent/wallets.json`", "Declare each wallet address, its role (treasury / fee / operator), and chain."],
              ["2. Submit via registry", "Open a PR or use the registry submission flow to register your manifest."],
              ["3. Zetta audits",        "We verify the declared wallets against on-chain data and classify your revenue."],
            ].map(([title, body]) => (
              <div key={title as string}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/manifest" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              Manifest guide →
            </Link>
            <Link href="/registry#verify" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              Submit your agent →
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            Attribution metrics update every 15 minutes. <strong>Attributed</strong> = manifest-declared, books-eligible wallets only.
            Discovered agents (admin/inferred wallets) are indexed but do not produce books, revenue, or GDP.
            {" · "}{metrics.manifest_attributed_agents} attributed · {metrics.discovered_agents} discovered · {metrics.unattributed_agents} unattributed · {metrics.total_agents} total.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
