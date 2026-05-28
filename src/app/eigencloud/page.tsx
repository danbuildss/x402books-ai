import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";

export const metadata: Metadata = {
  title: "EigenCloud × x402Books — Attested execution meets financial readability",
  description:
    "EigenCloud provides verifiable agent execution. x402Books provides readable financial identity. Together: attested execution + transparent treasury = full trust for autonomous agents.",
  openGraph: {
    title: "EigenCloud × x402Books",
    description: "Attested execution meets financial readability.",
    url: "https://www.x402books.xyz/eigencloud",
    siteName: "x402Books AI",
  },
};

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "EigenCloud attests execution",
    body: "The agent ran. The task completed. The output is verifiable. EigenCloud provides cryptographic proof of what the agent did.",
  },
  {
    n: "02",
    title: "x402Books reads the financial trail",
    body: "What did it earn? What did it spend? Treasury health, settlement patterns, wallet roles — indexed and classified automatically.",
  },
  {
    n: "03",
    title: "Luca generates the verdict",
    body: "Cold operational intelligence: stable treasury, recurring settlement detected, roles verified. No hype. Just what happened financially.",
  },
  {
    n: "04",
    title: "Full trust picture — shareable",
    body: "Verified execution + readable treasury = an agent any operator, builder, or protocol can trust by default.",
  },
];

const WHY_IT_MATTERS = [
  {
    icon: "verified_user",
    title: "Execution trust",
    body: "EigenCloud proves the agent did what it claimed. x402Books proves what it earned and spent doing it.",
  },
  {
    icon: "account_balance",
    title: "Treasury transparency",
    body: "Wallet roles declared, settlement patterns classified, treasury health scored — visible to anyone, no access required.",
  },
  {
    icon: "share",
    title: "Shareable identity",
    body: "One profile link. Attested execution history + financial track record. The trust signal autonomous agents have been missing.",
  },
  {
    icon: "terminal",
    title: "Agent-native",
    body: "Both EigenCloud and x402Books are built for agents calling agents. Machine-readable. No human in the loop.",
  },
];

export default function EigenCloudPage() {
  return (
    <div className="lp-root">
      {/* ── Header ── */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/registry">Registry</Link>
          <Link href="/luca">Luca</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="lp-hero" style={{ minHeight: "auto", paddingBottom: "5rem" }}>
          <div className="lp-hero-copy" style={{ maxWidth: 640 }}>
            <div className="lp-v1-badge" style={{ marginBottom: 20 }}>
              <span className="lp-v1-dot" />
              Ecosystem Integration · In Progress
            </div>
            <p className="lp-eyebrow">EigenCloud × x402Books</p>
            <h1 className="lp-h1" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
              Attested execution meets<br />
              <em>financial readability.</em>
            </h1>
            <p className="lp-hero-sub" style={{ maxWidth: 540 }}>
              EigenCloud proves what the agent did. x402Books proves what it earned and spent.
              Together: the complete trust picture for autonomous economic agents.
            </p>
            <div className="lp-hero-actions">
              <Link href="/registry" className="lp-btn-primary lp-btn-lg">
                View Agent Registry →
              </Link>
              <Link href="/registry#verify" className="lp-btn-ghost lp-btn-lg">
                Verify your agent
              </Link>
            </div>
          </div>

          {/* Trust card */}
          <div className="lp-hero-card" style={{ maxWidth: 340 }} aria-label="The trust stack">
            <div className="lp-card-header">
              <span className="lp-card-dot green" />
              <span className="lp-card-dot yellow" />
              <span className="lp-card-dot red" />
              <span className="lp-card-title">Agent Trust Stack</span>
            </div>
            <div style={{ padding: "1.2rem 1rem", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                {
                  label: "EigenCloud",
                  role: "Attested Execution Layer",
                  sub: "Verifiable proof of what the agent did",
                  color: "#F97316",
                  bg: "rgba(249,115,22,0.08)",
                  border: "rgba(249,115,22,0.2)",
                },
                {
                  label: "x402Books",
                  role: "Financial Identity Layer",
                  sub: "Readable treasury, wallet roles, settlement patterns",
                  color: "var(--accent)",
                  bg: "rgba(109,184,116,0.08)",
                  border: "rgba(109,184,116,0.18)",
                },
                {
                  label: "Luca",
                  role: "Operational Intelligence Layer",
                  sub: "Cold verdict — what it means financially",
                  color: "var(--blue)",
                  bg: "rgba(91,143,168,0.08)",
                  border: "rgba(91,143,168,0.18)",
                },
              ].map((item) => (
                <div key={item.label} style={{ padding: "10px 14px", borderRadius: 9, background: item.bg, border: `1px solid ${item.border}` }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: item.color }}>{item.label}</p>
                  <p style={{ margin: "1px 0 0", fontSize: "0.75rem", color: "var(--ink)", fontWeight: 600 }}>{item.role}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-section lp-section-alt" id="how">
          <div className="lp-section-head">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-h2">From attested execution to full financial identity.</h2>
          </div>
          <div className="lp-steps">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.n} className="lp-step">
                <span className="lp-step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why it matters ── */}
        <section className="lp-section" id="why" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div className="lp-section-head">
            <p className="lp-section-label">Why it matters</p>
            <h2 className="lp-h2">Agents need more than execution proof.</h2>
            <p className="lp-section-sub" style={{ maxWidth: 520 }}>
              Knowing an agent ran correctly is the first half. Knowing what it earned, spent, and holds is the second half.
              Together they create an agent any operator can audit without asking.
            </p>
          </div>
          <div className="lp-features-grid">
            {WHY_IT_MATTERS.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <span className="lp-feature-icon">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The statement ── */}
        <section className="lp-section lp-section-alt" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <p className="lp-section-label">The bet</p>
            <h2 className="lp-h2" style={{ lineHeight: 1.3 }}>
              Autonomous agents will need wallets, treasury systems, accounting, and auditability.
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.8, marginTop: 20, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              Humans needed QuickBooks, Stripe, Bloomberg, and Plaid. Agents will need x402Books.
              EigenCloud ensures execution happens correctly. x402Books ensures the financial record is readable.
              That combination is how autonomous agents earn trust at scale.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lp-section" style={{ paddingTop: "4rem", paddingBottom: "5rem", textAlign: "center" }}>
          <p className="lp-section-label">Get started</p>
          <h2 className="lp-h2" style={{ marginBottom: 12 }}>Make your agent financially readable.</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", maxWidth: 420, margin: "0 auto 28px" }}>
            Add a wallet manifest. Submit for verification. Get a public treasury profile — shareable, auditable, agent-native.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">
              Verify your agent →
            </Link>
            <Link href="/registry" className="lp-btn-ghost lp-btn-lg">
              Browse the Registry
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Product</p>
            <Link href="/dashboard">App</Link>
            <Link href="/registry">Registry</Link>
            <Link href="/luca">Meet Luca</Link>
            <Link href="/developer">Developer</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Ecosystems</p>
            <Link href="/eigencloud">EigenCloud</Link>
            <Link href="/aeon">AEON</Link>
            <Link href="/registry?eco=BANKR">BANKR</Link>
            <Link href="/registry?eco=Virtuals">Virtuals</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Docs</p>
            <Link href="/docs#api">API Reference</Link>
            <Link href="/docs#roadmap">Roadmap</Link>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">@AskLucaBot</a>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 x402Books AI. Not financial advice.</p>
      </footer>
    </div>
  );
}
