"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/effects";

const LUCA_CA = "0xB2b335F832FD3f43461ebD1CD9831D93D9CA4ba3";
const BANKR_BUY = "https://bankr.bot/launches/0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
const TELEGRAM  = "https://t.me/AskLucaBot";
const X_HANDLE  = "https://x.com/AskLucaAI";

const CAPABILITIES = [
  {
    icon: "account_balance_wallet",
    title: "Wallet Audits",
    body: "Analyze public wallet activity across income, spend, net flow, and treasury health.",
  },
  {
    icon: "category",
    title: "Transaction Categorization",
    body: "Classify onchain activity into revenue, expenses, gas, treasury movement, swaps, and unknown items.",
  },
  {
    icon: "monitoring",
    title: "Agent Financial Scores",
    body: "Score agents based on activity, cashflow quality, anomaly risk, and treasury health.",
  },
  {
    icon: "flag",
    title: "Anomaly Detection",
    body: "Flag unusual inflows, repeated transactions, high-frequency behavior, unsupported valuations, and concentration risk.",
  },
  {
    icon: "description",
    title: "Reports & Summaries",
    body: "Generate short summaries, full audit memos, public-safe X posts, and operator-ready reports.",
  },
  {
    icon: "menu_book",
    title: "Agent Bookkeeping",
    body: "Help autonomous agents understand what they earned, spent, held, and need to review.",
  },
];

const STEPS = [
  { n: "01", title: "Submit a wallet", body: "Send Luca any Base wallet address on Telegram." },
  { n: "02", title: "Luca scans activity", body: "Public onchain data is fetched and normalized in seconds." },
  { n: "03", title: "x402Books categorizes", body: "Every transaction is classified by the x402Books AI engine." },
  { n: "04", title: "Risks are detected", body: "Anomalies, concentration risk, and unusual patterns are flagged." },
  { n: "05", title: "Report delivered", body: "A clear, structured accounting report is sent back instantly." },
];

const FOR_AGENTS = [
  "How much did I earn?",
  "How much did I spend?",
  "What did I spend on?",
  "Is my treasury healthy?",
  "Which transactions need review?",
  "Am I revenue-generating or just active?",
  "What should I report to users, teams, or operators?",
];

const FOR_BUILDERS = [
  "Wallet summaries",
  "Spend controls",
  "Agent financial scores",
  "Public audit notes",
  "Reporting workflows",
  "Compliance-ready exports",
  "Agent-to-agent bookkeeping",
];

