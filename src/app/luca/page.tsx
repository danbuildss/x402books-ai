"use client";

import { useState } from "react";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

const TELEGRAM  = "https://t.me/AskLucaBot";
const X_HANDLE  = "https://x.com/AskLucaAI";

const CAPABILITIES = [
  { label: "Analyze Agent",           desc: "Full financial analysis for any attributed agent. Revenue, expenses, net income, treasury, confidence signal." },
  { label: "Compare Agents",          desc: "Side-by-side financial comparison across agents or ecosystems. Which is growing faster. Which has better margin." },
  { label: "Explain Treasury",        desc: "Treasury movements classified and contextualized. Capital injections separated from operational inflows." },
  { label: "Explain Revenue",         desc: "Revenue sources broken down by category. Inference, settlement, fee — each classified and attributed." },
  { label: "Explain GDP Changes",     desc: "What is driving Agent GDP up or down. Which agents are contributing. What the attribution gap represents." },
  { label: "Explain Wallet Activity", desc: "Submit any Base wallet. Luca analyzes it against the agent books and returns a financial summary." },
];

const SUGGESTED_PROMPTS = [
  "How is AEON's revenue trending?",
  "Compare BANKR and VIRTUALS treasury",
  "What drove agent GDP this month?",
  "Explain AEON's inference spend",
  "What is the attribution gap?",
  "Show GAME's net income trend",
];

const EXAMPLE_ANALYSES = [
  {
    query: "How is AEON's revenue trending compared to last month?",
    rows: [
      { field: "ATTRIBUTION", value: "Manifest-declared wallets · operator role · Base · 30d window", positive: false },
      { field: "BOOKS",       value: "Operating revenue · expenses · net income · transaction count", positive: false },
      { field: "HISTORY",     value: "Period-over-period trend · expense ratio · net margin direction", positive: true },
      { field: "SIGNAL",      value: "Inference spend pattern · treasury movement · capital injection flags", positive: false },
    ],
    verdict: "Luca reads attributed on-chain activity and produces a financial verdict. No estimates. No synthetic data. Only what the manifest wallets show.",
    confidence: "LIVE",
  },
  {
    query: "What is BANKR's treasury position and runway?",
    rows: [
      { field: "ATTRIBUTION", value: "Manifest-declared wallets · role coverage · evidence source", positive: false },
      { field: "BOOKS",       value: "Revenue · expenses · net income · over the selected period", positive: false },
      { field: "HISTORY",     value: "Treasury trend · multi-sig inflow · consecutive profitable periods", positive: true },
      { field: "SIGNAL",      value: "Settlement pattern · stablecoin reserves · outflow classification", positive: false },
    ],
    verdict: "Treasury analysis is only available for agents with manifest-declared wallets. Submit a wallet manifest to unlock books.",
    confidence: "LIVE",
  },
];

const REPORT_TYPES = [
  { label: "Weekly",    desc: "Agent GDP snapshot, top performers, notable movements" },
  { label: "Monthly",  desc: "Revenue trends, expense analysis, treasury patterns" },
  { label: "Quarterly", desc: "Ecosystem breakdowns, growth observations, market analysis" },
];

const LUCA_SKILLS = [
  { name: "Wallet Audit",         desc: "Classify any address and check books-eligibility" },
  { name: "Agent Books",           desc: "Full P&L: revenue, expenses, net income, margin" },
  { name: "Treasury Monitor",      desc: "Live stablecoin balances and health signal" },
  { name: "Revenue Analysis",      desc: "Gross inflow vs operating revenue breakdown" },
  { name: "Registry Check",        desc: "Look up any agent by slug, name, or address" },
  { name: "Luca Report",           desc: "Full composite: identity + books + treasury + narrative" },
  { name: "B20 Token Analysis",    desc: "Token identity, issuer, activity, financial readiness" },
];

const DATA_SOURCES = [
  { label: "On-chain books", desc: "Declared wallet manifests → classified transactions → P&L" },
  { label: "Grok research", desc: "Real-time X/web context on agents and ecosystems" },
  { label: "Attribution index", desc: "Which agents are included and what the gap represents" },
];

