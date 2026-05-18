"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/effects";

const LUCA_CA  = "0xB2b335F832FD3f43461ebD1CD9831D93D9CA4ba3";
const BANKR_BUY = "https://bankr.bot/launches/0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
const TELEGRAM  = "https://t.me/AskLucaBot";
const X_HANDLE  = "https://x.com/AskLucaAI";

const CAPABILITIES = [
  { icon: "account_balance_wallet", title: "Wallet Audits",              body: "Analyze public wallet activity across income, spend, net flow, and treasury health." },
  { icon: "category",              title: "Transaction Categorization",  body: "Classify onchain activity into revenue, expenses, gas, treasury movement, swaps, and unknown items." },
  { icon: "monitoring",            title: "Agent Financial Scores",      body: "Score agents based on activity, cashflow quality, anomaly risk, and treasury health." },
  { icon: "flag",                  title: "Anomaly Detection",           body: "Flag unusual inflows, repeated transactions, high-frequency behavior, and concentration risk." },
  { icon: "description",           title: "Reports & Summaries",         body: "Generate short summaries, full audit memos, public-safe X posts, and operator-ready reports." },
  { icon: "menu_book",             title: "Agent Bookkeeping",           body: "Help autonomous agents understand what they earned, spent, held, and need to review." },
];

const STEPS = [
  { n: "01", title: "Submit a wallet",        body: "Send Luca any Base wallet address on Telegram." },
  { n: "02", title: "Luca scans activity",    body: "Public onchain data is fetched and normalized in seconds." },
  { n: "03", title: "x402Books categorizes",  body: "Every transaction is classified by the x402Books AI engine." },
  { n: "04", title: "Risks are detected",     body: "Anomalies, concentration risk, and unusual patterns are flagged." },
  { n: "05", title: "Report delivered",       body: "A clear, structured accounting report is sent back instantly." },
];

const FOR_AGENTS = [
  "How much did I earn?",
  "How much did I spend?",
  "What did I spend on?",
  "Is my treasury healthy?",
  "Which transactions need review?",
  "Am I revenue-generating or just active?",
  "What should I report to users or operators?",
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
  { tag: "Series 01", title: "Are Agents Actually Working?",  body: "Public analysis of agent wallets and activity." },
  { tag: "Series 02", title: "Agent Wallet Breakdown",        body: "Short financial snapshots of agent projects." },
  { tag: "Series 03", title: "Agent Treasury Watch",          body: "Treasury health and risk observations." },
  { tag: "Series 04", title: "Luca Explains",                 body: "Simple accounting lessons for the agent economy." },
];

const TRUST_ITEMS = [
  "Official x402Books AI agent",
  "$LUCA powers Luca and x402Books AI",
  "Ecosystem token on Base",
  "Runs on Base",
  "Powered by Claude AI",
  "x402 protocol native",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

type TokenData = {
  price: number;
  change24h: number;
  mcap: number;
  volume24h: number;
  dexUrl: string;
};

type SparkPoint = { ts: number; price: number };

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPrice(n: number): string {
  if (n >= 1)        return `$${n.toFixed(4)}`;
  if (n >= 0.001)    return `$${n.toFixed(5)}`;
  if (n >= 0.000001) return `$${n.toFixed(8)}`;
  return `$${n.toFixed(10)}`;
}

function Sparkline({ points }: { points: SparkPoint[] }) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 400, H = 56, PAD = 2;
  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.price - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "#6DB874" : "#e05252";
  const firstX = PAD, lastX = W - PAD;
  const fill = `${coords[0]} L ${coords.join(" L ")} L ${lastX},${H} L ${firstX},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="luca-token-sparkline" preserveAspectRatio="none">
      <defs>
        <linearGradient id="luca-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${fill}`} fill="url(#luca-spark-fill)" />
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Live $LUCA Token Section ──────────────────────────────────────────────────

