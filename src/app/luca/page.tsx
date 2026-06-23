"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

const LUCA_CA   = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
const BANKR_BUY = "https://bankr.bot/launches/0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
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

// ── $LUCA Token ───────────────────────────────────────────────────────────────

type TokenData = {
  price: number;
  change24h: number;
  mcap: number;
  volume24h: number;
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

function LucaTokenSection() {
  const [token, setToken]      = useState<TokenData | null>(null);
  const [spark, setSpark]      = useState<SparkPoint[]>([]);
  const [copied, setCopied]    = useState(false);
  const [flashClass, setFlash] = useState("");
  const prevPrice              = useRef<number | null>(null);

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
      setToken({ price, change24h: pair.priceChange?.h24 ?? 0, mcap: pair.marketCap ?? pair.fdv ?? 0, volume24h: pair.volume?.h24 ?? 0 });
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
        <p className="luca-label">Ecosystem Token</p>
        <h2 className="luca-h2">$LUCA</h2>
        <p className="luca-section-sub">The ecosystem asset powering Zetta and Luca.</p>
      </div>
      <div className="lp-token-card luca-lp-token-card">
        <div className="lp-token-left">
          <p className="lp-token-eyebrow">Ecosystem Token · Base</p>
          <h2 className="lp-token-name">$LUCA</h2>
          <p className="lp-token-desc">
            $LUCA is the ecosystem asset for Zetta. Hold $LUCA to unlock higher API limits, premium reports, and agent intelligence credits.
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
            <a href={BANKR_BUY} target="_blank" rel="noreferrer" className="lp-token-link lp-token-link-primary">Buy $LUCA</a>
            <a href={`https://dexscreener.com/base/${LUCA_CA}`} target="_blank" rel="noreferrer" className="lp-token-link lp-token-link-ghost">DexScreener ↗</a>
          </div>
        </div>
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
  const [activeExample, setActiveExample] = useState(0);

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── Hero ── */}
      <section className="lp-hero" style={{ minHeight: "auto", paddingBottom: "3rem" }}>
        <div className="lp-hero-copy" style={{ maxWidth: 660 }}>
          <p className="lp-eyebrow">Financial Analyst · Zetta</p>
          <h1 className="lp-h1">
            Luca reads<br />
            <em>the books.</em>
          </h1>
          <p className="lp-hero-sub">
            Luca is Zetta&rsquo;s financial analyst. Revenue, expenses, treasury activity, attribution gaps —
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

      {/* ── Capabilities ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <p className="lp-section-label">Capabilities</p>
          <h2 className="lp-h2">What Luca analyzes.</h2>
        </div>
        <div className="lt-capabilities">
          {CAPABILITIES.map((item, i) => (
            <div key={item.label} className="lt-cap-card">
              <span className="lt-cap-num">{String(i + 1).padStart(2, "0")}</span>
              <p className="lt-cap-label">{item.label}</p>
              <p className="lt-cap-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Analysis Terminal ── */}
      <section className="lp-section">
        <div className="lp-section-head" style={{ marginBottom: 28 }}>
          <p className="lp-section-label">Analysis Terminal</p>
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
            <span className="lt-terminal-badge">PREVIEW</span>
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
              <span className="lt-confidence-val">{EXAMPLE_ANALYSES[activeExample].confidence}</span>
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
            financial analysis — revenue, expenses, net income, treasury activity summary.
          </p>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
          {[
            "Submit any Base wallet address",
            "Get revenue, expenses, net income",
            "Treasury analysis summary",
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

      {/* ── Luca Skills ── */}
      <section className="lp-section lp-section-alt" id="skills">
        <div className="lp-section-head">
          <p className="lp-section-label">API</p>
          <h2 className="lp-h2">Luca Skills.</h2>
          <p className="lp-hero-sub" style={{ maxWidth: 560, marginTop: 8 }}>
            Seven callable financial intelligence endpoints. Plug Luca directly into your agent, dashboard, or workflow.
            Each skill enforces strict data integrity — no synthetic numbers, no attribution without a manifest.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 28 }}>
          {[
            { name: "Wallet Audit",         desc: "Classify any address and check books-eligibility" },
            { name: "Agent Books",           desc: "Full P&L: revenue, expenses, net income, margin" },
            { name: "Treasury Monitor",      desc: "Live stablecoin balances and health signal" },
            { name: "Revenue Analysis",      desc: "Gross inflow vs operating revenue breakdown" },
            { name: "Registry Check",        desc: "Look up any agent by slug, name, or address" },
            { name: "Luca Report",           desc: "Full composite: identity + books + treasury + narrative" },
            { name: "B20 Token Analysis",    desc: "Token identity, issuer, activity, financial readiness" },
          ].map((skill) => (
            <div key={skill.name} style={{
              background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{skill.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{skill.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/docs/luca-skills" className="lp-btn-primary">View Luca Skills API →</Link>
          <Link href="/developer" className="lp-btn-ghost">Get API Key</Link>
        </div>
      </section>

      {/* ── $LUCA Token ── */}
      <LucaTokenSection />

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
