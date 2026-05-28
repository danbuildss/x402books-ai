import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";

export const metadata: Metadata = {
  title: "AEON × x402Books — Settlement meets financial readability",
  description:
    "AEON handles autonomous settlement and payment execution. x402Books indexes, classifies, and makes that activity financially readable. Luca generates the operational verdict.",
  openGraph: {
    title: "AEON × x402Books",
    description: "Settlement execution meets financial readability.",
    url: "https://www.x402books.xyz/aeon",
    siteName: "x402Books AI",
  },
};

const WALLETS_EXAMPLE = `{
  "agent": "YourAgent",
  "xHandle": "@yourhandle",
  "ecosystem": "AEON",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "notes": "Main protocol treasury"
    },
    {
      "address": "0x...",
      "role": "fee",
      "chain": "base",
      "notes": "Fee recipient"
    },
    {
      "address": "0x...",
      "role": "deployer",
      "chain": "base"
    },
    {
      "address": "0x...",
      "role": "operator",
      "chain": "base",
      "notes": "Hot wallet / operational spend"
    }
  ]
}`;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "AEON agent executes settlement",
    body: "Autonomous payment flows, fee collection, and treasury movements happen on-chain — no human in the loop.",
  },
  {
    n: "02",
    title: "x402Books indexes the activity",
    body: "Wallet flows are classified: settlements, revenue, internal transfers, inference spend, recurring patterns.",
  },
  {
    n: "03",
    title: "Luca generates a verdict",
    body: "Cold operational signals surface: stable treasury, heavy outbound, recurring flow detected, roles verified.",
  },
  {
    n: "04",
    title: "Public profile — shareable, auditable",
    body: "Every AEON agent gets a readable financial identity. Verifiable by anyone. No hype. Just data.",
  },
];

