"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Logo } from "@/components/logo";
import { FadeContent, ThemeToggle } from "@/components/effects";
import Link from "next/link";

// ── Static data ───────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    title: "Wallet roles are unclear",
    body: "Agents launch with multiple wallets. Nobody declares which holds treasury, which collects fees, which deploys contracts.",
  },
  {
    title: "Treasury is invisible",
    body: "Is the agent funded? Is it solvent? You can't tell without scanning addresses manually and guessing at intent.",
  },
  {
    title: "Trust takes too long",
    body: "Operators and builders verify everything manually. There is no standard financial identity for autonomous agents.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    code: ".x402books/wallets.json",
    title: "Declare wallets",
    body: "Treasury, fee, deployer, operator — declared once in a manifest file or submitted via the API.",
  },
  {
    num: "02",
    code: "POST /api/registry/wallets",
    title: "x402Books indexes",
    body: "Wallet roles recorded. On-chain activity scanned. Treasury health derived automatically.",
  },
  {
    num: "03",
    code: "classifySettlementPattern()",
    title: "Luca interprets",
    body: "Settlement patterns classified. Operational signals surfaced. Cold financial verdict generated.",
  },
  {
    num: "04",
    code: "/registry/[slug]/card",
    title: "Profile goes live",
    body: "Public profile. Embeddable card. Shareable, auditable, verifiable — travels anywhere.",
  },
];

const ECOSYSTEMS = [
  { name: "BANKR",      color: "#6DB874" },
  { name: "Virtuals",   color: "#5B8FA8" },
  { name: "AEON",       color: "#8B5CF6" },
  { name: "EigenCloud", color: "#F97316" },
  { name: "Base",       color: "#4F46E5" },
];

const FAQ_ITEMS = [
  {
    q: "What is x402Books?",
    a: "x402Books is the financial identity and intelligence layer for autonomous agents. Agents declare their wallets, x402Books indexes activity, and Luca generates readable financial profiles — public, verifiable, and shareable.",
  },
  {
    q: "Who is it for?",
    a: "Agent builders who want their agents trusted financially. Operators who need to verify treasury health. Protocols and ecosystems that want financial credibility for their agents.",
  },
  {
    q: "What is the Agent Financial Registry?",
    a: "The Registry is the public financial identity layer for the agent economy. 84+ agents tracked with wallet roles, treasury health, settlement patterns, and Luca verification — updated continuously.",
  },
  {
    q: "What is Luca?",
    a: "Luca is x402Books' financial intelligence agent — not a chatbot. A cold analytical engine that interprets treasury activity, classifies settlement patterns, and generates operational financial verdicts.",
  },
  {
    q: "How does verification work?",
    a: "Agents submit a wallet manifest (.x402books/wallets.json) declaring treasury, fee, deployer, and operator wallets. x402Books reviews the submission and upgrades the profile: Candidate → Wallets Declared → Verified → Live Financial Data.",
  },
  {
    q: "What role does $LUCA play?",
    a: "$LUCA is the ecosystem token for x402Books and Luca. Hold $LUCA to unlock higher API limits, premium reports, and agent intelligence credits.",
  },
];

const LUCA_CA        = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
const BANKR_WALLET   = "0xb98f0de777eea8c481b64e33d3e0066cea38fa91";
const BANKR_BASE_URL = `https://x402.bankr.bot/${BANKR_WALLET}`;

