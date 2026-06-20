"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

const LUCA_CA   = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
const BANKR_BUY = "https://bankr.bot/launches/0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
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

      {/* ── Chat Interface — Coming Soon ── */}
      <section className="lp-section lp-section-alt">
        <div className="luca-chat-wrap">
          <div className="luca-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="luca-chat-avatar">L</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem" }}>Luca by Zetta</p>
                <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6DB874", display: "inline-block" }} />
                  Financial Analyst · Agent Economy
                </p>
              </div>
            </div>
            <span className="luca-cs-badge">Coming Soon</span>
          </div>
          <div className="luca-chat-body">
            <div className="luca-chat-bubble luca-chat-luca">
              How is AEON&rsquo;s revenue trend compared to last month?
            </div>
            <div className="luca-chat-bubble luca-chat-reply">
              AEON&rsquo;s operating revenue is up <strong>24.6%</strong> in the last 30 days compared to the previous 30 days. The growth is driven by increased on-chain activity and ecosystem adoption. Treasury remains healthy at $8.7M — no capital injections detected.
              <br /><br />
              <span style={{ color: "#6DB874", fontWeight: 600 }}>High confidence.</span> Based on 4 attributed wallets.
            </div>
            <div className="luca-chat-bubble luca-chat-luca">
              What&rsquo;s the net income for BANKR this quarter?
            </div>
            <div className="luca-chat-cs-overlay">
              <div className="luca-chat-cs-inner">
                <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "0.95rem" }}>Luca Chat · Coming Soon</p>
                <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "var(--muted)" }}>
                  Ask Luca anything about agent financials. Revenue, treasury, expenses, attribution — in plain language.
                </p>
                <a href={TELEGRAM} target="_blank" rel="noreferrer" className="lp-btn-primary" style={{ fontSize: "0.82rem" }}>
                  Try @AskLucaBot on Telegram →
                </a>
              </div>
            </div>
          </div>
          <div className="luca-chat-input-row">
            <div className="luca-chat-input" aria-disabled="true">
              Ask Luca about any agent&rsquo;s financials…
            </div>
            <button type="button" className="luca-chat-send" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
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
