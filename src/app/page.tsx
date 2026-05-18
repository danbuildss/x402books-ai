"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Logo } from "@/components/logo";
import { FadeContent, TextType, ThemeToggle } from "@/components/effects";
import { ScrollLink } from "@/components/scroll-link";
import Link from "next/link";

const FEATURES = [
  { icon: "radar", title: "Wallet Scanner", body: "Paste any Base wallet and instantly fetch all USDC transfer activity, normalized and ready to read." },
  { icon: "psychology", title: "AI Categorization", body: "Claude AI classifies every transaction — API calls, data access, compute, DeFi, and more." },
  { icon: "flag", title: "Flag & Review", body: "Unusual amounts, duplicate patterns, and high-frequency bursts are surfaced automatically." },
  { icon: "picture_as_pdf", title: "PDF & CSV Export", body: "Generate a clean financial report PDF or export raw rows as CSV in one click." },
  { icon: "share", title: "Shareable Reports", body: "Every wallet report lives at a public URL you can paste anywhere — no login required to view." },
  { icon: "terminal", title: "Agent-Ready API", body: "Query the ledger via JSON API for agent pipelines, accounting tools, and onchain automation." },
];

const STEPS = [
  { num: "01", title: "Paste wallet address", body: "Copy any Base wallet address into the scanner bar." },
  { num: "02", title: "Scan USDC activity", body: "We fetch and normalize every USDC transfer from the Base chain." },
  { num: "03", title: "AI classifies it", body: "Claude labels categories, flags anomalies, and writes a narrative summary." },
  { num: "04", title: "Export & share", body: "Download PDF or CSV, or share the public report link." },
];

const TRUST_ITEMS = [
  { label: "Base USDC", sub: "Native chain support" },
  { label: "x402", sub: "Protocol native" },
  { label: "AI-Powered", sub: "Claude Haiku engine" },
  { label: "4 Ranges", sub: "7d · 14d · 30d · 90d" },
  { label: "PDF + CSV", sub: "One-click exports" },
  { label: "Open Access", sub: "No login to view reports" },
];

const INFRA = [
  {
    name: "Base",
    logo: (
      <svg width="22" height="22" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <rect width="100" height="100" rx="22" fill="#2200FF"/>
      </svg>
    ),
  },
  {
    name: "Privy",
    logo: (
      <svg width="22" height="22" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="44" r="36" fill="#080B0A"/>
        <ellipse cx="50" cy="90" rx="22" ry="7" fill="#080B0A" opacity="0.45"/>
      </svg>
    ),
  },
  {
    name: "Anthropic",
    logo: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-6.994 0H10.437l6.57 16.48H13.403l-1.28-3.282H5.247L3.967 20H.364l6.47-16.48zm3.364 4.823L8.197 13.49h3.985l-2.09-5.147z"/>
      </svg>
    ),
  },
  {
    name: "Supabase",
    logo: (
      <svg width="22" height="22" viewBox="0 0 109 113" fill="none" aria-hidden="true">
        <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fill="url(#sb1)"/>
        <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fill="url(#sb2)" fillOpacity=".2"/>
        <path d="M45.317 2.071C48.176-1.53 53.974.443 54.044 5.041l.652 67.251H9.475c-8.19 0-12.758-9.46-7.665-15.875L45.317 2.071z" fill="#3ECF8E"/>
        <defs>
          <linearGradient id="sb1" x1="53.974" y1="54.974" x2="94.163" y2="71.829" gradientUnits="userSpaceOnUse">
            <stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/>
          </linearGradient>
          <linearGradient id="sb2" x1="36.156" y1="30.578" x2="54.484" y2="65.081" gradientUnits="userSpaceOnUse">
            <stop/><stop offset="1" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: "Vercel",
    logo: (
      <svg width="22" height="22" viewBox="0 0 116 100" fill="currentColor" aria-hidden="true">
        <path d="M57.5 0L115 100H0L57.5 0z"/>
      </svg>
    ),
  },
];

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
  {
    href: "https://github.com/danbuildss/x402books-ai",
    label: "GitHub",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
];

