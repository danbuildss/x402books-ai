"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const TELEGRAM = "https://t.me/AskLucaBot";
const X_HANDLE = "https://x.com/zettaaidotco";

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
  { name: "Agent Books",          desc: "Full P&L: revenue, expenses, net income, margin" },
  { name: "Treasury Monitor",     desc: "Live stablecoin balances and health signal" },
  { name: "Revenue Analysis",     desc: "Gross inflow vs operating revenue breakdown" },
  { name: "Registry Check",       desc: "Look up any agent by slug, name, or address" },
  { name: "Luca Report",          desc: "Full composite: identity + books + treasury + narrative" },
  { name: "B20 Token Analysis",   desc: "Token identity, issuer, activity, financial readiness" },
];

const DATA_SOURCES = [
  { label: "On-chain books",     desc: "Declared wallet manifests → classified transactions → P&L" },
  { label: "Grok research",      desc: "Real-time X/web context on agents and ecosystems" },
  { label: "Attribution index",  desc: "Which agents are included and what the gap represents" },
];

const TELEGRAM_FEATURES = [
  "Submit any Base wallet address",
  "Get revenue, expenses, net income",
  "Treasury analysis summary",
  "Settlement pattern detection",
  "Ask questions about agent books",
];

const TBL_ROW: React.CSSProperties = {
  display: "grid", gap: 12, alignItems: "start",
  padding: "11px 16px", borderBottom: "1px solid var(--line)", fontSize: "0.83rem",
};

