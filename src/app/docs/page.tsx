"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "Introduction",
    items: [
      { id: "overview", label: "Overview" },
      { id: "features", label: "V1 Features" },
      { id: "how-it-works", label: "How It Works" },
    ],
  },
  {
    label: "Product",
    items: [
      { id: "core-pages", label: "Core Pages" },
      { id: "api", label: "API Reference" },
    ],
  },
  {
    label: "Token",
    items: [
      { id: "xbooks", label: "$LUCA Utility" },
      { id: "monetization", label: "Monetization" },
    ],
  },
  {
    label: "Vision",
    items: [
      { id: "roadmap", label: "Roadmap" },
    ],
  },
  {
    label: "Trust",
    items: [
      { id: "security", label: "Security" },
      { id: "faq", label: "FAQ" },
      { id: "positioning", label: "Positioning" },
    ],
  },
];

const ALL_IDS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

const FEATURES = [
  { icon: "lock_open", label: "Auth", items: ["Privy login (email + X)", "Persistent sessions", "User profile stored securely"] },
  { icon: "dashboard", label: "Dashboard", items: ["4 date ranges (7d · 14d · 30d · 90d)", "Spend, Income, Net Flow, Tx Count", "AI summary, line chart, donut chart"] },
  { icon: "receipt_long", label: "Transactions", items: ["Searchable + filterable table", "Inline AI category editing", "Per-transaction notes + detail drawer"] },
  { icon: "flag", label: "Flags", items: ["Duplicate & unusual amount detection", "High-frequency + unknown counterparty flags", "Bulk mark-reviewed workflow"] },
  { icon: "description", label: "Reports", items: ["PDF + CSV export", "Agent-ready JSON output", "Income vs Spend visual + counterparties"] },
  { icon: "category", label: "Categories", items: ["AI-categorized spend breakdown", "Horizontal bar chart by category", "Income breakdown + AI narrative"] },
  { icon: "account_balance_wallet", label: "Wallets", items: ["Recently scanned wallets", "Quick wallet switching", "Top counterparties by volume"] },
  { icon: "share", label: "Public Reports", items: ["Shareable /report/[wallet] URL", "No login required to view", "Live data with range switcher"] },
];

const CORE_PAGES = [
  { path: "/dashboard", name: "Overview", desc: "Wallet scanner, stat cards, AI summary, charts, and recent activity.", actions: "Scan wallet, change range, categorize, export" },
  { path: "/transactions", name: "Transactions", desc: "Full transaction explorer with search, filters, inline editing, and detail drawer.", actions: "Edit category, add note, open in Basescan" },
  { path: "/flags", name: "Flags", desc: "Risk review queue surfacing anomalous activity across all transactions.", actions: "Filter by flag type, mark reviewed, bulk clear" },
  { path: "/reports", name: "Reports", desc: "Reporting center for PDF, CSV, JSON, and visual financial summaries.", actions: "Download PDF, export CSV, copy agent JSON" },
  { path: "/categories", name: "Categories", desc: "Category intelligence page breaking down spend and income by type.", actions: "View breakdown, read AI narrative insight" },
  { path: "/wallets", name: "Wallets", desc: "Wallet management with counterparty analysis and quick switching.", actions: "Switch wallet, copy address, open Basescan" },
  { path: "/settings", name: "Settings", desc: "Account preferences — theme, wallet, sign-out, and cache management.", actions: "Toggle theme, clear cache, sign out" },
  { path: "/report/[wallet]", name: "Public Report", desc: "Publicly shareable wallet report — no authentication required.", actions: "Share link, download PDF, switch range" },
];

