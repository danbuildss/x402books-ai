import type { Metadata } from "next";
import Link from "next/link";

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
        <p style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
          Partnership Guide
        </p>
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
      <section style={{
        marginBottom: 48, padding: "20px 24px", borderRadius: 12,
        border: "1px solid var(--line)", background: "var(--surface)",
      }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 12, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          The infrastructure triangle
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { name: "AEON",  role: "Execution + settlement layer",        color: "#6DB874" },
            { name: "Zetta", role: "Financial visibility layer",           color: "#3b82f6" },
            { name: "Luca",  role: "Operational intelligence layer",       color: "#a78bfa" },
          ].map(n => (
            <div key={n.name} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: n.color, marginBottom: 4 }}>{n.name}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>{n.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Zetta provides AEON agents */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          What Zetta provides AEON agents
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: "verified_user", title: "Verified financial identity",    body: "A public, on-chain-verifiable profile for every AEON agent. Wallets declared via ERC-8004 manifest, signatures verified, claims tracked." },
            { icon: "analytics",     title: "Settlement classification",       body: "Zetta reads AEON wallet transactions and classifies them: settlement revenue, inference spend, treasury movement, internal transfers." },
            { icon: "psychology",    title: "Luca financial intelligence",     body: "Luca generates plain-English summaries of every agent's financial patterns — settlement quality, revenue attribution, treasury health." },
            { icon: "badge",         title: "Embeddable verification badges",  body: "One-line badge for any agent's GitHub README. Auto-updates as verification status and score change." },
            { icon: "timeline",      title: "Surplus inference logging",       body: "AEON agents using Surplus can log inference spend to Zetta. Completeness: Luca sees the full cost side, not just revenue." },
          ].map(f => (
            <div key={f.title} style={{ display: "flex", gap: 14, padding: "16px 18px", borderRadius: 10, border: "1px solid var(--line)", alignItems: "flex-start" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: "0.84rem", fontWeight: 700, marginBottom: 4 }}>{f.title}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integration steps */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Integration steps for AEON agents
        </h2>
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
                    background: "var(--code-bg, rgba(0,0,0,0.04))", borderRadius: 8,
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
        border: "1px solid rgba(109,184,116,0.3)", background: "rgba(109,184,116,0.04)",
        borderLeft: "3px solid var(--accent)",
      }}>
        <p style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 8 }}>
          AEON ecosystem integration
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
          If you run an AEON-based project and want deeper integration — co-indexed
          agents, shared verification pipelines, or joint reporting — reach out directly.
          We're building this for the ecosystem, not just one agent at a time.
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