const FAQ_ITEMS = [
  {
    q: "What is x402Books AI?",
    a: "x402Books AI is a financial intelligence tool for the agent economy. It scans Base wallet activity and turns raw USDC transactions into readable reports, categories, summaries, and exports.",
  },
  {
    q: "Who is x402Books AI built for?",
    a: "x402Books AI is built for AI agent developers, onchain builders, teams managing agent wallets, and anyone experimenting with x402 or Base payments who needs better visibility into wallet activity.",
  },
  {
    q: "What can I do with x402Books AI V1?",
    a: "In V1, you can scan any Base wallet, view spend and income, analyze transactions, categorize activity with AI, export PDF/CSV reports, generate agent-ready JSON output, and share public wallet reports.",
  },
  {
    q: "Does x402Books AI control my wallet or funds?",
    a: "No. x402Books AI is read-only. It analyzes public onchain wallet activity and does not custody funds, request private keys, or move assets from your wallet.",
  },
  {
    q: "What role does $XBOOKS play?",
    a: "$XBOOKS is the utility token for the x402Books ecosystem. It is designed to unlock premium features, discounted API usage, advanced reports, deep scans, and future agent-facing financial intelligence services.",
  },
];

const XBOOKS_CA      = "0x031d1a44785ef5e0bef61e226199122c5e1e4f02";
const BANKR_WALLET   = "0xb98f0de777eea8c481b64e33d3e0066cea38fa91";
const BANKR_BASE_URL = `https://x402.bankr.bot/${BANKR_WALLET}`;

const XBOOKS_UTILITIES = [
  { icon: "speed",        title: "Higher API Limits",      body: "Hold ≥1,000 $XBOOKS → 500 req/day. Hold ≥10,000 → 2,000 req/day. Free tier stays at 100." },
  { icon: "picture_as_pdf", title: "Premium Reports",     body: "Unlock PDF exports, full history exports, and deep wallet scans with $XBOOKS." },
  { icon: "vpn_key",      title: "30% API Discount",       body: "Pay for API calls in $XBOOKS and get 30% off every request versus USDC pricing." },
  { icon: "smart_toy",    title: "Agent Payments",         body: "AI agents pay $XBOOKS directly to access financial intelligence — no human in the loop." },
];

const X402_ENDPOINTS = [
  { name: "ledger-summary",        method: "GET",  usdc: "$0.02", xbooks: "$0.014", desc: "Income, spend, net flow, budget status" },
  { name: "transactions",          method: "GET",  usdc: "$0.02", xbooks: "$0.014", desc: "Paginated transaction history with USD values" },
  { name: "full-report",           method: "GET",  usdc: "$0.05", xbooks: "$0.035", desc: "Complete portfolio, daily flows, categories" },
  { name: "categorize",            method: "POST", usdc: "$0.15", xbooks: "$0.105", desc: "Claude AI transaction categorization" },
  { name: "agent-financial-state", method: "GET",  usdc: "$0.05", xbooks: "$0.035", desc: "Agent snapshot with ecosystem detection" },
];

function XBooksUtilities() {
  return (
    <section className="lp-section lp-section-alt" id="xbooks-utility">
      <FadeContent delay={60}>
        <div className="lp-section-head">
          <p className="lp-section-label">$XBOOKS Utility</p>
          <h2 className="lp-h2">Hold $XBOOKS. Pay less. Do more.</h2>
          <p className="lp-section-sub">$XBOOKS is not speculative — it is the economic layer of x402Books AI. Every feature, every discount, every limit upgrade is powered by the token.</p>
        </div>
      </FadeContent>
      <div className="lp-features-grid">
        {XBOOKS_UTILITIES.map((u, i) => (
          <FadeContent key={u.title} delay={i * 60}>
            <div className="lp-feature-card">
              <span className="lp-feature-icon">
                <span className="material-symbols-outlined">{u.icon}</span>
              </span>
              <h3>{u.title}</h3>
              <p>{u.body}</p>
            </div>
          </FadeContent>
        ))}
      </div>
    </section>
  );
}