const ROADMAP = [
  {
    phase: "Phase 1",
    title: "Financial Identity Layer",
    status: "live",
    items: [
      "Wallet scanner + AI categorization (16 categories)",
      "Dashboard, analytics, PDF / CSV export",
      "Public shareable report links — no auth required",
      "Agent Financial Registry — 84 agents indexed",
      "Developer API keys + $LUCA tier system",
      "Settlement classifier + Luca verdict signals",
    ],
  },
  {
    phase: "Phase 2",
    title: "Trust & Registry Infrastructure",
    status: "live",
    items: [
      "Agent verification submissions queue",
      "Wallet manifest format (.x402books/wallets.json)",
      "AEON + EigenCloud ecosystem integration — 5 ecosystems live",
      "Settlement pattern badges on public profiles",
      "Growth OS — product usage metrics",
      "Registry fully DB-driven via Supabase",
    ],
  },
  {
    phase: "Phase 3",
    title: "Ecosystem Embeds",
    status: "next",
    items: [
      "Surplus inference spend logging",
      "Virtuals agent onboarding",
      "Embeddable agent profile cards — live at /registry/[slug]/card",
      "x402Books profile sharing as default trust signal",
    ],
  },
  {
    phase: "Phase 4",
    title: "Financial Intelligence",
    status: "planned",
    items: [
      "Treasury health alerts",
      "Settlement quality scoring",
      "Operational runway tracking",
      "Recurring spend detection",
      "Inference economics dashboard",
    ],
  },
  {
    phase: "Phase 5",
    title: "Network Effects",
    status: "planned",
    items: [
      "Public leaderboards by activity score",
      "Ecosystem discovery feed",
      "Verified treasury badge — projects earn it",
      "Embeddable report cards",
      "State of Agent Finance — weekly reports",
    ],
  },
  {
    phase: "Phase 6",
    title: "Infrastructure Revenue",
    status: "planned",
    items: [
      "Verification as a service",
      "Premium treasury reports",
      "Enterprise monitoring API",
      "Compliance-grade audit exports",
      "Ecosystem analytics packages",
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "What is x402Books AI?",
    a: "x402Books AI is a financial intelligence platform that turns Base wallet activity into readable reports, AI-categorized transactions, and agent-ready data. It gives developers and builders the accounting layer for the agent economy.",
  },
  {
    q: "Who is x402Books AI for?",
    a: "AI agent developers, onchain builders, teams managing agent wallets, x402 developers, and Base ecosystem builders who need clear financial visibility into wallet activity.",
  },
  {
    q: "Does x402Books AI control my funds?",
    a: "No. x402Books AI is read-only. It analyzes public onchain data. It never requests private keys, executes transactions, or takes custody of any assets.",
  },
  {
    q: "What can I do in V1?",
    a: "Scan any Base wallet, view spend and income analytics, AI-categorize transactions, export PDF and CSV reports, generate agent-ready JSON, and share public wallet report links.",
  },
  {
    q: "What is $LUCA?",
    a: "$LUCA is Luca's intelligence token. It unlocks deep financial analysis, premium treasury reports, and priority verification via Luca. It is not required to use x402Books or the API — those are separate.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes. Wallet scanning, transaction analytics, and public report sharing are free. Premium features including advanced exports, deep scans, and API access will be part of paid tiers.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`docs-faq-item${open ? " open" : ""}`}>
      <button type="button" className="docs-faq-q" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <span className="docs-faq-chevron">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="docs-faq-a">{a}</p>}
    </div>
  );
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNavOpen(false);
  }

  return (
    <div className="docs-root">
      {/* ── Header ── */}
      <header className="docs-header">
        <div className="docs-header-inner">
          <div className="docs-header-left">
            <span className="docs-header-title">Documentation</span>
          </div>
          <div className="docs-header-right">
            <div className="docs-version-pill">v1 · Live</div>
            <a href="/" className="docs-back-link">← Back to home</a>
            <Link href="/dashboard" className="docs-open-btn">Open App</Link>
            <button
              type="button"
              className="docs-mobile-toggle"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Layout ── */}
      <div className="docs-layout">
        {/* Sidebar */}
        <aside className={`docs-sidebar${mobileNavOpen ? " open" : ""}`}>
          <div className="docs-sidebar-inner">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="docs-nav-group">
                <p className="docs-nav-label">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`docs-nav-link${activeId === item.id ? " active" : ""}`}
                    onClick={() => scrollTo(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
            <div className="docs-sidebar-cta-wrap">
              <Link href="/dashboard" className="docs-sidebar-cta">Open App →</Link>
              <a href="https://x.com/x402Books" target="_blank" rel="noreferrer" className="docs-sidebar-link-ext">@x402Books on X</a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="docs-content">

          {/* ── Overview ── */}
          <section id="overview" className="docs-section">
            <span className="docs-tag">Introduction</span>
            <h1 className="docs-h1">x402Books AI</h1>
            <p className="docs-lead">The financial intelligence layer for the agent economy.</p>
            <p className="docs-p">
              AI agents are becoming economic actors. They pay for APIs, data, compute, and services — all onchain, all in USDC. But raw wallet data tells you nothing useful on its own.
            </p>
            <p className="docs-p">
              x402Books AI solves this. It scans any Base wallet and turns raw USDC activity into structured financial reports, AI-categorized transactions, exportable data, and agent-readable JSON output.
            </p>

            <div className="docs-callout">
              <strong>In one line:</strong> x402Books AI turns wallet activity into readable books.
            </div>

            <h2 className="docs-h2">What you can do</h2>
            <ul className="docs-list">
              <li>Scan any Base wallet and view spend, income, and net flow</li>
              <li>AI-categorize every transaction — API calls, compute, data, services, income</li>
              <li>Review flagged or anomalous activity in a dedicated queue</li>
              <li>Export financial reports as PDF, CSV, or agent-ready JSON</li>
              <li>Share public wallet reports via a permanent link — no login required</li>
              <li>Query wallet financial data programmatically via the API</li>
            </ul>

            <h2 className="docs-h2">Who it's for</h2>
            <div className="docs-audience-grid">
              {[
                { label: "AI Agent Developers", desc: "Understand what your agents are spending and earning onchain." },
                { label: "Onchain Builders", desc: "Get financial clarity on any Base wallet you work with." },
                { label: "x402 Developers", desc: "Track micropayment activity and identify x402 payment patterns." },
                { label: "Protocol Teams", desc: "Monitor wallet-level financial activity across your ecosystem." },
              ].map((a) => (
                <div key={a.label} className="docs-audience-card">
                  <strong>{a.label}</strong>
                  <p>{a.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="docs-h2">Why it matters</h2>
            <p className="docs-p">
              Without a financial intelligence layer, agent wallet activity is invisible — raw hashes, no context, no categories. You can't tell what was spent, where income came from, or whether a transaction was unusual.
            </p>
            <p className="docs-p">
              x402Books AI makes wallet activity readable, reportable, and actionable — for both humans and the agents themselves.
            </p>
          </section>

          {/* ── V1 Features ── */}
          <section id="features" className="docs-section">
            <span className="docs-tag">Introduction</span>
            <h1 className="docs-h1">V1 Features</h1>
            <p className="docs-lead">Everything included in the live v1 release.</p>
            <div className="docs-version-status">
              <span className="docs-status-dot" />
              V1 is live and open for feedback.
            </div>
            <div className="docs-features-grid">
              {FEATURES.map((f) => (
                <div key={f.label} className="docs-feature-card">
                  <div className="docs-feature-head">
                    <span className="material-symbols-outlined docs-feature-icon">{f.icon}</span>
                    <strong>{f.label}</strong>
                  </div>
                  <ul className="docs-feature-list">
                    {f.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ── How It Works ── */}
          <section id="how-it-works" className="docs-section">
            <span className="docs-tag">Introduction</span>
            <h1 className="docs-h1">How It Works</h1>
            <p className="docs-lead">Six steps from raw wallet data to financial intelligence.</p>

            <div className="docs-steps">
              {[
                { n: "01", title: "Sign In", body: "Authenticate with Privy using your email or X/Twitter account. Your session is persisted securely — no wallet signature required." },
                { n: "02", title: "Paste a Wallet Address", body: "Enter any Base wallet address into the scanner. x402Books AI is read-only — it works with public onchain data only." },
                { n: "03", title: "Fetch & Normalize Activity", body: "x402Books AI fetches all USDC transfers for the wallet across the selected date range (7d, 14d, 30d, or 90d) and normalizes the raw data." },
                { n: "04", title: "AI Categorization", body: "Claude AI classifies each transaction into a category — API Calls, Data Access, Compute, Agent Services, Income, and more. A rule-based fallback ensures every transaction is classified." },
                { n: "05", title: "Generate Reports", body: "Export your financial data as a PDF report, CSV spreadsheet, or structured agent-ready JSON. All formats are available from the Reports page." },
                { n: "06", title: "Share Public Reports", body: "Every wallet report is available at a permanent public URL. Share it with anyone — no login required to view." },
              ].map((s) => (
                <div key={s.n} className="docs-step">
                  <span className="docs-step-num">{s.n}</span>
                  <div className="docs-step-body">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="docs-h2">Transaction categories</h2>
            <p className="docs-p">AI categorization assigns each transaction one of the following labels:</p>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Categories</span></div>
              <pre>{`api_call          → API endpoint consumption
data_access       → Data query or feed access
compute           → Compute or inference cost
agent_service     → Payment to another agent
subscription      → Recurring service payment
income            → Inbound USDC received
refund            → Returned payment
internal_transfer → Wallet-to-wallet self-transfer
unknown           → Unclassified activity`}</pre>
            </div>
          </section>

          {/* ── Core Pages ── */}
          <section id="core-pages" className="docs-section">
            <span className="docs-tag">Product</span>
            <h1 className="docs-h1">Core Pages</h1>
            <p className="docs-lead">Every page in the x402Books AI app and what it does.</p>

            <div className="docs-pages-list">
              {CORE_PAGES.map((page) => (
                <div key={page.path} className="docs-page-row">
                  <div className="docs-page-path">
                    <code>{page.path}</code>
                    <strong>{page.name}</strong>
                  </div>
                  <div className="docs-page-detail">
                    <p>{page.desc}</p>
                    <span className="docs-page-actions">{page.actions}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── API Reference ── */}
          <section id="api" className="docs-section">
            <span className="docs-tag">Product</span>
            <h1 className="docs-h1">API Reference</h1>
            <p className="docs-lead">Programmatic access to wallet financial intelligence.</p>

            <div className="docs-callout docs-callout-info">
              The API is live. Generate your key at <a href="/developer" style={{ color: "var(--accent)" }}>/developer</a>. Free tier starts at 100 req/day — no token required.
            </div>

            <h2 className="docs-h2">Endpoints</h2>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/ledger/summary</code>
              </div>
              <p className="docs-p">Returns a financial summary for a given wallet and time range.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`GET /api/ledger/summary?wallet=0x...&period=30d`}</pre>
              </div>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response</span></div>
                <pre>{`{
  "wallet": "0x7d3f...42f1",
  "range": "30d",
  "total_spend": 42.80,
  "total_income": 91.20,
  "net_flow": 48.40,
  "transaction_count": 128,
  "likely_x402_count": 94,
  "top_category": "api_call",
  "budget_status": "safe"
}`}</pre>
              </div>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/ledger/transactions</code>
              </div>
              <p className="docs-p">Returns paginated, categorized transactions for a wallet.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`GET /api/ledger/transactions?wallet=0x...&period=30d&page=1`}</pre>
              </div>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response</span></div>
                <pre>{`{
  "transactions": [
    {
      "tx_hash": "0xabc...",
      "direction": "expense",
      "amount_usdc": 0.42,
      "category": "api_call",
      "counterparty": "0xdef...",
      "is_likely_x402": true,
      "confidence_score": 92,
      "timestamp": "2026-05-01T14:32:00Z"
    }
  ],
  "total": 128,
  "page": 1
}`}</pre>
              </div>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method post">POST</span>
                <code>/api/ledger/categorize</code>
              </div>
              <p className="docs-p">Runs AI categorization on a wallet's transactions for a given period.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`POST /api/ledger/categorize
Content-Type: application/json

{
  "wallet": "0x7d3f...42f1",
  "period": "30d"
}`}</pre>
              </div>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/ledger/report</code>
              </div>
              <p className="docs-p">Returns the full report data used to render public wallet report pages.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`GET /api/ledger/report?wallet=0x...&period=30d`}</pre>
              </div>
            </div>

            <h2 className="docs-h2">Agent JSON output</h2>
            <p className="docs-p">
              x402Books AI generates structured JSON that agents can consume directly to understand their own financial state. This enables agents to make budget-aware decisions.
            </p>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Agent financial state</span></div>
              <pre>{`{
  "wallet": "0x7d3f...42f1",
  "generated_at": "2026-05-12T10:00:00Z",
  "range": "30d",
  "summary": {
    "total_spend": 42.80,
    "total_income": 91.20,
    "net_flow": 48.40,
    "transaction_count": 128
  },
  "categories": [
    { "category": "api_call", "total_usdc": 18.40, "count": 74 },
    { "category": "data_access", "total_usdc": 11.25, "count": 31 },
    { "category": "compute", "total_usdc": 13.15, "count": 23 }
  ],
  "report": {
    "title": "Healthy agent wallet with consistent API spend",
    "narrative": "This wallet shows steady outflows across API and compute categories...",
    "budget_status": "safe",
    "top_category": "api_call"
  }
}`}</pre>
            </div>
            <div className="docs-callout">
              <strong>Example use case:</strong> An agent reads its wallet report via the API before deciding whether it has sufficient balance to initiate another API call.
            </div>
          </section>

          {/* ── $LUCA ── */}
          <section id="xbooks" className="docs-section">
            <span className="docs-tag">Token</span>
            <h1 className="docs-h1">$LUCA</h1>
            <p className="docs-lead">The token for Luca — not for x402Books API access.</p>
            <p className="docs-p">
              $LUCA is Luca&apos;s intelligence token. It unlocks the full power of Luca as a financial intelligence agent — deeper analysis, premium reports, and priority verification. It is not required to use x402Books or the registry API.
            </p>

            <div className="docs-utility-grid">
              {[
                { icon: "analytics", title: "Deep Financial Analysis", desc: "Luca goes beyond surface scores. Full settlement classification, treasury runway, counterparty concentration — the complete operational picture." },
                { icon: "description", title: "Premium Treasury Reports", desc: "Audit-ready financial reports for your agent. Shareable, generated by Luca on demand, structured for compliance." },
                { icon: "verified", title: "Priority Verification", desc: "Skip the queue. $LUCA holders get priority wallet manifest review and faster profile upgrades in the registry." },
              ].map((u) => (
                <div key={u.title} className="docs-utility-card">
                  <span className="material-symbols-outlined docs-utility-icon">{u.icon}</span>
                  <div>
                    <strong>{u.title}</strong>
                    <p>{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="docs-callout">
              <strong>x402Books API is separate.</strong> Accessing the registry, wallet data, and financial intelligence endpoints does not require $LUCA. API access is tiered by usage volume — free, developer, and enterprise.
            </div>

            <h2 className="docs-h2">Access tiers</h2>
            <div className="docs-tier-table-wrap">
              <table className="docs-tier-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free</th>
                    <th>Pro</th>
                    <th>Team</th>
                    <th>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Wallet scanning", "✓", "✓", "✓", "✓"],
                    ["Transaction analytics", "✓", "✓", "✓", "✓"],
                    ["AI categorization", "✓", "✓", "✓", "✓"],
                    ["Public report sharing", "✓", "✓", "✓", "✓"],
                    ["PDF + CSV export", "—", "✓", "✓", "✓"],
                    ["Deep wallet scans", "—", "✓", "✓", "✓"],
                    ["API access", "—", "—", "✓", "✓"],
                    ["Multi-wallet tracking", "—", "—", "✓", "✓"],
                    ["Agent financial score", "—", "—", "—", "✓"],
                    ["High-frequency queries", "—", "—", "—", "✓"],
                  ].map(([feat, ...tiers]) => (
                    <tr key={String(feat)}>
                      <td>{feat}</td>
                      {tiers.map((v, i) => (
                        <td key={i} className={v === "✓" ? "tier-yes" : "tier-no"}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Monetization ── */}
          <section id="monetization" className="docs-section">
            <span className="docs-tag">Token</span>
            <h1 className="docs-h1">Monetization</h1>
            <p className="docs-lead">Multiple revenue streams built for the agent economy.</p>

            <div className="docs-mono-grid">
              {[
                { n: "01", title: "SaaS Subscriptions", desc: "Monthly access to Pro and Team tiers with advanced features, exports, and multi-wallet support." },
                { n: "02", title: "API Usage Fees", desc: "Pay-per-call pricing for developers and agents querying wallet financial data programmatically." },
                { n: "03", title: "Premium Reports", desc: "On-demand deep scans, full history exports, and tax-style PDF reports for detailed financial analysis." },
                { n: "04", title: "$LUCA Token", desc: "Token powers discounted access, feature unlocks, and future agent usage flows across the platform." },
                { n: "05", title: "Agent Financial Score", desc: "A future scoring system assigning wallet-level financial reliability scores — useful for agents and protocols." },
                { n: "06", title: "Intelligence Products", desc: "Aggregated ecosystem data, trend reports, and financial intelligence for protocols, researchers, and teams." },
                { n: "07", title: "Enterprise Tools", desc: "Advanced analytics, bulk wallet reporting, and custom integrations for teams managing large agent fleets." },
              ].map((m) => (
                <div key={m.n} className="docs-mono-card">
                  <span className="docs-mono-num">{m.n}</span>
                  <div>
                    <strong>{m.title}</strong>
                    <p>{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Roadmap ── */}
          <section id="roadmap" className="docs-section">
            <span className="docs-tag">Vision</span>
            <h1 className="docs-h1">Roadmap</h1>
            <p className="docs-lead">Six phases from v1 to the financial operating system for autonomous agents.</p>

            <div className="docs-roadmap">
              {ROADMAP.map((phase, i) => (
                <div key={phase.phase} className="docs-roadmap-item">
                  <div className="docs-roadmap-line-wrap">
                    <div className={`docs-roadmap-dot ${phase.status}`} />
                    {i < ROADMAP.length - 1 && <div className="docs-roadmap-line" />}
                  </div>
                  <div className="docs-roadmap-body">
                    <div className="docs-roadmap-head">
                      <span className="docs-roadmap-phase">{phase.phase}</span>
                      <strong>{phase.title}</strong>
                      <span className={`docs-roadmap-status ${phase.status}`}>
                        {phase.status === "live" ? "Live" : phase.status === "next" ? "Up next" : "Planned"}
                      </span>
                    </div>
                    <ul className="docs-roadmap-list">
                      {phase.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Security ── */}
          <section id="security" className="docs-section">
            <span className="docs-tag">Trust</span>
            <h1 className="docs-h1">Security</h1>
            <p className="docs-lead">x402Books AI is read-only. It never touches your funds.</p>

            <div className="docs-callout docs-callout-green">
              <strong>Read-only by design.</strong> x402Books AI analyzes public onchain data. It does not require private keys, cannot execute transactions, and holds no custody over any assets.
            </div>

            <h2 className="docs-h2">What x402Books AI does not do</h2>
            <ul className="docs-list docs-list-check">
              <li>Request or store private keys</li>
              <li>Execute transactions from any wallet</li>
              <li>Take custody of funds</li>
              <li>Access wallet signing capabilities</li>
              <li>Store raw wallet secrets</li>
            </ul>

            <h2 className="docs-h2">What x402Books AI does</h2>
            <ul className="docs-list">
              <li>Reads public onchain USDC transfer data via Base RPC</li>
              <li>Stores Privy user IDs, email addresses, and X handles in Supabase</li>
              <li>Associates wallet addresses with user sessions (opt-in)</li>
              <li>Generates AI summaries using Claude Haiku (Anthropic)</li>
            </ul>

            <h2 className="docs-h2">Authentication</h2>
            <p className="docs-p">
              User authentication is handled entirely by Privy. x402Books AI does not implement its own credential store. Sessions are issued as HMAC-signed cookies with no sensitive data embedded.
            </p>

            <h2 className="docs-h2">Data handling</h2>
            <p className="docs-p">
              All wallet activity analyzed by x402Books AI is sourced from public Base chain data. No private transaction data, off-chain balances, or non-public information is accessed at any point.
            </p>
          </section>

          {/* ── FAQ ── */}
          <section id="faq" className="docs-section">
            <span className="docs-tag">Trust</span>
            <h1 className="docs-h1">FAQ</h1>
            <p className="docs-lead">Common questions about x402Books AI.</p>
            <div className="docs-faq-list">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>

          {/* ── Positioning ── */}
          <section id="positioning" className="docs-section docs-section-last">
            <span className="docs-tag">Trust</span>
            <h1 className="docs-h1">Positioning</h1>
            <p className="docs-lead">What x402Books AI is, who it's for, and where it's going.</p>

            <div className="docs-position-block">
              <p className="docs-position-line">Readable books for the agent economy.</p>
            </div>

            <h2 className="docs-h2">One-line description</h2>
            <p className="docs-p docs-p-large">
              x402Books AI turns Base wallet activity into financial intelligence for humans and AI agents.
            </p>

            <h2 className="docs-h2">Full description</h2>
            <p className="docs-p">
              x402Books AI is the financial intelligence layer for the agent economy. It gives developers, builders, and autonomous agents the tools to understand wallet-level spend, income, categories, reports, and financial activity — in a format that both humans and machines can use.
            </p>

            <h2 className="docs-h2">The vision</h2>
            <p className="docs-p">
              AI agents are becoming economic actors. As they operate autonomously — paying for APIs, data, and compute in real time — they need more than a wallet. They need accounting. They need budgeting. They need financial visibility.
            </p>
            <p className="docs-p">
              x402Books AI is building the financial operating system for autonomous agents. Starting with the ledger. Adding intelligence. Growing with the ecosystem.
            </p>

            <div className="docs-callout docs-callout-green">
              <strong>Product first. Token later.</strong> x402Books AI is built on real utility — readable wallet data that developers and agents actually need today.
            </div>
          </section>

        </main>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Product</p>
            <Link href="/dashboard">App</Link>
            <Link href="/registry">Registry</Link>
            <Link href="/luca">Luca</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Docs</p>
            <Link href="/docs#api">API Reference</Link>
            <Link href="/docs#agent">Agent Guide</Link>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">@AskLucaBot</a>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Community</p>
            <a href="https://x.com/x402Books" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 x402Books AI. Not financial advice.</p>
      </footer>
    </div>
  );
}