const SERIES = [
  {
    tag: "Series 01",
    title: "Are Agents Actually Working?",
    body: "Public analysis of agent wallets and activity.",
  },
  {
    tag: "Series 02",
    title: "Agent Wallet Breakdown",
    body: "Short financial snapshots of agent projects.",
  },
  {
    tag: "Series 03",
    title: "Agent Treasury Watch",
    body: "Treasury health and risk observations.",
  },
  {
    tag: "Series 04",
    title: "Luca Explains",
    body: "Simple accounting lessons for the agent economy.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button type="button" className="luca-ca-copy" onClick={copy} title="Copy address">
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        {copied ? "check" : "content_copy"}
      </span>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function LucaPage() {
  return (
    <div className="luca-page">
      {/* ── Hero ── */}
      <section className="luca-hero">
        <div className="luca-hero-topbar">
          <Link href="/" className="luca-back-link">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
            x402books.xyz
          </Link>
          <ThemeToggle />
        </div>
        <div className="luca-hero-inner">
          <div className="luca-avatar-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/luca-avatar.png" alt="Luca" className="luca-avatar" />
          </div>
          <div className="luca-hero-text">
            <div className="luca-powered-badge">Powered by x402Books AI</div>
            <h1 className="luca-h1">Luca</h1>
            <p className="luca-tagline">AI Accountant for the Agent Economy.</p>
            <p className="luca-hero-sub">
              Luca helps humans and autonomous agents audit wallets, understand cashflow,
              detect anomalies, and keep better onchain books.
            </p>
            <div className="luca-hero-btns">
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="luca-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Talk to Luca on Telegram
              </a>
              <a href={X_HANDLE} target="_blank" rel="noreferrer" className="luca-btn-ghost">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Follow on X
              </a>
              <span className="luca-btn-ghost luca-btn-soon">
                Bankr Profile — Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust line ── */}
      <div className="luca-trust-bar">
        <span>Official x402Books AI agent.</span>
        <span className="luca-trust-dot" />
        <span>$XBOOKS powers the platform.</span>
        <span className="luca-trust-dot" />
        <span>$LUCA represents Luca&apos;s community and agent identity.</span>
      </div>

      {/* ── What Luca Does ── */}
      <section className="luca-section" id="capabilities">
        <div className="luca-section-head">
          <p className="luca-label">What Luca Does</p>
          <h2 className="luca-h2">Six core accounting capabilities.</h2>
        </div>
        <div className="luca-caps-grid">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="luca-cap-card">
              <span className="material-symbols-outlined luca-cap-icon">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How Luca Works ── */}
      <section className="luca-section luca-section-alt" id="how">
        <div className="luca-section-head">
          <p className="luca-label">How Luca Works</p>
          <h2 className="luca-h2">From wallet address to clean report.</h2>
        </div>
        <div className="luca-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="luca-step">
              <span className="luca-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample Report ── */}
      <section className="luca-section" id="sample">
        <div className="luca-section-head">
          <p className="luca-label">Sample Output</p>
          <h2 className="luca-h2">This is what Luca produces.</h2>
        </div>
        <div className="luca-report-wrap">
          <div className="luca-report-header">
            <span className="luca-report-tag">Agent Wallet Breakdown #001</span>
            <span className="luca-report-by">by Luca · x402Books AI</span>
          </div>
          <div className="luca-report-body">
            <div className="luca-report-row"><span>Agent</span><strong>Example Agent</strong></div>
            <div className="luca-report-row"><span>Ecosystem</span><strong>Base</strong></div>
            <div className="luca-report-row"><span>Wallet</span><strong>0x4e6c…0b07</strong></div>
            <div className="luca-report-divider" />
            <div className="luca-report-row"><span>Activity</span><strong>Medium</strong></div>
            <div className="luca-report-row"><span>Total Inflow</span><strong className="luca-positive">+$1,884.70</strong></div>
            <div className="luca-report-row"><span>Total Outflow</span><strong>$0.00</strong></div>
            <div className="luca-report-row"><span>Net Flow</span><strong className="luca-positive">+$1,884.70</strong></div>
            <div className="luca-report-row"><span>Treasury Health</span><strong className="luca-warn">Stable to Watch</strong></div>
            <div className="luca-report-row"><span>Main Risk</span><strong>High value concentration in one token</strong></div>
            <div className="luca-report-divider" />
            <div className="luca-report-read">
              <span className="luca-report-read-label">Luca&apos;s read</span>
              <p>The wallet is cashflow-positive, but revenue quality needs verification because most activity lacks reliable USD valuation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Agents + For Builders ── */}
      <section className="luca-section luca-section-alt" id="use-cases">
        <div className="luca-two-col">
          <div className="luca-use-card">
            <p className="luca-label">For Agents</p>
            <h3>Questions Luca answers.</h3>
            <ul className="luca-q-list">
              {FOR_AGENTS.map((q) => (
                <li key={q}>
                  <span className="material-symbols-outlined">arrow_forward</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
          <div className="luca-use-card">
            <p className="luca-label">For Builders</p>
            <h3>Add financial intelligence.</h3>
            <ul className="luca-q-list">
              {FOR_BUILDERS.map((b) => (
                <li key={b}>
                  <span className="material-symbols-outlined">arrow_forward</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Content Series ── */}
      <section className="luca-section" id="series">
        <div className="luca-section-head">
          <p className="luca-label">Content Series</p>
          <h2 className="luca-h2">Public intelligence from Luca.</h2>
        </div>
        <div className="luca-series-grid">
          {SERIES.map((s) => (
            <div key={s.title} className="luca-series-card">
              <span className="luca-series-tag">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Token Structure ── */}
      <section className="luca-section luca-section-alt" id="token">
        <div className="luca-section-head">
          <p className="luca-label">Token</p>
          <h2 className="luca-h2">$LUCA</h2>
          <p className="luca-section-sub">
            The community and agent identity token around Luca&apos;s growth and future agent-specific utilities.
          </p>
        </div>
        <div className="luca-token-card">
          <div className="luca-token-top">
            <span className="luca-token-symbol">$LUCA</span>
            <span className="luca-token-network">Base Network</span>
          </div>
          <div className="luca-ca-row">
            <span className="luca-ca-label">Contract</span>
            <span className="luca-ca-addr">{LUCA_CA}</span>
            <CopyButton text={LUCA_CA} />
          </div>
          <div className="luca-token-btns">
            <a href={BANKR_BUY} target="_blank" rel="noreferrer" className="luca-btn-primary">
              Buy $LUCA on Bankr
            </a>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <div className="luca-disclaimer">
        Luca analyzes public onchain data and user-provided information. Reports may include estimates and assumptions. Luca does not provide legal, tax, or investment advice.
      </div>

      {/* ── Final CTA ── */}
      <section className="luca-cta">
        <p className="luca-cta-line">Agents are becoming economic actors.</p>
        <p className="luca-cta-line">Now they need books.</p>
        <h2 className="luca-cta-headline">Talk to Luca.</h2>
        <a href={TELEGRAM} target="_blank" rel="noreferrer" className="luca-btn-primary luca-btn-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.277-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Open Telegram — @AskLucaBot
        </a>
      </section>

      {/* ── Footer ── */}
      <footer className="luca-footer">
        <div className="luca-footer-inner">
          <div className="luca-footer-brand">
            <strong>Luca</strong>
            <span>by x402Books AI</span>
          </div>
          <div className="luca-footer-links">
            <a href={TELEGRAM} target="_blank" rel="noreferrer">Telegram</a>
            <a href={X_HANDLE} target="_blank" rel="noreferrer">X / Twitter</a>
            <Link href="/">x402books.xyz</Link>
            <a href={BANKR_BUY} target="_blank" rel="noreferrer">Buy $LUCA</a>
          </div>
        </div>
        <p className="luca-footer-copy">© 2026 x402Books AI. Luca is an AI agent. Not financial advice.</p>
      </footer>
    </div>
  );
}
