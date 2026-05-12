import { Logo } from "@/components/logo";
import { FadeContent, TextType } from "@/components/effects";
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
  { label: "AI-Powered", sub: "Claude Haiku engine" },
  { label: "4 Ranges", sub: "7d · 14d · 30d · 90d" },
  { label: "PDF + CSV", sub: "One-click exports" },
  { label: "Open Access", sub: "No login to view reports" },
];

const SOCIAL = [
  {
    href: "https://x.com/x402Books",
    label: "X (Twitter)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.255 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    href: "https://t.me/x402books",
    label: "Telegram",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    href: "https://github.com/danbuildss/x402books-ai",
    label: "GitHub",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="lp-root">
      {/* ── Header ── */}
      <header className="lp-header">
        <a href="/" className="lp-brand">
          <Logo />
          <span>x402Books AI</span>
        </a>
        <nav className="lp-nav" aria-label="Main navigation">
          <ScrollLink targetId="how">How it works</ScrollLink>
          <ScrollLink targetId="features">Features</ScrollLink>
          <ScrollLink targetId="preview">Preview</ScrollLink>
        </nav>
        <div className="lp-header-right">
          <div className="lp-social-icons">
            {SOCIAL.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">
                {s.icon}
              </a>
            ))}
          </div>
          <Link href="/access" className="lp-btn-ghost">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <FadeContent>
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
            <div><span>Total Income</span><strong className="green">+$91.20</strong></div>
            <div><span>Total Spend</span><strong className="red">−$42.80</strong></div>
            <div><span>Net Flow</span><strong className="green">+$48.40</strong></div>
            <div><span>Transactions</span><strong>128</strong></div>
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
                <span className="lp-feature-icon material-symbols-outlined">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </FadeContent>
          ))}
        </div>
      </section>

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

      {/* ── Community ── */}
      <section className="lp-section lp-section-alt">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">Community</p>
            <h2 className="lp-h2">Join the x402Books community.</h2>
            <p className="lp-section-sub">Follow updates, ask questions, and contribute on GitHub.</p>
          </div>
        </FadeContent>
        <div className="lp-community-grid">
          {SOCIAL.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className="lp-community-card">
              <span className="lp-community-icon">{s.icon}</span>
              <strong>{s.label}</strong>
              <span>{s.href.replace("https://", "")}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <FadeContent>
          <h2 className="lp-h2">Ready to read your onchain ledger?</h2>
          <p>Paste your Base wallet address and get your first report in under 10 seconds.</p>
          <Link href="/dashboard" className="lp-btn-primary lp-btn-lg">Open App — It&apos;s Free</Link>
        </FadeContent>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <a href="/" className="lp-brand">
              <Logo />
              <span>x402Books AI</span>
            </a>
            <p>Onchain financial intelligence for Base USDC.</p>
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
              <ScrollLink targetId="preview">Preview</ScrollLink>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div>
              <h4>Connect</h4>
              <a href="https://x.com/x402Books" target="_blank" rel="noreferrer">X @x402Books</a>
              <a href="https://t.me/x402books" target="_blank" rel="noreferrer">Telegram</a>
              <a href="https://github.com/danbuildss/x402books-ai" target="_blank" rel="noreferrer">GitHub</a>
            </div>
            <div>
              <h4>App</h4>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/transactions">Transactions</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/reports">Reports</Link>
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