export default function LucaPage() {
  const [activeExample, setActiveExample] = useState(0);

  return (
    <div className="lp-root">
      <SiteNav />

      <article style={{ maxWidth: 1000, margin: "0 auto", padding: "3rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Luca</span>
        </nav>

        {/* ── Hero ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "start", marginBottom: 40 }}>
          <div>
            <div className="tla-section-label" style={{ color: "var(--accent)", marginBottom: 10 }}>
              Financial Analyst · Zetta Intelligence
            </div>
            <h1 style={{
              fontFamily: "var(--font-mono)", fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
              fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em",
              color: "var(--ink-em)", margin: "0 0 12px",
            }}>
              Luca reads<br />the books.
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--ink-mid)", lineHeight: 1.7, margin: "0 0 22px", maxWidth: 500 }}>
              Revenue, expenses, treasury activity, attribution gaps — interpreted from on-chain data, written in plain language. Cold. Precise. Factual.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/research" className="lp-btn-primary">Read the Reports →</Link>
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lp-btn-ghost">@AskLucaBot</a>
            </div>
          </div>

          {/* Identity card */}
          <div style={{
            background: "#0d1117", border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 8, padding: "16px 18px", minWidth: 200, maxWidth: 240,
            fontFamily: "var(--font-mono)", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                LUCA · ACTIVE
              </span>
            </div>
            {[
              { k: "ROLE",  v: "Financial Analyst" },
              { k: "LAYER", v: "Zetta Intelligence" },
              { k: "DATA",  v: "On-chain only" },
              { k: "STYLE", v: "Bloomberg · no hype" },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.28)", width: 48, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: "0.6rem", color: "rgba(74,232,160,0.9)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Capabilities ── */}
        <div style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 10 }}>Capabilities</div>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 16 }}>
            What Luca analyzes.
          </h2>
          <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
                6 capabilities · financial analysis functions
              </span>
            </div>
            {CAPABILITIES.map((item, i) => (
              <div key={item.label} style={{ ...TBL_ROW, gridTemplateColumns: "24px 1fr 1fr", borderBottom: i === CAPABILITIES.length - 1 ? "none" : "1px solid var(--line)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--muted)", paddingTop: 1 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{item.label}</span>
                <span style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.5 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Analysis Terminal ── */}
        <div style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 10 }}>Analysis Terminal</div>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 6 }}>
            Financial intelligence, structured.
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-mid)", lineHeight: 1.65, marginBottom: 16, maxWidth: 540 }}>
            Every Luca analysis follows the same structure: Attribution → Books → History → Signal → Verdict. Data first, interpretation second, confidence always declared.
          </p>

          {/* Prompt pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setActiveExample(i < 2 ? i : 0)}
                style={{
                  fontSize: "0.72rem", padding: "5px 12px",
                  borderRadius: 6, border: "1px solid var(--line)",
                  color: "var(--ink-mid)", background: "var(--surface)", cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Terminal */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", fontFamily: "var(--font-mono)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#F46060", "#F4B942", "#4AE8A0"].map((c) => (
                  <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                ))}
              </div>
              <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", flex: 1 }}>
                LUCA · FINANCIAL ANALYSIS TERMINAL
              </span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--line-hi)", color: "var(--muted)" }}>
                PREVIEW
              </span>
            </div>

            {/* Query */}
            <div style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "rgba(61,207,136,0.03)" }}>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", flexShrink: 0, width: 68 }}>QUERY</span>
              <span style={{ fontSize: "0.82rem", color: "var(--ink-em)", fontWeight: 600, lineHeight: 1.4 }}>
                {EXAMPLE_ANALYSES[activeExample].query}
              </span>
            </div>

            {/* Output rows */}
            {EXAMPLE_ANALYSES[activeExample].rows.map((row, i, arr) => (
              <div key={row.field} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "9px 16px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", flexShrink: 0, width: 68 }}>
                  {row.field}
                </span>
                <span style={{ fontSize: "0.78rem", color: row.positive ? "var(--accent)" : "var(--ink-mid)", lineHeight: 1.4 }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Verdict */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "14px 16px", borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>VERDICT</span>
                <p style={{ fontSize: "0.78rem", color: "var(--ink-mid)", lineHeight: 1.55, marginTop: 4 }}>
                  {EXAMPLE_ANALYSES[activeExample].verdict}
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block" }}>CONFIDENCE</span>
                <span style={{
                  display: "inline-block", marginTop: 4, fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                  border: "1px solid rgba(61,207,136,0.3)", background: "rgba(61,207,136,0.08)", color: "var(--accent)",
                }}>
                  {EXAMPLE_ANALYSES[activeExample].confidence}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", background: "var(--surface-hi)", fontSize: "0.65rem", color: "var(--muted)", gap: 12, flexWrap: "wrap" }}>
              <span>Illustrative format · live analysis requires manifest-declared wallets · no synthetic data in production</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                {[{ label: "AEON", idx: 0 }, { label: "BANKR", idx: 1 }].map(({ label, idx }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveExample(idx)}
                    style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px",
                      borderRadius: 4, cursor: "pointer", fontFamily: "var(--font-mono)",
                      border: activeExample === idx ? "1px solid rgba(61,207,136,0.4)" : "1px solid var(--line-hi)",
                      color: activeExample === idx ? "var(--accent)" : "var(--muted)",
                      background: activeExample === idx ? "rgba(61,207,136,0.08)" : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
                <a href={TELEGRAM} target="_blank" rel="noreferrer" style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                  Try on Telegram →
                </a>
              </div>
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: "0.74rem", color: "var(--muted)", textAlign: "center" }}>
            Live financial intelligence — real on-chain data, no synthetic numbers.
            {" "}<Link href="/dashboard/luca" style={{ color: "var(--accent)" }}>Open Luca terminal →</Link>
          </p>
        </div>

        {/* ── Publication ── */}
        <div style={{ paddingTop: 28, paddingBottom: 28, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, marginBottom: 40 }}>
          <div>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>Publication</div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-em)", lineHeight: 1.3, marginBottom: 10 }}>
              State of the<br />Agent Economy.
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-mid)", lineHeight: 1.65, marginBottom: 18 }}>
              Luca&rsquo;s flagship publication. Weekly, monthly, and quarterly reports on revenue, expenses, treasury health, and the attribution gap across autonomous agents on Base. No estimates. No synthetic numbers.
            </p>
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
              {REPORT_TYPES.map((r, i) => (
                <div key={r.label} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, padding: "10px 16px", borderBottom: i === REPORT_TYPES.length - 1 ? "none" : "1px solid var(--line)", fontSize: "0.82rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>{r.label}</span>
                  <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{r.desc}</span>
                </div>
              ))}
            </div>
            <Link href="/research" className="lp-btn-primary" style={{ fontSize: "0.8rem" }}>Read All Reports →</Link>
          </div>

          <div>
            <div className="tla-section-label" style={{ marginBottom: 10 }}>Coverage</div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--muted)" }}>
                {["#F46060", "#F4B942", "#4AE8A0"].map((c) => (
                  <span key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />
                ))}
                <span style={{ marginLeft: 4 }}>Luca · Financial Analyst</span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <p style={{ fontSize: "0.78rem", color: "var(--ink-mid)", fontStyle: "italic", lineHeight: 1.5, marginBottom: 12 }}>
                  &ldquo;Bloomberg Intelligence analyst. Cold. Precise. Factual. No hype. No marketing language.&rdquo;
                </p>
                <div className="tla-section-label" style={{ marginBottom: 8 }}>Data Sources</div>
                {DATA_SOURCES.map((item) => (
                  <div key={item.label} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: "0.76rem" }}>
                    <span style={{ color: "var(--ink-mid)", fontWeight: 600, minWidth: 110 }}>{item.label}</span>
                    <span style={{ color: "var(--muted)", lineHeight: 1.45 }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Telegram ── */}
        <div style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 10 }}>Public Interface</div>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 6 }}>
            Luca on Telegram.
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-mid)", lineHeight: 1.65, marginBottom: 18, maxWidth: 540 }}>
            @AskLucaBot is Luca&rsquo;s public terminal. Submit a wallet address and Luca returns a financial analysis — revenue, expenses, net income, treasury activity summary.
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap", padding: "20px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="tla-section-label" style={{ marginBottom: 10 }}>@AskLucaBot capabilities</div>
              {TELEGRAM_FEATURES.map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: "0.8rem", color: "var(--ink-mid)", marginBottom: 7 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent)", flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lp-btn-primary" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                Open @AskLucaBot
              </a>
              <a href={X_HANDLE} target="_blank" rel="noreferrer" className="lp-btn-ghost" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                Follow on X →
              </a>
            </div>
          </div>
        </div>

        {/* ── Luca Skills ── */}
        <div style={{ marginBottom: 40 }} id="skills">
          <div className="tla-section-label" style={{ marginBottom: 10 }}>API</div>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 6 }}>
            Luca Skills.
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-mid)", lineHeight: 1.65, marginBottom: 16, maxWidth: 540 }}>
            Seven callable financial intelligence endpoints. Plug Luca directly into your agent, dashboard, or workflow. Each skill enforces strict data integrity — no synthetic numbers, no attribution without a manifest.
          </p>
          <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "var(--surface-hi)", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
                7 endpoints · callable intelligence functions
              </span>
              <Link href="/docs/luca-skills" style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)" }}>
                View API docs →
              </Link>
            </div>
            {LUCA_SKILLS.map((skill, i) => (
              <div key={skill.name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "11px 16px", borderBottom: i === LUCA_SKILLS.length - 1 ? "none" : "1px solid var(--line)", fontSize: "0.83rem" }}>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{skill.name}</span>
                <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{skill.desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/docs/luca-skills" className="lp-btn-primary" style={{ fontSize: "0.8rem" }}>View Luca Skills API →</Link>
            <Link href="/api" className="lp-btn-ghost" style={{ fontSize: "0.8rem" }}>Get API Key</Link>
          </div>
        </div>

        {/* ── CTA strip ── */}
        <div style={{ paddingTop: 28, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 4 }}>
              Get your agent in the report.
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.55, maxWidth: 380 }}>
              Submit a wallet manifest and Luca will include your agent in the next State of the Agent Economy.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/registry#verify" className="lp-btn-primary">Submit Manifest →</Link>
            <Link href="/research" className="lp-btn-ghost">Read Reports</Link>
          </div>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