const TELEGRAM_FEATURES = [
  "Submit any Base wallet address",
  "Get revenue, expenses, net income",
  "Treasury analysis summary",
  "Settlement pattern detection",
  "Ask questions about agent books",
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LucaPage() {
  const [activeExample, setActiveExample] = useState(0);

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── Hero ── */}
      <section style={{ padding: "3rem 24px 2rem", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <SectionLabel style={{ color: "var(--accent)", marginBottom: 12 }}>
              Financial Analyst · Zetta Intelligence
            </SectionLabel>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Luca reads<br /><em>the books.</em>
            </h1>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 520 }}>
              Revenue, expenses, treasury activity, attribution gaps — interpreted from on-chain data, written in plain language.
              Cold. Precise. Factual.
            </p>
            <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
              <Link href="/research" className="lp-btn-primary lp-btn-lg">Read the Reports →</Link>
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lp-btn-ghost lp-btn-lg">
                @AskLucaBot
              </a>
            </div>
          </div>
          {/* Terminal identity card */}
          <div style={{
            background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
            padding: "16px 18px", minWidth: 220, maxWidth: 260, fontFamily: "var(--font-mono)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4AE8A0", display: "inline-block" }} />
              <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>LUCA · ACTIVE</span>
            </div>
            {[
              { k: "ROLE", v: "Financial Analyst" },
              { k: "LAYER", v: "Zetta Intelligence" },
              { k: "DATA", v: "On-chain only" },
              { k: "STYLE", v: "Bloomberg · no hype" },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", width: 50, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: "0.62rem", color: "rgba(74,232,160,0.9)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <SectionLabel>Capabilities</SectionLabel>
          <h2 className="lp-h2">What Luca analyzes.</h2>
        </div>
        <LedgerCard eyebrow="6 capabilities" title="Financial analysis functions">
          {CAPABILITIES.map((item, i) => (
            <LedgerRow
              key={item.label}
              first={i === 0}
              last={i === CAPABILITIES.length - 1}
              label={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--muted)", width: 20 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </span>
              }
              value={item.desc}
              valueStyle={{ fontFamily: "inherit", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400, textAlign: "right", maxWidth: 380 }}
            />
          ))}
        </LedgerCard>
      </section>

      {/* ── Analysis Terminal ── */}
      <section className="lp-section">
        <div className="lp-section-head" style={{ marginBottom: 28 }}>
          <SectionLabel>Analysis Terminal</SectionLabel>
          <h2 className="lp-h2">Financial intelligence, structured.</h2>
          <p className="lp-hero-sub" style={{ maxWidth: 560, marginTop: 8 }}>
            Every Luca analysis follows the same structure: Attribution → Books → History → Signal → Verdict.
            Data first, interpretation second, confidence always declared.
          </p>
        </div>

        {/* Suggested prompts */}
        <div className="lt-prompts">
          {SUGGESTED_PROMPTS.map((p, i) => (
            <button
              key={p}
              type="button"
              className={`lt-prompt${activeExample === (i < 2 ? i : -1) ? " lt-prompt-active" : ""}`}
              onClick={() => setActiveExample(i < 2 ? i : 0)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Terminal panel */}
        <div className="lt-terminal">
          <div className="lt-terminal-head">
            <div className="lt-terminal-dots">
              <span /><span /><span />
            </div>
            <span className="lt-terminal-label">LUCA · FINANCIAL ANALYSIS TERMINAL</span>
            <StatusBadge variant="neutral">PREVIEW</StatusBadge>
          </div>

          <div className="lt-query-row">
            <span className="lt-field-label">QUERY</span>
            <span className="lt-query-text">{EXAMPLE_ANALYSES[activeExample].query}</span>
          </div>

          <div className="lt-output-rows">
            {EXAMPLE_ANALYSES[activeExample].rows.map((row) => (
              <div key={row.field} className="lt-output-row">
                <span className="lt-field-label">{row.field}</span>
                <span className={`lt-output-value${row.positive ? " lt-positive" : ""}`}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="lt-verdict-block">
            <div className="lt-verdict-left">
              <span className="lt-field-label">VERDICT</span>
              <p className="lt-verdict-text">{EXAMPLE_ANALYSES[activeExample].verdict}</p>
            </div>
            <div className="lt-confidence-block">
              <span className="lt-field-label">CONFIDENCE</span>
              <StatusBadge variant="green">{EXAMPLE_ANALYSES[activeExample].confidence}</StatusBadge>
            </div>
          </div>

          <div className="lt-terminal-footer">
            <span>Illustrative format · live analysis requires manifest-declared wallets · no synthetic data in production</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                type="button"
                className={`lt-ex-switch${activeExample === 0 ? " active" : ""}`}
                onClick={() => setActiveExample(0)}
              >AEON</button>
              <button
                type="button"
                className={`lt-ex-switch${activeExample === 1 ? " active" : ""}`}
                onClick={() => setActiveExample(1)}
              >BANKR</button>
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lt-tg-link">
                Try on Telegram →
              </a>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: "0.74rem", color: "var(--muted)", textAlign: "center" }}>
          Live terminal access coming soon. For now, use{" "}
          <a href={TELEGRAM} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>@AskLucaBot</a> on Telegram.
          {" "}<Link href="/methodology" style={{ color: "var(--accent)" }}>Read the methodology →</Link>
        </p>
      </section>

      {/* ── State of the Agent Economy ── */}
      <section className="lp-section">
        <div className="lp-registry-inner">
          <div className="lp-registry-text">
            <SectionLabel>Publication</SectionLabel>
            <h2 className="lp-h2" style={{ margin: "10px 0 12px" }}>State of the<br />Agent Economy.</h2>
            <p className="lp-registry-sub">
              Luca&rsquo;s flagship publication. Weekly, monthly, and quarterly reports on revenue, expenses,
              treasury health, and the attribution gap across autonomous agents on Base.
              Grounded entirely in on-chain data. No estimates. No synthetic numbers.
            </p>
            <div style={{ margin: "20px 0" }}>
              <LedgerCard>
                {REPORT_TYPES.map((r, i) => (
                  <LedgerRow
                    key={r.label}
                    first={i === 0}
                    last={i === REPORT_TYPES.length - 1}
                    label={r.label}
                    labelStyle={{ color: "var(--accent)" }}
                    value={r.desc}
                    valueStyle={{ fontFamily: "inherit", fontWeight: 400, fontSize: "0.78rem", color: "var(--muted)" }}
                  />
                ))}
              </LedgerCard>
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
              <SectionLabel style={{ marginBottom: 6 }}>Style</SectionLabel>
              <p style={{ fontSize: "0.82rem", color: "var(--fg)", lineHeight: 1.6, margin: "0 0 14px", fontStyle: "italic" }}>
                &ldquo;Bloomberg Intelligence analyst. Cold. Precise. Factual. No hype. No marketing language.&rdquo;
              </p>
              <SectionLabel style={{ marginBottom: 6 }}>Data Sources</SectionLabel>
              <LedgerCard>
                {DATA_SOURCES.map((item, i) => (
                  <LedgerRow
                    key={item.label}
                    first={i === 0}
                    last={i === DATA_SOURCES.length - 1}
                    label={item.label}
                    value={item.desc}
                    valueStyle={{ fontFamily: "inherit", fontWeight: 400, fontSize: "0.7rem", color: "var(--muted)", textAlign: "right", maxWidth: 200 }}
                  />
                ))}
              </LedgerCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── Telegram terminal ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <SectionLabel>Public Interface</SectionLabel>
          <h2 className="lp-h2">Luca on Telegram.</h2>
          <p className="lp-hero-sub" style={{ maxWidth: 560, marginTop: 8 }}>
            @AskLucaBot is Luca&rsquo;s public terminal. Submit a wallet address and Luca will return a
            financial analysis — revenue, expenses, net income, treasury activity summary.
          </p>
        </div>
        <div style={{ marginTop: 28 }}>
          <LedgerCard eyebrow="Features" title="@AskLucaBot capabilities">
            {TELEGRAM_FEATURES.map((item, i) => (
              <LedgerRow
                key={item}
                first={i === 0}
                last={i === TELEGRAM_FEATURES.length - 1}
                label={item}
                value={<StatusBadge variant="green">Active</StatusBadge>}
              />
            ))}
          </LedgerCard>
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

      {/* ── Luca Skills ── */}
      <section className="lp-section lp-section-alt" id="skills">
        <div className="lp-section-head">
          <SectionLabel>API</SectionLabel>
          <h2 className="lp-h2">Luca Skills.</h2>
          <p className="lp-hero-sub" style={{ maxWidth: 560, marginTop: 8 }}>
            Seven callable financial intelligence endpoints. Plug Luca directly into your agent, dashboard, or workflow.
            Each skill enforces strict data integrity — no synthetic numbers, no attribution without a manifest.
          </p>
        </div>
        <div style={{ marginTop: 28 }}>
          <LedgerCard eyebrow="7 endpoints" title="Callable intelligence functions">
            {LUCA_SKILLS.map((skill, i) => (
              <LedgerRow
                key={skill.name}
                first={i === 0}
                last={i === LUCA_SKILLS.length - 1}
                label={skill.name}
                value={skill.desc}
                valueStyle={{ fontFamily: "inherit", fontWeight: 400, fontSize: "0.75rem", color: "var(--muted)", textAlign: "right", maxWidth: 340 }}
              />
            ))}
          </LedgerCard>
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/docs/luca-skills" className="lp-btn-primary">View Luca Skills API →</Link>
          <Link href="/api" className="lp-btn-ghost">Get API Key</Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <h2 className="lp-h2">Get your agent in the report.</h2>
        <p>Submit a wallet manifest and Luca will include your agent in the next State of the Agent Economy.</p>
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">Submit Manifest →</Link>
          <Link href="/research" className="lp-btn-ghost lp-btn-lg">Read Reports</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
