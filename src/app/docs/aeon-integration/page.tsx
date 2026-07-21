import type { Metadata } from "next";
import Link from "next/link";
import { LedgerCard, LedgerRow, SectionLabel } from "@/components/ui/ledger";
import { MetricCard, MetricGrid } from "@/components/ui/metric";

export const metadata: Metadata = {
  title: "AEON Integration Guide | Zetta",
  description: "How AEON agents connect to Zetta for financial identity, settlement tracking, and operational intelligence.",
};

export default function AeonIntegrationPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/docs" style={{ color: "var(--accent)", textDecoration: "none" }}>Docs</Link>
        {" / "}AEON Integration
      </p>

      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <SectionLabel style={{ marginBottom: 8 }}>Partnership Guide</SectionLabel>
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
          Zetta × AEON
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 580 }}>
          AEON is the execution and settlement layer for autonomous agents.
          Zetta is the financial visibility layer. Together they close the loop:
          AEON agents can settle, earn, and spend — Zetta makes that activity
          readable, attributable, and auditable.
        </p>
      </div>

      {/* The triangle */}
      <LedgerCard eyebrow="The infrastructure triangle" style={{ marginBottom: 48 }}>
        <MetricGrid cols={3}>
          <MetricCard label="AEON" value="Execution" sub="Settlement layer" valueColor="#4AE8A0" />
          <MetricCard label="Zetta" value="Visibility" sub="Financial identity layer" valueColor="#5B9EF4" />
          <MetricCard label="Luca" value="Intelligence" sub="Operational intel layer" valueColor="#8B7CF6" />
        </MetricGrid>
      </LedgerCard>

      {/* What Zetta provides AEON agents */}
      <section style={{ marginBottom: 48 }}>
        <SectionLabel style={{ marginBottom: 16 }}>What Zetta provides AEON agents</SectionLabel>
        <LedgerCard>
          {[
            { title: "Verified financial identity",    body: "A public, on-chain-verifiable profile for every AEON agent. Wallets declared via ERC-8004 manifest, signatures verified, claims tracked." },
            { title: "Settlement classification",       body: "Zetta reads AEON wallet transactions and classifies them: settlement revenue, inference spend, treasury movement, internal transfers." },
            { title: "Luca financial intelligence",     body: "Luca generates plain-English summaries of every agent's financial patterns — settlement quality, revenue attribution, treasury health." },
            { title: "Embeddable verification badges",  body: "One-line badge for any agent's GitHub README. Auto-updates as verification status and score change." },
            { title: "Surplus inference logging",       body: "AEON agents using Surplus can log inference spend to Zetta. Completeness: Luca sees the full cost side, not just revenue." },
          ].map((f, i, arr) => (
            <LedgerRow
              key={f.title}
              first={i === 0}
              last={i === arr.length - 1}
              label={
                <div>
                  <strong style={{ display: "block", marginBottom: 3 }}>{f.title}</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>{f.body}</span>
                </div>
              }
              value=""
              style={{ alignItems: "flex-start", padding: "12px 14px" }}
            />
          ))}
        </LedgerCard>
      </section>

      {/* Integration steps */}
      <section style={{ marginBottom: 48 }}>
        <SectionLabel style={{ marginBottom: 16 }}>Integration steps for AEON agents</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            {
              n: "1", title: "Create .agent/wallets.json",
              body: "Add the ERC-8004 manifest to your agent's repo. Declare treasury, fee_recipient, and operator wallets with their chain and role.",
              code: `# In your agent repo root
mkdir -p .agent
# Create .agent/wallets.json — see /docs/erc-8004`,
            },
            {
              n: "2", title: "Submit your manifest to Zetta",
              body: "Go to zetta.finance/register and paste your repo URL. Zetta fetches, validates, and indexes your manifest automatically.",
              code: null,
            },
            {
              n: "3", title: "Claim your profile",
              body: "Visit your agent's Zetta profile and use the wallet-sign path to cryptographically prove ownership. Signed claims fast-track to admin review.",
              code: null,
            },
            {
              n: "4", title: "Embed the verification badge",
              body: "Add a live badge to your README. It shows your current verification tier and auto-updates.",
              code: `![Zetta](https://zetta.finance/api/badge/your-agent-slug)`,
            },
            {
              n: "5", title: "Use the API for operational intelligence",
              body: "Query Luca reports, pull settlement patterns, read treasury health — all via the v1 API.",
              code: `curl -H "X-API-Key: YOUR_KEY" \\
  https://zetta.finance/api/v1/registry/agents/your-agent`,
            },
          ].map((s, i, arr) => (
            <div key={s.n} style={{ display: "flex", gap: 0 }}>
              {/* Timeline */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 40 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--accent)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.72rem", fontWeight: 800, flexShrink: 0,
                }}>
                  {s.n}
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--line)", margin: "4px 0" }} />}
              </div>
              {/* Content */}
              <div style={{ paddingLeft: 14, paddingBottom: 24, flex: 1 }}>
                <p style={{ fontSize: "0.86rem", fontWeight: 700, marginBottom: 5, marginTop: 4 }}>{s.title}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: s.code ? 10 : 0 }}>{s.body}</p>
                {s.code && (
                  <pre style={{
                    fontSize: "0.75rem", lineHeight: 1.6,
                    background: "var(--bg)", borderRadius: 8,
                    padding: "10px 14px", overflowX: "auto", margin: 0,
                    border: "1px solid var(--line)",
                  }}>
                    <code>{s.code}</code>
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partnership CTA */}
      <section style={{
        marginBottom: 48, padding: "24px 26px", borderRadius: 12,
        border: "1px solid rgba(74,232,160,0.3)", background: "rgba(74,232,160,0.04)",
        borderLeft: "3px solid var(--accent)",
      }}>
        <p style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 8 }}>
          AEON ecosystem integration
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
          If you run an AEON-based project and want deeper integration — co-indexed
          agents, shared verification pipelines, or joint reporting — reach out directly.
          We&apos;re building this for the ecosystem, not just one agent at a time.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="https://x.com/zettatracker" target="_blank" rel="noreferrer" style={{
            display: "inline-block", padding: "8px 16px", borderRadius: 8,
            background: "var(--accent)", color: "#fff",
            fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
          }}>
            Message @zettatracker →
          </a>
          <Link href="/register" style={{
            display: "inline-block", padding: "8px 16px", borderRadius: 8,
            border: "1px solid var(--line)", color: "var(--ink)",
            fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
          }}>
            Register your agent
          </Link>
        </div>
      </section>

      {/* Footer links */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        {[
          { href: "/docs/erc-8004", label: "ERC-8004 spec" },
          { href: "/developer",     label: "Developer portal" },
          { href: "/docs",          label: "Full docs" },
          { href: "/registry",      label: "Browse registry" },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ fontSize: "0.82rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            {l.label} →
          </Link>
        ))}
      </div>
    </main>
  );
}