export default function AeonPage() {
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
          <div className="lp-hero-copy" style={{ maxWidth: 620 }}>
            <div className="lp-v1-badge" style={{ marginBottom: 20 }}>
              <span className="lp-v1-dot" />
              Ecosystem Integration · Live
            </div>
            <p className="lp-eyebrow">AEON × x402Books</p>
            <h1 className="lp-h1" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
              Settlement execution meets<br />
              <em>financial readability.</em>
            </h1>
            <p className="lp-hero-sub" style={{ maxWidth: 520 }}>
              AEON handles autonomous settlement and payment flows.
              x402Books indexes, classifies, and makes that activity readable.
              Luca generates the operational verdict.
            </p>
            <div className="lp-hero-actions">
              <Link href="/registry/aeon" className="lp-btn-primary lp-btn-lg">
                View AEON Registry Profile →
              </Link>
              <a
                href="https://github.com/aaronjmars/aeon"
                target="_blank"
                rel="noreferrer"
                className="lp-btn-ghost lp-btn-lg"
              >
                AEON on GitHub ↗
              </a>
            </div>
          </div>

          {/* Triangle card */}
          <div className="lp-hero-card" style={{ maxWidth: 340 }} aria-label="The triangle">
            <div className="lp-card-header">
              <span className="lp-card-dot green" />
              <span className="lp-card-dot yellow" />
              <span className="lp-card-dot red" />
              <span className="lp-card-title">The Triangle</span>
            </div>
            <div style={{ padding: "1.2rem 1rem", display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "AEON", role: "Execution + Settlement Layer", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
                { label: "x402Books", role: "Financial Visibility Layer", color: "var(--accent)", bg: "rgba(109,184,116,0.08)", border: "rgba(109,184,116,0.18)" },
                { label: "Luca", role: "Operational Intelligence Layer", color: "var(--blue)", bg: "rgba(91,143,168,0.08)", border: "rgba(91,143,168,0.18)" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ padding: "10px 14px", borderRadius: 9, background: item.bg, border: `1px solid ${item.border}` }}
                >
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: item.color }}>{item.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>{item.role}</p>
                </div>
              ))}
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
                AEON settles. x402Books reads the settlement.
                Luca explains what it means operationally.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-section lp-section-alt" id="how">
          <div className="lp-section-head">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-h2">From autonomous settlement to readable financial identity.</h2>
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

        {/* ── Wallet manifest ── */}
        <section className="lp-section" id="manifest" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div className="lp-x402-grid" style={{ alignItems: "start" }}>
            <div>
              <p className="lp-section-label">Wallet Manifest</p>
              <h2 className="lp-h2" style={{ margin: "12px 0 14px" }}>
                Declare roles.<br />Get classified.
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 440, marginBottom: 20 }}>
                AEON agents add a <code style={{ fontSize: "0.85em", padding: "1px 5px", background: "var(--surface-soft)", borderRadius: 4 }}>.x402books/wallets.json</code> file
                to their repo. x402Books reads the declared roles — treasury, fee, deployer, operator — and upgrades the financial profile from candidate to verified.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {[
                  { role: "treasury", desc: "Main protocol treasury" },
                  { role: "fee",      desc: "Fee recipient wallet" },
                  { role: "deployer", desc: "Contract deployer" },
                  { role: "operator", desc: "Hot wallet / operational spend" },
                ].map((r) => (
                  <div key={r.role} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "0.72rem", padding: "2px 9px", borderRadius: 99, background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(109,184,116,0.2)", fontWeight: 600, minWidth: 72, textAlign: "center" }}>
                      {r.role}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{r.desc}</span>
                  </div>
                ))}
              </div>
              <Link href="/registry#verify" className="lp-btn-primary">
                Submit your manifest →
              </Link>
            </div>

            <div className="lp-x402-code-wrap" style={{ fontFamily: "monospace" }}>
              <div className="lp-x402-code-head">
                <span className="lp-card-dot green" />
                <span className="lp-card-dot yellow" />
                <span className="lp-card-dot red" />
                <span style={{ fontSize: 12, color: "rgba(232,230,225,0.35)", marginLeft: 8 }}>
                  .x402books/wallets.json
                </span>
              </div>
              <pre className="lp-x402-code" style={{ fontSize: "0.76rem" }}>{WALLETS_EXAMPLE}</pre>
            </div>
          </div>
        </section>

        {/* ── Why it matters ── */}
        <section className="lp-section lp-section-alt" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div className="lp-section-head">
            <p className="lp-section-label">Why it matters</p>
            <h2 className="lp-h2">Autonomous agents need financial identity.</h2>
            <p className="lp-section-sub" style={{ maxWidth: 560 }}>
              AEON agents operate economically — they earn fees, move treasury, pay for compute. Without financial readability, that activity is invisible. x402Books makes it legible.
            </p>
          </div>
          <div className="lp-features-grid">
            {[
              { icon: "verified", title: "Verifiable wallet roles", body: "treasury, fee, deployer, and operator roles declared and indexed — not guessed." },
              { icon: "insights", title: "Settlement classification", body: "Heavy outbound, stable treasury, recurring flows, unknown counterparties — signals that matter operationally." },
              { icon: "share", title: "Shareable public profile", body: "Every AEON agent gets a permanent financial profile. Link it. Post it. Use it as a trust signal." },
              { icon: "terminal", title: "API-readable", body: "Query any AEON agent's financial state via API. Built for agent-to-agent communication." },
            ].map((f) => (
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

        {/* ── CTA ── */}
        <section className="lp-section" style={{ paddingTop: "4rem", paddingBottom: "5rem", textAlign: "center" }}>
          <p className="lp-section-label">Get started</p>
          <h2 className="lp-h2" style={{ marginBottom: 12 }}>Make your AEON agent financially readable.</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", maxWidth: 440, margin: "0 auto 28px" }}>
            Add a wallet manifest. Submit for verification. Get a public treasury profile that agents, builders, and operators can trust.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/registry/aeon" className="lp-btn-primary lp-btn-lg">
              AEON Registry Profile →
            </Link>
            <Link href="/registry#verify" className="lp-btn-ghost lp-btn-lg">
              Verify your agent
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
            <Link href="/aeon">AEON</Link>
            <Link href="/registry?eco=BANKR">BANKR</Link>
            <Link href="/registry?eco=Virtuals">Virtuals</Link>
            <Link href="/registry?eco=Base">Base</Link>
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