const SOCIAL = [
  {
    href: "https://x.com/x402Books",
    label: "X (Twitter)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.255 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    href: "https://t.me/x402books",
    label: "Telegram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

const X402_ENDPOINTS = [
  { name: "ledger-summary",        method: "GET",  usdc: "$0.02", xbooks: "$0.014", desc: "Income, spend, net flow, budget status" },
  { name: "transactions",          method: "GET",  usdc: "$0.02", xbooks: "$0.014", desc: "Paginated transaction history with USD values" },
  { name: "full-report",           method: "GET",  usdc: "$0.05", xbooks: "$0.035", desc: "Complete portfolio, daily flows, categories" },
  { name: "categorize",            method: "POST", usdc: "$0.15", xbooks: "$0.105", desc: "Claude AI transaction categorization" },
  { name: "agent-financial-state", method: "GET",  usdc: "$0.05", xbooks: "$0.035", desc: "Agent snapshot with ecosystem detection" },
];

// ── Token helpers ─────────────────────────────────────────────────────────────

type TokenData = { price: number; change24h: number; mcap: number; volume24h: number; dexUrl: string };
type SparkPoint = { ts: number; price: number };

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function formatPrice(n: number) {
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.001) return `$${n.toFixed(5)}`;
  if (n >= 0.000001) return `$${n.toFixed(8)}`;
  return `$${n.toFixed(10)}`;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ points }: { points: SparkPoint[] }) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const W = 400, H = 56, PAD = 2;
  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.price - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "#6DB874" : "#e05252";
  const fill = `${coords[0]} L ${coords.join(" L ")} L ${W - PAD},${H} L ${PAD},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lp-token-sparkline" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${fill}`} fill="url(#spark-fill)" />
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Token section ─────────────────────────────────────────────────────────────