function X402ApiSection() {
  return (
    <section className="lp-section" id="api">
      <FadeContent delay={60}>
        <div className="lp-section-head">
          <p className="lp-section-label">x402 API</p>
          <h2 className="lp-h2">Pay per query. No subscriptions.</h2>
          <p className="lp-section-sub">Every endpoint is live on BANKR x402 Cloud — discoverable by any AI agent, paid in USDC on Base, settled on-chain.</p>
        </div>
      </FadeContent>

      <div className="lp-x402-grid">
        {/* Endpoint table */}
        <div className="lp-x402-table-wrap">
          <div className="lp-x402-table-head">
            <span>Endpoint</span>
            <span>USDC</span>
            <span>$XBOOKS</span>
          </div>
          {X402_ENDPOINTS.map((ep) => (
            <a
              key={ep.name}
              href={`${BANKR_BASE_URL}/${ep.name}`}
              target="_blank"
              rel="noreferrer"
              className="lp-x402-row"
            >
              <div className="lp-x402-endpoint">
                <span className={`lp-x402-method ${ep.method === "POST" ? "post" : "get"}`}>{ep.method}</span>
                <div>
                  <code className="lp-x402-name">/{ep.name}</code>
                  <span className="lp-x402-desc">{ep.desc}</span>
                </div>
              </div>
              <span className="lp-x402-price">{ep.usdc}</span>
              <span className="lp-x402-price xbooks">{ep.xbooks}</span>
            </a>
          ))}
          <div className="lp-x402-table-foot">
            <span>30% discount when paying with $XBOOKS</span>
            <a href={`https://bankr.bot/x402`} target="_blank" rel="noreferrer" className="lp-x402-bankr-link">
              View on BANKR ↗
            </a>
          </div>
        </div>

        {/* Code snippet */}
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
//   financial_health: { net_flow_usd: 42.5 },
//   x402_payment_count: 128,
//   token_portfolio: [...]
// }`}</pre>
        </div>
      </div>

      {/* Trust strip */}
      <div className="lp-x402-trust">
        {["USDC on Base", "Settled on-chain", "Agent-discoverable", "No subscription", "Revenue to your wallet"].map((t) => (
          <span key={t} className="lp-x402-trust-item">
            <span className="lp-token-live-dot" style={{ width: 5, height: 5 }} />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

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
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
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
  const firstX = PAD;
  const lastX = W - PAD;
  const fill = `${coords[0]} L ${coords.join(" L ")} L ${lastX},${H} L ${firstX},${H} Z`;

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

function XBooksTokenSection() {
  const [token, setToken] = useState<TokenData | null>(null);
  const [spark, setSpark] = useState<SparkPoint[]>([]);
  const [copied, setCopied] = useState(false);
  const [flashClass, setFlashClass] = useState("");
  const prevPrice = useRef<number | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${XBOOKS_CA}`,
        { signal: AbortSignal.timeout(6_000) },
      );
      if (!res.ok) return;
      type DexPair = {
        priceUsd?: string;
        priceChange?: { h24?: number };
        volume?: { h24?: number };
        fdv?: number;
        marketCap?: number;
        url?: string;
      };
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

      setToken({
        price,
        change24h: pair.priceChange?.h24 ?? 0,
        mcap: pair.marketCap ?? pair.fdv ?? 0,
        volume24h: pair.volume?.h24 ?? 0,
        dexUrl: pair.url ?? `https://dexscreener.com/base/${XBOOKS_CA}`,
      });
    } catch { /* silent — live data, not critical */ }
  }, []);

  useEffect(() => {
    fetchToken();
    const iv = setInterval(fetchToken, 30_000);
    return () => clearInterval(iv);
  }, [fetchToken]);

  useEffect(() => {
    fetch(`/api/token/chart?address=${XBOOKS_CA}`)
      .then((r) => r.json())
      .then((d: { prices?: SparkPoint[] }) => { if (d.prices?.length) setSpark(d.prices); })
      .catch(() => { /* silent */ });
  }, []);

  function copy() {
    navigator.clipboard.writeText(XBOOKS_CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const changeDir = !token ? "flat" : token.change24h > 0 ? "up" : token.change24h < 0 ? "down" : "flat";

  return (
    <section className="lp-token-section">
      <div className="lp-token-card">
        {/* Left — identity */}
        <div className="lp-token-left">
          <p className="lp-token-eyebrow">Utility Token · Base</p>
          <h2 className="lp-token-name">$XBOOKS</h2>
          <p className="lp-token-desc">
            The economic layer of x402Books AI. Hold $XBOOKS to unlock higher API limits,
            premium reports, and agent-facing financial intelligence.
          </p>

          <div className="lp-token-ca">
            <span className="lp-token-ca-label">CA</span>
            <span className="lp-token-ca-addr">{XBOOKS_CA}</span>
            <button type="button" className="lp-token-ca-copy" onClick={copy} title="Copy contract address">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                {copied ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          <div className="lp-token-links">
            <a
              href={token?.dexUrl ?? `https://dexscreener.com/base/${XBOOKS_CA}`}
              target="_blank"
              rel="noreferrer"
              className="lp-token-link lp-token-link-primary"
            >
              Buy $XBOOKS
            </a>
            <a
              href={token?.dexUrl ?? `https://dexscreener.com/base/${XBOOKS_CA}`}
              target="_blank"
              rel="noreferrer"
              className="lp-token-link lp-token-link-ghost"
            >
              DexScreener ↗
            </a>
          </div>
        </div>

        {/* Right — live data */}
        <div className="lp-token-right">
          {!token ? (
            <div className="lp-token-loading">
              <span className="lp-token-live-dot" />
              Fetching live data…
            </div>
          ) : (
            <>
              <div>
                <div className="lp-token-price-row">
                  <span className={`lp-token-price ${flashClass}`}>{formatPrice(token.price)}</span>
                  <span className={`lp-token-change ${changeDir}`}>
                    {changeDir === "up" ? "▲" : changeDir === "down" ? "▼" : ""}
                    {Math.abs(token.change24h).toFixed(2)}%
                  </span>
                </div>

                {spark.length > 1 && (
                  <>
                    <Sparkline points={spark} />
                    <p className="lp-token-spark-label">7-day price chart</p>
                  </>
                )}

                <div className="lp-token-stats">
                  <div className="lp-token-stat">
                    <div className="lp-token-stat-label">Market Cap</div>
                    <div className="lp-token-stat-value">{token.mcap > 0 ? formatUsd(token.mcap) : "—"}</div>
                  </div>
                  <div className="lp-token-stat">
                    <div className="lp-token-stat-label">24h Volume</div>
                    <div className="lp-token-stat-value">{token.volume24h > 0 ? formatUsd(token.volume24h) : "—"}</div>
                  </div>
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

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <div className="lp-root">
      {/* ── Header ── */}
      <header className="lp-header">
        <a href="/" className="lp-brand">
          <Logo />
        </a>
        <nav className="lp-nav" aria-label="Main navigation">
          <ScrollLink targetId="how">How it works</ScrollLink>
          <ScrollLink targetId="features">Features</ScrollLink>
          <ScrollLink targetId="luca">Luca</ScrollLink>
          <ScrollLink targetId="faq">FAQ</ScrollLink>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <div className="lp-social-icons lp-social-icons-desktop">
            {SOCIAL.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">
                {s.icon}
              </a>
            ))}
          </div>
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
          <button
            type="button"
            className="lp-hamburger"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile menu overlay ── */}
      {mobileMenuOpen && (
        <div className="lp-mobile-menu" role="dialog" aria-modal="true">
          <div className="lp-mobile-menu-head">
            <a href="/" className="lp-brand" onClick={() => setMobileMenuOpen(false)}>
              <Logo />
            </a>
            <button type="button" className="lp-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <nav className="lp-mobile-nav">
            <ScrollLink targetId="how" onClick={() => setMobileMenuOpen(false)}>How it works</ScrollLink>
            <ScrollLink targetId="features" onClick={() => setMobileMenuOpen(false)}>Features</ScrollLink>
            <ScrollLink targetId="luca" onClick={() => setMobileMenuOpen(false)}>Luca</ScrollLink>
            <ScrollLink targetId="faq" onClick={() => setMobileMenuOpen(false)}>FAQ</ScrollLink>
            <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
          </nav>
          <div className="lp-mobile-menu-footer">
            <div className="lp-social-icons">
              {SOCIAL.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">
                  {s.icon}
                </a>
              ))}
            </div>
            <div className="lp-mobile-ctas">
              <Link href="/access" className="lp-btn-ghost" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
              <Link href="/dashboard" className="lp-btn-primary" onClick={() => setMobileMenuOpen(false)}>Open App</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <FadeContent>
            <div className="lp-v1-badge">
              <span className="lp-v1-dot" />
              v1 is live
            </div>
            <p className="lp-eyebrow">Onchain Financial Intelligence · Base USDC</p>
            <h1 className="lp-h1">
              Your onchain ledger,{" "}
              <em>finally readable.</em>
            </h1>
            <p className="lp-hero-typing">
              <TextType
                texts={[
                  "Paste a wallet. See everything.",
                  "AI categories. Instant clarity.",
                  "Export PDF. Share the link.",
                  "Flag anomalies. Stay in control.",
                ]}
                typingSpeed={52}
                deletingSpeed={30}
                pauseDuration={1400}
                showCursor
                cursorCharacter="|"
              />
            </p>
            <p className="lp-hero-sub">
              x402Books AI scans any Base wallet, classifies every USDC transaction with Claude AI, and delivers clean reports you can share, export, or query via API.
            </p>
            <div className="lp-hero-actions">
              <Link href="/dashboard" className="lp-btn-primary lp-btn-lg">Open App — Free</Link>
              <ScrollLink targetId="how" className="lp-btn-ghost lp-btn-lg">See how it works</ScrollLink>
            </div>
          </FadeContent>
        </div>

        <div className="lp-hero-card" aria-label="Product preview">
          <div className="lp-card-header">
            <span className="lp-card-dot green" />
            <span className="lp-card-dot yellow" />
            <span className="lp-card-dot red" />
            <span className="lp-card-title">Wallet Report · 30d</span>
          </div>
          <div className="lp-card-wallet">
            <span className="lp-card-label">Wallet</span>
            <strong className="lp-card-addr">0x7d3f…42f1</strong>
          </div>
          <div className="lp-card-stats">
            <div>
              <span>Total Income</span>
              <strong className="green">+$91.20</strong>
            </div>
            <div>
              <span>Total Spend</span>
              <strong className="red">−$42.80</strong>
            </div>
            <div>
              <span>Net Flow</span>
              <strong className="green">+$48.40</strong>
            </div>
            <div>
              <span>Transactions</span>
              <strong>128</strong>
            </div>
          </div>
          <div className="lp-card-chart">
            {[38, 62, 44, 78, 50, 70, 55, 82].map((h, i) => (
              <span key={i} className="lp-chart-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="lp-card-cats">
            {[["API calls", 74], ["Data access", 52], ["Compute", 38]].map(([label, pct]) => (
              <div key={String(label)} className="lp-cat-row">
                <span>{label}</span>
                <div className="lp-cat-track"><div className="lp-cat-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="lp-card-badge">
            <span className="lp-badge-pill">128 likely x402</span>
            <span className="lp-badge-pill green">CSV ready</span>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="lp-trust-bar">
        {TRUST_ITEMS.map((t) => (
          <div key={t.label} className="lp-trust-item">
            <strong>{t.label}</strong>
            <span>{t.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Infrastructure marquee ── */}
      <div className="lp-infra-strip">
        <span className="lp-infra-label">Built on</span>
        <div className="lp-infra-track">
          <div className="lp-infra-reel">
            {[...INFRA, ...INFRA].map((item, i) => (
              <div key={i} className="lp-infra-item">
                <span className="lp-infra-logo">{item.logo}</span>
                <span className="lp-infra-name">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="lp-section" id="how">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-h2">From raw wallet to clean report in seconds.</h2>
          </div>
        </FadeContent>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <FadeContent key={s.num} delay={i * 80}>
              <div className="lp-step">
                <span className="lp-step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </FadeContent>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section lp-section-alt" id="features">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">Features</p>
            <h2 className="lp-h2">Financial visibility for the onchain economy.</h2>
            <p className="lp-section-sub">Everything you need to understand, audit, and share Base USDC activity.</p>
          </div>
        </FadeContent>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <FadeContent key={f.title} delay={i * 60}>
              <div className="lp-feature-card">
                <span className="lp-feature-icon">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </FadeContent>
          ))}
        </div>
      </section>

      {/* ── $XBOOKS utilities ── */}
      <XBooksUtilities />

      {/* ── $XBOOKS token ── */}
      <XBooksTokenSection />

      {/* ── x402 API endpoints ── */}
      <X402ApiSection />

      {/* ── Product Preview ── */}
      <section className="lp-section" id="preview">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">Product preview</p>
            <h2 className="lp-h2">Three views. One complete picture.</h2>
          </div>
        </FadeContent>
        <div className="lp-preview-grid">
          <div className="lp-preview-card">
            <div className="lp-preview-label">Dashboard</div>
            <div className="lp-preview-stats">
              <div><span>Spend</span><strong>$42.80</strong></div>
              <div><span>Income</span><strong>$91.20</strong></div>
              <div><span>Net</span><strong>+$48.40</strong></div>
              <div><span>Txns</span><strong>128</strong></div>
            </div>
            <div className="lp-preview-chart">
              {[32, 58, 41, 74, 52, 68, 45, 72].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="lp-preview-card">
            <div className="lp-preview-label">Transactions</div>
            <table className="lp-preview-table">
              <thead><tr><th>Amount</th><th>Category</th><th>Time</th></tr></thead>
              <tbody>
                <tr><td>0.42 USDC</td><td>API call</td><td>2h ago</td></tr>
                <tr><td>1.20 USDC</td><td>Data access</td><td>5h ago</td></tr>
                <tr><td>12.80 USDC</td><td>Income</td><td>1d ago</td></tr>
                <tr><td>0.18 USDC</td><td>Compute</td><td>1d ago</td></tr>
              </tbody>
            </table>
          </div>
          <div className="lp-preview-card lp-preview-json">
            <div className="lp-preview-label">Agent API</div>
            <pre className="lp-json">{`{
  "wallet": "0x7d3f…42f1",
  "range": "30d",
  "total_spend": 42.80,
  "total_income": 91.20,
  "net_flow": 48.40,
  "top_category": "api_call",
  "budget_status": "safe",
  "likely_x402_count": 128
}`}</pre>
          </div>
        </div>
      </section>

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

      {/* ── Meet Luca ── */}
      <section className="lp-section lp-section-alt" id="luca">
        <FadeContent delay={60}>
          <div className="lp-luca-inner">
            <div className="lp-luca-avatar-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/luca-avatar.png" alt="Luca — AI Accountant" className="lp-luca-avatar" />
            </div>
            <div className="lp-luca-text">
              <p className="lp-section-label">Meet Luca</p>
              <h2 className="lp-h2" style={{ margin: "12px 0 10px" }}>Your AI accountant, on Telegram.</h2>
              <p className="lp-luca-sub">
                Send Luca a wallet address. He audits it, categorizes transactions, scores financial health, and returns a clean report — instantly.
              </p>
              <div className="lp-luca-caps">
                {["Wallet Audits", "Transaction Reports", "Anomaly Detection", "Financial Scoring", "Agent Spend Review"].map((cap) => (
                  <span key={cap} className="lp-luca-cap">{cap}</span>
                ))}
              </div>
              <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" className="lp-btn-primary lp-luca-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Talk to Luca — @AskLucaBot
              </a>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <FadeContent>
          <div className="lp-v1-badge" style={{ margin: "0 auto 20px" }}>
            <span className="lp-v1-dot" />
            v1 is live
          </div>
          <h2 className="lp-h2">Ready to read your onchain ledger?</h2>
          <p>Paste your Base wallet address and get your first report in under 10 seconds. Free, no sign-in required.</p>
          <Link href="/dashboard" className="lp-btn-primary lp-btn-lg">Open App — It&apos;s Free</Link>
        </FadeContent>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <a href="/" className="lp-brand lp-brand-sm">
              <Logo />
            </a>
            <p>Onchain financial intelligence for Base USDC.</p>
            <p className="lp-footer-builder">
              Built by{" "}
              <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">@danbuildss</a>
            </p>
            <div className="lp-footer-social">
              {SOCIAL.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          <div className="lp-footer-links">
            <div>
              <h4>Product</h4>
              <ScrollLink targetId="how">How it works</ScrollLink>
              <ScrollLink targetId="features">Features</ScrollLink>
              <ScrollLink targetId="luca">Meet Luca</ScrollLink>
              <ScrollLink targetId="faq">FAQ</ScrollLink>
            </div>
            <div>
              <h4>App</h4>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/transactions">Transactions</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/developer">Developer</Link>
            </div>
            <div>
              <h4>Docs</h4>
              <Link href="/docs">Overview</Link>
              <Link href="/docs#api">API Reference</Link>
              <Link href="/docs#agent">Agent JSON</Link>
              <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">@AskLucaBot</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 x402Books AI. All rights reserved.</span>
          <span>Built on Base · Powered by Claude AI · v1</span>
        </div>
      </footer>
    </div>
  );
}
