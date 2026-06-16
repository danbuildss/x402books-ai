"use client";

import Link from "next/link";
import { HomeHeader } from "@/app/home-header";

const TELEGRAM  = "https://t.me/AskLucaBot";
const X_HANDLE  = "https://x.com/AskLucaAI";

const WHAT_LUCA_COVERS = [
  {
    label: "Revenue Analysis",
    body: "Top earners, growth rates, revenue concentration across attributed agents. Sourced from declared wallets — on-chain, confirmed.",
  },
  {
    label: "Treasury Intelligence",
    body: "Capital allocation, runway, treasury movements. Luca reads the books and flags what matters.",
  },
  {
    label: "Expense Patterns",
    body: "Spend categories, operational cost trends, gas analysis. Every outflow classified and contextualized.",
  },
  {
    label: "Attribution Gap",
    body: "What the unattributed portion of the economy might represent. How coverage changes as more agents declare wallets.",
  },
];

const REPORT_TYPES = [
  { label: "Weekly",    desc: "Agent GDP snapshot, top performers, notable movements" },
  { label: "Monthly",  desc: "Revenue trends, expense analysis, treasury patterns" },
  { label: "Quarterly", desc: "Ecosystem breakdowns, growth observations, market analysis" },
];

// ── $LUCA API Access ──────────────────────────────────────────────────────────