function LucaTokenSection() {
  const [token, setToken]       = useState<TokenData | null>(null);
  const [spark, setSpark]       = useState<SparkPoint[]>([]);
  const [copied, setCopied]     = useState(false);
  const [flashClass, setFlash]  = useState("");
  const prevPrice               = useRef<number | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${LUCA_CA}`,
        { signal: AbortSignal.timeout(6_000) },
      );
      if (!res.ok) return;
      type DexPair = { priceUsd?: string; priceChange?: { h24?: number }; volume?: { h24?: number }; fdv?: number; marketCap?: number; url?: string };
      const data = await res.json() as { pairs?: DexPair[] };
      const pair = data.pairs?.[0];
      if (!pair) return;

      const price = parseFloat(pair.priceUsd ?? "0");
      if (price > 0 && prevPrice.current !== null && price !== prevPrice.current) {
        const cls = price > prevPrice.current ? "flash-up" : "flash-down";
        setFlash(cls);
        setTimeout(() => setFlash(""), 800);
      }
      prevPrice.current = price;

      setToken({
        price,
        change24h: pair.priceChange?.h24 ?? 0,
        mcap: pair.marketCap ?? pair.fdv ?? 0,
        volume24h: pair.volume?.h24 ?? 0,
        dexUrl: pair.url ?? `https://dexscreener.com/base/${LUCA_CA}`,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchToken();
    const iv = setInterval(fetchToken, 30_000);
    return () => clearInterval(iv);
  }, [fetchToken]);

  useEffect(() => {
    fetch(`/api/token/chart?address=${LUCA_CA}`)
      .then((r) => r.json())
      .then((d: { prices?: SparkPoint[] }) => { if (d.prices?.length) setSpark(d.prices); })
      .catch(() => {});
  }, []);

  function copy() {
    navigator.clipboard.writeText(LUCA_CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const changeDir = !token ? "flat" : token.change24h > 0 ? "up" : token.change24h < 0 ? "down" : "flat";

  return (
    <section className="luca-section luca-section-alt" id="token">
      <div className="luca-section-head">
        <p className="luca-label">Token</p>
        <h2 className="luca-h2">$LUCA</h2>
        <p className="luca-section-sub">
          The unified ecosystem token powering Luca and x402Books AI.
        </p>
      </div>

      <div className="lp-token-card luca-lp-token-card">
        {/* Left — identity */}
        <div className="lp-token-left">
          <p className="lp-token-eyebrow">Ecosystem Token · Base</p>
          <h2 className="lp-token-name">$LUCA</h2>
          <p className="lp-token-desc">
            $LUCA powers Luca and x402Books AI — the first AI accountant for the agent economy. Hold $LUCA to unlock higher API limits, premium reports, and agent intelligence credits.
          </p>
          <div className="lp-token-ca">
            <span className="lp-token-ca-label">CA</span>
            <span className="lp-token-ca-addr">{LUCA_CA}</span>
            <button type="button" className="lp-token-ca-copy" onClick={copy} title="Copy contract address">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                {copied ? "check" : "content_copy"}
              </span>
            </button>
          </div>
          <div className="lp-token-links">
            <a href={BANKR_BUY} target="_blank" rel="noreferrer" className="lp-token-link lp-token-link-primary">
              Buy $LUCA
            </a>
            <a href={`https://dexscreener.com/base/${LUCA_CA}`} target="_blank" rel="noreferrer" className="lp-token-link lp-token-link-ghost">
              DexScreener ↗
            </a>
          </div>
        </div>

        {/* Right — live data */}
        <div className="lp-token-right">
          {!token ? (
            <div className="lp-token-loading">
              <div className="lp-token-loading-bar" />
              <div className="lp-token-loading-bar" style={{ width: "60%" }} />
              <div className="lp-token-loading-bar" style={{ width: "80%" }} />
            </div>
          ) : (
            <>
              <div className="lp-token-price-row">
                <span className={`lp-token-price ${flashClass}`}>{formatPrice(token.price)}</span>
                <span className={`lp-token-change ${changeDir}`}>
                  {token.change24h > 0 ? "+" : ""}{token.change24h.toFixed(2)}% 24h
                </span>
              </div>
              <Sparkline points={spark} />
              <p className="lp-token-spark-label">7-day price chart</p>
              <div className="lp-token-stats">
                <div className="lp-token-stat">
                  <span className="lp-token-stat-label">Market Cap</span>
                  <span className="lp-token-stat-value">{token.mcap > 0 ? formatUsd(token.mcap) : "—"}</span>
                </div>
                <div className="lp-token-stat">
                  <span className="lp-token-stat-label">Volume 24h</span>
                  <span className="lp-token-stat-value">{token.volume24h > 0 ? formatUsd(token.volume24h) : "—"}</span>
                </div>
              </div>
              <div className="lp-token-live">
                <span className="lp-token-live-dot" />
                Live · updates every 30s
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LucaPage() {
  const doubled = [...TRUST_ITEMS, ...TRUST_ITEMS];

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

      {/* ── Trust marquee ── */}
      <div className="luca-trust-strip">
        <div className="luca-trust-track">
          <div className="luca-trust-reel">
            {doubled.map((item, i) => (
              <div key={i} className="luca-trust-item">
                <span className="luca-trust-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
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

      {/* ── Live $LUCA Token ── */}
      <LucaTokenSection />

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