function XBooksTokenSection() {
  const [token, setToken]   = useState<TokenData | null>(null);
  const [spark, setSpark]   = useState<SparkPoint[]>([]);
  const [copied, setCopied] = useState(false);
  const [flashClass, setFlashClass] = useState("");
  const prevPrice = useRef<number | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${LUCA_CA}`, { signal: AbortSignal.timeout(6_000) });
      if (!res.ok) return;
      type DexPair = { priceUsd?: string; priceChange?: { h24?: number }; volume?: { h24?: number }; fdv?: number; marketCap?: number; url?: string };
      const data = await res.json() as { pairs?: DexPair[] };
      const pair = data.pairs?.[0];
      if (!pair) return;
      const price = parseFloat(pair.priceUsd ?? "0");
      if (price > 0 && prevPrice.current !== null && price !== prevPrice.current) {
        const cls = price > prevPrice.current ? "flash-up" : "flash-down";
        setFlashClass(cls);
        setTimeout(() => setFlashClass(""), 800);
      }
      prevPrice.current = price;
      setToken({ price, change24h: pair.priceChange?.h24 ?? 0, mcap: pair.marketCap ?? pair.fdv ?? 0, volume24h: pair.volume?.h24 ?? 0, dexUrl: pair.url ?? `https://dexscreener.com/base/${LUCA_CA}` });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchToken(); const iv = setInterval(fetchToken, 30_000); return () => clearInterval(iv); }, [fetchToken]);
  useEffect(() => {
    fetch(`/api/token/chart?address=${LUCA_CA}`).then(r => r.json()).then((d: { prices?: SparkPoint[] }) => { if (d.prices?.length) setSpark(d.prices); }).catch(() => {});
  }, []);

  function copy() { navigator.clipboard.writeText(LUCA_CA).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  const changeDir = !token ? "flat" : token.change24h > 0 ? "up" : token.change24h < 0 ? "down" : "flat";

  return (
    <section className="lp-token-section">
      <div className="lp-token-card">
        <div className="lp-token-left">
          <p className="lp-token-eyebrow">Ecosystem Token · Base</p>
          <h2 className="lp-token-name">$LUCA</h2>
          <p className="lp-token-desc">$LUCA is the ecosystem token for x402Books and Luca. Hold it to unlock higher API limits, premium intelligence reports, and agent financial credits.</p>
          <div className="lp-token-ca">
            <span className="lp-token-ca-label">CA</span>
            <span className="lp-token-ca-addr">{LUCA_CA}</span>
            <button type="button" className="lp-token-ca-copy" onClick={copy} title="Copy contract address">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{copied ? "check" : "content_copy"}</span>
            </button>
          </div>
          <div className="lp-token-links">
            <a href={token?.dexUrl ?? `https://dexscreener.com/base/${LUCA_CA}`} target="_blank" rel="noreferrer" className="lp-token-link lp-token-link-primary">Buy $LUCA</a>
            <a href={token?.dexUrl ?? `https://dexscreener.com/base/${LUCA_CA}`} target="_blank" rel="noreferrer" className="lp-token-link lp-token-link-ghost">DexScreener ↗</a>
          </div>
        </div>
        <div className="lp-token-right">
          {!token ? (
            <div className="lp-token-loading"><span className="lp-token-live-dot" />Fetching live data…</div>
          ) : (
            <>
              <div>
                <div className="lp-token-price-row">
                  <span className={`lp-token-price ${flashClass}`}>{formatPrice(token.price)}</span>
                  <span className={`lp-token-change ${changeDir}`}>{changeDir === "up" ? "▲" : changeDir === "down" ? "▼" : ""}{Math.abs(token.change24h).toFixed(2)}%</span>
                </div>
                {spark.length > 1 && (<><Sparkline points={spark} /><p className="lp-token-spark-label">7-day price chart</p></>)}
                <div className="lp-token-stats">
                  <div className="lp-token-stat"><div className="lp-token-stat-label">Market Cap</div><div className="lp-token-stat-value">{token.mcap > 0 ? formatUsd(token.mcap) : "—"}</div></div>
                  <div className="lp-token-stat"><div className="lp-token-stat-label">24h Volume</div><div className="lp-token-stat-value">{token.volume24h > 0 ? formatUsd(token.volume24h) : "—"}</div></div>
                </div>
              </div>
              <div className="lp-token-live"><span className="lp-token-live-dot" />Live · updates every 30s</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── x402 API section ──────────────────────────────────────────────────────────

function X402ApiSection() {
  return (
    <section className="lp-section lp-section-alt" id="api">
      <FadeContent delay={60}>
        <div className="lp-section-head">
          <p className="lp-section-label">x402Books API</p>
          <h2 className="lp-h2">Agent-native financial data.</h2>
          <p className="lp-section-sub">Every endpoint is live on BANKR x402 Cloud — discoverable by any AI agent, paid in USDC on Base, settled on-chain. No subscriptions. No human in the loop.</p>
        </div>
      </FadeContent>
      <div className="lp-x402-grid">
        <div className="lp-x402-table-wrap">
          <div className="lp-x402-table-head"><span>Endpoint</span><span>USDC</span><span>$LUCA</span></div>
          {X402_ENDPOINTS.map((ep) => (
            <a key={ep.name} href={`${BANKR_BASE_URL}/${ep.name}`} target="_blank" rel="noreferrer" className="lp-x402-row">
              <div className="lp-x402-endpoint">
                <span className={`lp-x402-method ${ep.method === "POST" ? "post" : "get"}`}>{ep.method}</span>
                <div><code className="lp-x402-name">/{ep.name}</code><span className="lp-x402-desc">{ep.desc}</span></div>
              </div>
              <span className="lp-x402-price">{ep.usdc}</span>
              <span className="lp-x402-price xbooks">{ep.xbooks}</span>
            </a>
          ))}
          <div className="lp-x402-table-foot">
            <span>30% discount when paying with $LUCA</span>
            <a href="https://bankr.bot/x402" target="_blank" rel="noreferrer" className="lp-x402-bankr-link">View on BANKR ↗</a>
          </div>
        </div>
        <div className="lp-x402-code-wrap">
          <div className="lp-x402-code-head">
            <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
            <span style={{ fontSize: 12, color: "rgba(232,230,225,0.35)", marginLeft: 8 }}>agent.ts</span>
          </div>
          <pre className="lp-x402-code">{`import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

const wallet = createWalletClient({
  account, chain: base, transport: http()
});

const paidFetch = wrapFetchWithPayment(fetch, wallet);

// Agent queries its own financial state
const res = await paidFetch(
  "${BANKR_BASE_URL}/agent-financial-state" +
  "?wallet=0xYourAgentWallet&range=30d"
);

const data = await res.json();
// {
//   ecosystem: "BANKR",
//   treasury_health: "healthy",
//   activity_score: 74,
//   settlement_pattern: "stable_treasury"
// }`}</pre>
        </div>
      </div>
      <div className="lp-x402-trust">
        {["USDC on Base", "Settled on-chain", "Agent-discoverable", "No subscription", "Revenue to your wallet"].map((t) => (
          <span key={t} className="lp-x402-trust-item">
            <span className="lp-token-live-dot" style={{ width: 5, height: 5 }} />{t}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item${open ? " open" : ""}`}>
      <button type="button" className="lp-faq-q" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <span className="lp-faq-icon" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="lp-faq-a">{a}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <div className="lp-root">

      {/* ── Header ── */}
      <header className="lp-header">
        <a href="/" className="lp-brand"><Logo /></a>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/registry">Registry</Link>
          <Link href="/luca">Luca</Link>
          <Link href="/developer">API</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <div className="lp-social-icons lp-social-icons-desktop">
            {SOCIAL.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">{s.icon}</a>
            ))}
          </div>
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/registry" className="lp-btn-primary">Explore Registry</Link>
          <button type="button" className="lp-hamburger" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      {mobileMenuOpen && (
        <div className="lp-mobile-menu" role="dialog" aria-modal="true">
          <div className="lp-mobile-menu-head">
            <a href="/" className="lp-brand" onClick={() => setMobileMenuOpen(false)}><Logo /></a>
            <button type="button" className="lp-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <nav className="lp-mobile-nav">
            <Link href="/registry" onClick={() => setMobileMenuOpen(false)}>Registry</Link>
            <Link href="/luca" onClick={() => setMobileMenuOpen(false)}>Luca</Link>
            <Link href="/developer" onClick={() => setMobileMenuOpen(false)}>API</Link>
            <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
          </nav>
          <div className="lp-mobile-menu-footer">
            <div className="lp-social-icons">
              {SOCIAL.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">{s.icon}</a>
              ))}
            </div>
            <div className="lp-mobile-ctas">
              <Link href="/access" className="lp-btn-ghost" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
              <Link href="/registry" className="lp-btn-primary" onClick={() => setMobileMenuOpen(false)}>Explore Registry</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <FadeContent>
            <p className="lp-eyebrow">Financial Infrastructure · Autonomous Entities</p>
            <h1 className="lp-h1">
              Financial identity for<br />
              <em>autonomous agents.</em>
            </h1>
            <p className="lp-hero-sub">
              x402Books gives autonomous agents verified financial profiles, wallet-role clarity, treasury visibility, and readable intelligence — powered by Luca.
            </p>
            <div className="lp-hero-actions">
              <Link href="/registry" className="lp-btn-primary lp-btn-lg">Explore Registry</Link>
              <Link href="/luca" className="lp-btn-ghost lp-btn-lg">View Luca</Link>
            </div>
          </FadeContent>
        </div>

        {/* Agent profile card mockup */}
        <div className="lp-hero-card" aria-label="Agent financial profile card">
          <div className="lp-card-header">
            <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
            <span className="lp-card-title">Agent Financial Profile</span>
          </div>
          <div style={{ padding: "14px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>Luca</span>
              <span style={{ fontSize: "0.72rem", color: "rgba(232,230,225,0.4)" }}>$LUCA</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { label: "BANKR",   color: "#6DB874" },
                { label: "Healthy", color: "#6DB874" },
                { label: "Verified", color: "#6DB874" },
              ].map((b) => (
                <span key={b.label} style={{ fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: `1px solid color-mix(in srgb, ${b.color} 30%, transparent)`, background: `color-mix(in srgb, ${b.color} 10%, transparent)`, color: b.color }}>
                  {b.label}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: "0.6rem", color: "rgba(232,230,225,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Profile Status</span>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#6DB874" }}>Live Financial Data</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "right" }}>
                <span style={{ fontSize: "0.6rem", color: "rgba(232,230,225,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Data Confidence</span>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#6DB874" }}>High</span>
              </div>
            </div>
          </div>
          <div className="lp-card-cats" style={{ padding: "0 16px 12px" }}>
            {[["Financial Activity", 90, "#6DB874"], ["Partnership Fit", 64, "#5B8FA8"]].map(([label, pct, color]) => (
              <div key={String(label)} className="lp-cat-row">
                <span style={{ fontSize: "0.72rem" }}>{label}</span>
                <div className="lp-cat-track"><div className="lp-cat-fill" style={{ width: `${pct}%`, background: color as string }} /></div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, width: 20, textAlign: "right" }}>{pct}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 16px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "Stable Treasury", color: "#6DB874" },
              { label: "Recurring Flows", color: "#5B8FA8" },
            ].map((p) => (
              <span key={p.label} style={{ fontSize: "0.67rem", fontWeight: 600, padding: "3px 9px", borderRadius: 99, border: `1px solid color-mix(in srgb, ${p.color} 30%, transparent)`, background: `color-mix(in srgb, ${p.color} 10%, transparent)`, color: p.color }}>
                {p.label}
              </span>
            ))}
          </div>
          <div className="lp-card-badge" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "rgba(232,230,225,0.3)", fontWeight: 600 }}>x402Books AI</span>
            <Link href="/registry/luca" style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6DB874" }}>Full profile →</Link>
          </div>
        </div>
      </section>

      {/* ── Problem section ── */}
      <section className="lp-section lp-section-alt" id="problem">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">The problem</p>
            <h2 className="lp-h2">Agents are moving money.<br />Nobody knows who to trust.</h2>
          </div>
          <div className="lp-problem-grid">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="lp-problem-card">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* ── Registry section ── */}
      <section className="lp-section" id="registry">
        <FadeContent delay={60}>
          <div className="lp-registry-inner">
            <div className="lp-registry-text">
              <p className="lp-section-label">Agent Financial Registry</p>
              <h2 className="lp-h2" style={{ margin: "12px 0 14px" }}>
                Public financial profiles<br />for every agent.
              </h2>
              <p className="lp-registry-sub">
                One profile. Wallet roles declared. Treasury visible. Settlement activity classified. Luca&apos;s verdict attached. Embeddable anywhere.
              </p>
              <div className="lp-registry-stats">
                <div className="lp-registry-stat"><strong>84+</strong><span>Agents indexed</span></div>
                <div className="lp-registry-stat"><strong>5</strong><span>Ecosystems</span></div>
                <div className="lp-registry-stat"><strong>Live</strong><span>Settlement profiles</span></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: "1.5rem", flexWrap: "wrap" }}>
                <Link href="/registry" className="lp-btn-primary">Explore Registry →</Link>
                <Link href="/registry#verify" className="lp-btn-ghost">Claim your profile</Link>
              </div>
            </div>
            <div className="lp-registry-card">
              <div className="lp-card-header">
                <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
                <span className="lp-card-title">Agent Financial Registry</span>
              </div>
              <div style={{ padding: "1rem" }}>
                {[
                  { name: "Luca",       score: 90, health: "Healthy",  eco: "BANKR",    status: "Luca Managed", ecoColor: "#6DB874" },
                  { name: "AEON",       score: 72, health: "Stable",   eco: "AEON",     status: "Needs Verification", ecoColor: "#8B5CF6" },
                  { name: "nanopay",    score: 88, health: "Healthy",  eco: "Virtuals", status: "Verified", ecoColor: "#5B8FA8" },
                  { name: "Helixa",     score: 80, health: "Healthy",  eco: "BANKR",    status: "Verified", ecoColor: "#6DB874" },
                  { name: "BankrSynth", score: 65, health: "Watch",    eco: "BANKR",    status: "Candidate", ecoColor: "#6DB874" },
                ].map((agent) => (
                  <div key={agent.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
                    <span style={{ fontWeight: 600, flex: 1 }}>{agent.name}</span>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, border: `1px solid color-mix(in srgb, ${agent.ecoColor} 30%, transparent)`, background: `color-mix(in srgb, ${agent.ecoColor} 10%, transparent)`, color: agent.ecoColor, fontWeight: 600 }}>{agent.eco}</span>
                    <span style={{ color: agent.health === "Healthy" ? "#6DB874" : agent.health === "Stable" ? "#6DB874" : "#f59e0b", fontSize: 11, width: 52, textAlign: "right" }}>{agent.health}</span>
                    <span style={{ color: "var(--accent)", fontWeight: 700, width: 24, textAlign: "right" }}>{agent.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── Luca section ── */}
      <section className="lp-section lp-section-alt" id="luca">
        <FadeContent delay={60}>
          <div className="lp-registry-inner" style={{ gap: "4rem" }}>
            {/* Luca verdict card */}
            <div className="lp-registry-card" style={{ order: 0 }}>
              <div className="lp-card-header">
                <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
                <span className="lp-card-title">Luca · Financial Intelligence</span>
              </div>
              <div style={{ padding: "1.2rem 1rem", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { agent: "AEON", verdict: "Stable treasury. Heavy outbound settlement concentration. Recurring flow detected across 3 wallets.", pattern: "Stable Treasury", patternColor: "#6DB874" },
                  { agent: "Virtuals Agent #2", verdict: "Revenue generating. Treasury inflow exceeds outflow by 2.1×. Wallet roles unverified.", pattern: "Revenue", patternColor: "#5B8FA8" },
                  { agent: "BankrSynth", verdict: "Dormant. No settlement activity in 14 days. Treasury runway unknown without wallet declaration.", pattern: "Dormant", patternColor: "#7d828d" },
                ].map((item) => (
                  <div key={item.agent} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{item.agent}</span>
                      <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: `1px solid color-mix(in srgb, ${item.patternColor} 30%, transparent)`, background: `color-mix(in srgb, ${item.patternColor} 10%, transparent)`, color: item.patternColor }}>{item.pattern}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{item.verdict}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-registry-text" style={{ order: 1 }}>
              <p className="lp-section-label">Luca</p>
              <h2 className="lp-h2" style={{ margin: "12px 0 14px" }}>
                Turns raw activity<br />into intelligence.
              </h2>
              <p className="lp-registry-sub">
                Not a chatbot. A financial intelligence agent that interprets treasury activity, classifies settlement patterns, and generates cold operational verdicts — for every agent in the registry.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "18px 0" }}>
                {[
                  "Treasury health · Stable, Watch, At Risk",
                  "Settlement patterns · 10 classification types",
                  "Wallet role analysis · treasury, fee, deployer, operator",
                  "Operational signals · recurring flows, dormancy, concentration",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.82rem", color: "var(--muted)" }}>
                    <span style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }}>→</span>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/luca" className="lp-btn-primary">View Luca →</Link>
                <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" className="lp-btn-ghost">Talk to Luca</a>
              </div>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section" id="how">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-h2">From wallet declaration to financial identity.</h2>
          </div>
        </FadeContent>
        <div className="lp-steps">
          {HOW_IT_WORKS.map((s, i) => (
            <FadeContent key={s.num} delay={i * 80}>
              <div className="lp-step">
                <span className="lp-step-num">{s.num}</span>
                <code style={{ fontSize: "0.68rem", color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 7px", borderRadius: 5, fontFamily: "monospace", marginBottom: 6, display: "inline-block" }}>{s.code}</code>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </FadeContent>
          ))}
        </div>
      </section>

      {/* ── Ecosystems ── */}
      <section className="lp-section lp-section-alt" id="ecosystems">
        <FadeContent delay={60}>
          <div className="lp-section-head" style={{ marginBottom: "2rem" }}>
            <p className="lp-section-label">Ecosystems</p>
            <h2 className="lp-h2">Financial identity across the agent economy.</h2>
            <p className="lp-section-sub">Agents across every major ecosystem can declare wallets, get indexed, and receive a public financial profile.</p>
          </div>
          <div className="lp-eco-grid">
            {ECOSYSTEMS.map((eco) => (
              <Link key={eco.name} href={`/registry?eco=${eco.name}`} className="lp-eco-card" style={{ "--eco-color": eco.color } as React.CSSProperties}>
                <span className="lp-eco-dot" style={{ background: eco.color }} />
                <span className="lp-eco-name">{eco.name}</span>
                <span className="lp-eco-arrow">→</span>
              </Link>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* ── State of Agent Finance ── */}
      <section className="lp-section" id="saof">
        <FadeContent delay={60}>
          <div className="lp-saof-inner">
            <div className="lp-saof-text">
              <p className="lp-section-label">State of Agent Finance</p>
              <h2 className="lp-h2" style={{ margin: "12px 0 14px" }}>
                The intelligence show<br />for the agent economy.
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 480, marginBottom: "1.5rem" }}>
                Twice-weekly intelligence tracking treasury behavior, settlement activity, and financial infrastructure across the autonomous agent ecosystem. Research. Analysis. No hype.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="https://x.com/x402Books" target="_blank" rel="noreferrer" className="lp-btn-primary">Follow for updates →</a>
                <a href="https://t.me/x402books" target="_blank" rel="noreferrer" className="lp-btn-ghost">Join Telegram</a>
              </div>
            </div>
            <div className="lp-saof-card">
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>State of Agent Finance</span>
                <p style={{ margin: "6px 0 0", fontWeight: 700, fontSize: "0.95rem" }}>Issue #1 · Week of May 2026</p>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Agents indexed",       value: "84",       color: "var(--accent)" },
                  { label: "Wallets declared",      value: "12",       color: "var(--ink)" },
                  { label: "Verified profiles",     value: "4",        color: "var(--accent)" },
                  { label: "Ecosystems tracked",    value: "5",        color: "var(--ink)" },
                  { label: "Top pattern",           value: "Stable Treasury", color: "var(--accent)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--muted)" }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                  &ldquo;The agent economy is building financial infrastructure. x402Books is indexing it.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── $LUCA token (de-emphasized) ── */}
      <XBooksTokenSection />

      {/* ── x402 API ── */}
      <X402ApiSection />

      {/* ── FAQ ── */}
      <section className="lp-section lp-section-alt" id="faq">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">FAQ</p>
            <h2 className="lp-h2">Common questions.</h2>
          </div>
        </FadeContent>
        <div className="lp-faq-list">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta-section">
        <FadeContent>
          <div className="lp-v1-badge" style={{ margin: "0 auto 20px" }}>
            <span className="lp-v1-dot" />
            Registry is live
          </div>
          <h2 className="lp-h2">
            The agent economy is here.<br />
            Financial identity is no longer optional.
          </h2>
          <p>Explore the registry, claim your agent&apos;s profile, or talk to Luca.</p>
          <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <Link href="/registry" className="lp-btn-primary lp-btn-lg">Explore Registry</Link>
            <Link href="/registry#verify" className="lp-btn-ghost lp-btn-lg">Claim a Profile</Link>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" className="lp-btn-ghost lp-btn-lg">Talk to Luca</a>
          </div>
        </FadeContent>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <a href="/" className="lp-brand lp-brand-sm"><Logo /></a>
            <p>Financial identity and intelligence for autonomous agents.</p>
            <p className="lp-footer-builder">
              Built by <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">@danbuildss</a>
            </p>
            <div className="lp-footer-social">
              {SOCIAL.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">{s.icon}</a>
              ))}
            </div>
          </div>
          <div className="lp-footer-links">
            <div>
              <h4>Product</h4>
              <Link href="/registry">Registry</Link>
              <Link href="/luca">Luca</Link>
              <Link href="/developer">API</Link>
              <Link href="/docs">Docs</Link>
            </div>
            <div>
              <h4>Registry</h4>
              <Link href="/registry">Browse agents</Link>
              <Link href="/registry#verify">Claim profile</Link>
              <Link href="/registry?eco=AEON">AEON</Link>
              <Link href="/registry?eco=BANKR">BANKR</Link>
            </div>
            <div>
              <h4>Community</h4>
              <a href="https://x.com/x402Books" target="_blank" rel="noreferrer">X / Twitter</a>
              <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">@AskLucaBot</a>
              <a href="https://t.me/x402books" target="_blank" rel="noreferrer">Telegram</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 x402Books AI. All rights reserved.</span>
          <span>Built on Base · Powered by Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