function LucaAccessSection() {
  return (
    <section className="lp-section lp-section-alt" id="access">
      <div className="lp-section-head">
        <p className="lp-section-label">API Access</p>
        <h2 className="lp-h2">Developer access.</h2>
        <p className="lp-hero-sub" style={{ maxWidth: 560, marginTop: 8 }}>
          The x402Books API is open. Hold $LUCA to unlock higher rate limits.
          Free tier: 100 requests/day. $LUCA holders: up to 2,000 requests/day.
        </p>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
        {[
          { tier: "Free", limit: "100 req/day", desc: "No token required" },
          { tier: "Holder",   limit: "500 req/day",   desc: "Hold ≥1,000 $LUCA" },
          { tier: "Enterprise",    limit: "2,000 req/day",  desc: "Hold ≥10,000 $LUCA" },
        ].map((t) => (
          <div key={t.tier} style={{
            flex: "1 1 180px",
            padding: "16px 20px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "var(--surface-soft)",
          }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.88rem" }}>{t.tier}</p>
            <p style={{ margin: "0 0 4px", fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, color: "var(--accent)" }}>{t.limit}</p>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>{t.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <Link href="/developer" className="lp-btn-primary">Get API Key →</Link>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LucaPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── Hero ── */}
      <section className="lp-hero" style={{ minHeight: "auto", paddingBottom: "3rem" }}>
        <div className="lp-hero-copy" style={{ maxWidth: 660 }}>
          <p className="lp-eyebrow">Financial Analyst · x402Books</p>
          <h1 className="lp-h1">
            Luca reads<br />
            <em>the books.</em>
          </h1>
          <p className="lp-hero-sub">
            Luca is x402Books&rsquo; financial analyst. Revenue, expenses, treasury activity, attribution gaps —
            interpreted from on-chain data, written in plain language. Bloomberg Intelligence for the agent economy.
          </p>
          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <Link href="/research" className="lp-btn-primary lp-btn-lg">Read the Reports →</Link>
            <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lp-btn-ghost lp-btn-lg">
              @AskLucaBot
            </a>
          </div>
        </div>
      </section>

      {/* ── What Luca Covers ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <p className="lp-section-label">Coverage</p>
          <h2 className="lp-h2">What Luca analyzes.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 28 }}>
          {WHAT_LUCA_COVERS.map((item) => (
            <div key={item.label} style={{
              padding: "18px 20px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--surface-soft)",
            }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "0.88rem" }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── State of the Agent Economy ── */}
      <section className="lp-section">
        <div className="lp-registry-inner">
          <div className="lp-registry-text">
            <p className="lp-section-label">Publication</p>
            <h2 className="lp-h2" style={{ margin: "10px 0 12px" }}>State of the<br />Agent Economy.</h2>
            <p className="lp-registry-sub">
              Luca&rsquo;s flagship publication. Weekly, monthly, and quarterly reports on revenue, expenses,
              treasury health, and the attribution gap across autonomous agents on Base.
              Grounded entirely in on-chain data. No estimates. No synthetic numbers.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "20px 0" }}>
              {REPORT_TYPES.map((r) => (
                <div key={r.label} style={{ display: "flex", gap: 12, fontSize: "0.83rem", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, color: "var(--accent)", width: 72, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ color: "var(--muted)" }}>{r.desc}</span>
                </div>
              ))}
            </div>
            <Link href="/research" className="lp-btn-primary" style={{ display: "inline-block" }}>
              Read All Reports →
            </Link>
          </div>

          <div className="lp-registry-card">
            <div className="lp-card-header">
              <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
              <span className="lp-card-title">Luca · Financial Analyst</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 600, margin: "0 0 6px" }}>
                Style
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--fg)", lineHeight: 1.6, margin: "0 0 14px", fontStyle: "italic" }}>
                &ldquo;Bloomberg Intelligence analyst. Cold. Precise. Factual. No hype. No marketing language.&rdquo;
              </p>
              <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 600, margin: "0 0 6px" }}>
                Data Sources
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "On-chain books", desc: "Declared wallet manifests → classified transactions → P&L" },
                  { label: "Grok research", desc: "Real-time X/web context on agents and ecosystems" },
                  { label: "Attribution index", desc: "Which agents are included and what the gap represents" },
                ].map((item) => (
                  <div key={item.label} style={{ padding: "8px 10px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 7 }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.75rem" }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Telegram terminal ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <p className="lp-section-label">Public Interface</p>
          <h2 className="lp-h2">Luca on Telegram.</h2>
          <p className="lp-hero-sub" style={{ maxWidth: 560, marginTop: 8 }}>
            @AskLucaBot is Luca&rsquo;s public terminal. Submit a wallet address and Luca will return a
            classified financial breakdown — revenue, expenses, net income, treasury health.
          </p>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
          {[
            "Submit any Base wallet address",
            "Get revenue, expenses, net income",
            "Treasury health classification",
            "Settlement pattern detection",
            "Ask questions about agent books",
          ].map((item) => (
            <div key={item} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 8,
              background: "var(--surface-soft)", fontSize: "0.82rem",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--accent)" }}>check_circle</span>
              {item}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lp-btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Open @AskLucaBot
          </a>
          <a href={X_HANDLE} target="_blank" rel="noreferrer" className="lp-btn-ghost" style={{ marginLeft: 10 }}>
            Follow on X →
          </a>
        </div>
      </section>

      {/* ── API Access ── */}
      <LucaAccessSection />

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <h2 className="lp-h2">Get your agent in the report.</h2>
        <p>Submit a wallet manifest and Luca will include your agent in the next State of the Agent Economy.</p>
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">Submit Manifest →</Link>
          <Link href="/research" className="lp-btn-ghost lp-btn-lg">Read Reports</Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Product</p>
            <Link href="/dashboard">App</Link>
            <Link href="/registry">Registry</Link>
            <Link href="/research">Research</Link>
            <Link href="/developer">Developer</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Luca</p>
            <a href={TELEGRAM} target="_blank" rel="noreferrer">@AskLucaBot</a>
            <a href={X_HANDLE} target="_blank" rel="noreferrer">Follow on X</a>
            <Link href="/research">Reports</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Developer</p>
            <Link href="/developer">API Keys</Link>
            <Link href="/docs">Documentation</Link>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 x402Books. All rights reserved.</span>
          <span>Financial analysis generated by Luca.</span>
        </div>
      </footer>
    </div>
  );
}
