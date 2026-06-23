"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "Introduction",
    items: [
      { id: "overview",      label: "Overview"           },
      { id: "features",      label: "What We Built"      },
      { id: "how-it-works",  label: "The Manifest Loop"  },
    ],
  },
  {
    label: "Product",
    items: [
      { id: "core-pages", label: "Core Product"  },
      { id: "api",        label: "API Reference" },
    ],
  },
  {
    label: "Token",
    items: [
      { id: "xbooks",       label: "$LUCA Utility" },
      { id: "monetization", label: "Monetization"  },
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
      { id: "security",    label: "Security"    },
      { id: "faq",         label: "FAQ"         },
      { id: "positioning", label: "Positioning" },
    ],
  },
];

const ALL_IDS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

const FEATURES = [
  { icon: "dataset",            label: "Agent Registry",          items: ["125+ autonomous agents indexed", "5 ecosystems: AEON, BANKR, Virtuals, Base, EigenCloud", "Sort by score, status, health, activity"] },
  { icon: "folder_open",        label: "Wallet Manifest Standard", items: [".agent/wallets.json open format", "GitHub + Gitlawb repo support", "GitHub Action for automated validation"] },
  { icon: "verified_user",      label: "Verification System",      items: ["Six-tier pipeline: Candidate → Luca Managed", "Manifest submission fast-tracks to Wallets Declared", "Wallet claim + signed proof paths"] },
  { icon: "analytics",          label: "Transparency Scores",      items: ["0–100 composite score per agent", "Factors: wallets, status, activity, evidence, verdict", "Live on every public profile"] },
  { icon: "psychology",         label: "Luca Intelligence",        items: ["AI writes financial summaries for every agent", "Analyzes settlement patterns and attribution", "Runs integrity passes + approves claims"] },
  { icon: "badge",              label: "SVG Verification Badges",  items: ["Live badge at /api/badge/[slug]", "Embed in GitHub READMEs in one line", "Updates automatically as status changes"] },
  { icon: "person_pin",         label: "Agent Profiles",           items: ["Public profile at /registry/[slug]", "Wallets, scores, settlement patterns, Luca verdict", "Claim banner with manifest + wallet paths"] },
  { icon: "security",           label: "Nipmod Integration",       items: ["Tool decision events on agent profiles", "Install / reject / defer with risk levels", "181+ events indexed live"] },
];

const CORE_PAGES = [
  { path: "/registry",       name: "Agent Registry",  desc: "125+ autonomous agents indexed. Sort by verification tier, activity score, treasury health, or name. Filter by ecosystem and status.", actions: "Browse agents, filter by status, sort by score" },
  { path: "/registry/[slug]", name: "Agent Profile",  desc: "Public financial identity profile for every agent. Shows declared wallets, transparency score, settlement patterns, Luca verdict, and tool decisions.", actions: "View wallets, read Luca verdict, claim profile, embed badge" },
  { path: "/luca",           name: "Luca",            desc: "Luca's public interface — financial intelligence agent built on Zetta. Access Luca's analysis, ask questions about agent finances.", actions: "Ask Luca, view agent economics, read analysis" },
  { path: "/developer",      name: "Developer Portal", desc: "API key management with $LUCA tier system. Free: 100 req/day. Holder: 500/day. Whale: 2,000/day.", actions: "Generate API key, verify wallet for tier, view usage" },
  { path: "/docs",           name: "Documentation",   desc: "Product docs, API reference, manifest standard specification, and integration guides.", actions: "Read API docs, copy endpoints, learn manifest format" },
];

const ROADMAP = [
  {
    phase: "Phase 1",
    title: "Financial Identity Infrastructure",
    status: "live",
    items: [
      "125+ autonomous agents indexed across 5 ecosystems",
      "Agent Wallet Manifest standard (.agent/wallets.json)",
      "Six-tier verification pipeline: Candidate → Luca Managed",
      "Transparency scores + Luca verdicts on every profile",
      "SVG verification badges + /api/stats prediction oracle",
      "Nipmod tool decision integration — 181+ events live",
      "Developer API keys + $LUCA tier system (100 / 500 / 2,000 req/day)",
    ],
  },
  {
    phase: "Phase 2",
    title: "Manifest Adoption",
    status: "next",
    items: [
      "Starter templates: OpenAI Agents SDK, LangGraph, CrewAI",
      "Registry leaderboards: Most Transparent, Most Verified, Recently Declared",
      "Claim flow improvements + claim status tracking",
      "Manifest auto-create: unknown agents get profiles on submission",
      "Target: 100 manifest submissions · 50 claimed profiles",
    ],
  },
  {
    phase: "Phase 3",
    title: "Verification Program",
    status: "planned",
    items: [
      "Verified Agent Program — formal requirements + public benefits",
      "State of Agent Finance — twice weekly intelligence reports (Mon + Thu)",
      "Profile sharing improvements: PNG cards, shareable links",
      "Homepage featuring verified agents",
      "Target: 25 verified profiles",
    ],
  },
  {
    phase: "Phase 4",
    title: "Financial Intelligence",
    status: "planned",
    items: [
      "Treasury health alerts and runway tracking",
      "Settlement quality scoring",
      "Recurring spend detection",
      "Counterparty concentration analysis",
      "Operational finance reports for agent teams",
    ],
  },
  {
    phase: "Phase 5",
    title: "Network Effects",
    status: "planned",
    items: [
      "Ecosystem discovery feed — ranked by trust signals",
      "Embeddable profile cards for partner sites",
      "API partnerships with agent frameworks",
      "Zetta as the default financial identity layer for new agents",
    ],
  },
  {
    phase: "Phase 6",
    title: "Infrastructure Revenue",
    status: "planned",
    items: [
      "Verification as a service",
      "Enterprise monitoring API",
      "Premium Luca intelligence reports",
      "Compliance-grade audit exports",
      "Ecosystem analytics packages for protocols",
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "What is Zetta?",
    a: "Zetta is Financial Identity Infrastructure for Autonomous Agents. We index agents, verify wallet ownership via a manifest standard, classify financial activity, and generate transparency scores — giving every autonomous agent a verifiable, public financial identity.",
  },
  {
    q: "What is the Agent Wallet Manifest?",
    a: "An open standard for declaring financial identity. Agents add a .agent/wallets.json file to their GitHub or Gitlawb repo declaring wallet addresses and roles (treasury, fee recipient, deployer, operator). Zetta validates it, upgrades the registry profile to Wallets Declared, and issues a live SVG verification badge.",
  },
  {
    q: "How does verification work?",
    a: "Six tiers: Candidate → Needs Verification → Wallets Declared → Claimed → Verified → Luca Managed. Submitting a wallet manifest moves an agent to Wallets Declared. Submitting a matching wallet address moves to Claimed. Full Verified status requires Luca review. Luca Managed means Luca actively monitors and interprets the agent's finances.",
  },
  {
    q: "What is Luca?",
    a: "Luca is the AI financial intelligence agent built on top of Zetta. He writes financial summaries for every agent profile, analyzes settlement patterns and attribution quality, approves manifest submissions and wallet claims, and runs integrity passes to maintain registry quality.",
  },
  {
    q: "How do I get my agent listed?",
    a: "Add a .agent/wallets.json manifest to your agent's GitHub repo and submit your repo URL via the Claim Banner on your profile page. If your agent isn't indexed yet, contact the team to add it. Once indexed, manifest submission is fully self-serve.",
  },
  {
    q: "What is $LUCA?",
    a: "$LUCA is Luca's intelligence token. Holding $LUCA increases your API rate limit — Holder (≥1,000 $LUCA): 500 req/day, Whale (≥10,000 $LUCA): 2,000 req/day. It also unlocks priority verification and premium Luca intelligence reports.",
  },
  {
    q: "Does Zetta control agent funds?",
    a: "No. Zetta is read-only infrastructure. It never requests private keys, cannot execute transactions, and holds no custody over any assets. All data comes from public blockchain records and agent-declared manifests.",
  },
  {
    q: "Is the API free?",
    a: "Public endpoints (/api/stats, /api/badge/[slug], /api/registry/agents) require no auth and are free. Financial intelligence endpoints (/api/v1/*) require an API key — free tier is 100 req/day. Generate a key at /developer.",
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
              <a href="https://x.com/Zetta" target="_blank" rel="noreferrer" className="docs-sidebar-link-ext">Follow on X</a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="docs-content">

          {/* ── Overview ── */}
          <section id="overview" className="docs-section">
            <span className="docs-tag">Introduction</span>
            <h1 className="docs-h1">Zetta</h1>
            <p className="docs-lead">Financial Identity Infrastructure for Autonomous Agents.</p>
            <p className="docs-p">
              AI agents are becoming economic actors. They operate wallets, settle payments, and generate revenue — all onchain. But raw wallet data tells you nothing about who the agent is, whether it can be trusted, or what it&apos;s actually doing.
            </p>
            <p className="docs-p">
              Zetta solves this. We give every autonomous agent a verifiable financial identity — indexed in a public registry, scored for transparency, verified through a manifest standard, and interpreted by Luca.
            </p>

            <div className="docs-callout">
              <strong>In one line:</strong> Zetta is the open standard for agent financial identity.
            </div>

            <h2 className="docs-h2">What Zetta does</h2>
            <ul className="docs-list">
              <li><strong>Indexes</strong> — 125+ autonomous agents across 5 ecosystems in a public registry</li>
              <li><strong>Verifies</strong> — agents declare wallets via manifest, Zetta validates ownership</li>
              <li><strong>Scores</strong> — Transparency Score (0–100) based on wallets, status, activity, evidence</li>
              <li><strong>Classifies</strong> — settlement patterns: treasury, revenue, operational spend, inference</li>
              <li><strong>Interprets</strong> — Luca writes financial verdicts and monitors agent finances</li>
              <li><strong>Distributes</strong> — SVG badges, public profiles, embeddable cards, API data</li>
            </ul>

            <h2 className="docs-h2">Who it's for</h2>
            <div className="docs-audience-grid">
              {[
                { label: "Agent Developers",  desc: "Give your agent a verifiable financial identity. Declare wallets, get verified, embed a trust badge." },
                { label: "Protocol Teams",    desc: "Index your ecosystem's agents. Surface financial transparency across your community." },
                { label: "Builders & Auditors", desc: "Query live agent financial data via API. Verify wallet ownership. Assess trust signals." },
                { label: "Prediction Markets", desc: "Use /api/stats as a live resolution oracle for adoption-based prediction markets." },
              ].map((a) => (
                <div key={a.label} className="docs-audience-card">
                  <strong>{a.label}</strong>
                  <p>{a.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="docs-h2">The architecture</h2>
            <p className="docs-p">
              Three layers. Each one depends on the one below it.
            </p>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Stack</span></div>
              <pre>{`Zetta  =  infrastructure  (index, verify, classify, display)
Luca       =  intelligence    (interpret, score, verdict, monitor)
$LUCA      =  ecosystem asset (API tier, priority verification)`}</pre>
            </div>
          </section>

          {/* ── What We Built ── */}
          <section id="features" className="docs-section">
            <span className="docs-tag">Introduction</span>
            <h1 className="docs-h1">What We Built</h1>
            <p className="docs-lead">The full infrastructure stack — live today.</p>
            <div className="docs-version-status">
              <span className="docs-status-dot" />
              All features below are live. 125+ agents indexed.
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

          {/* ── The Manifest Loop ── */}
          <section id="how-it-works" className="docs-section">
            <span className="docs-tag">Introduction</span>
            <h1 className="docs-h1">The Manifest Loop</h1>
            <p className="docs-lead">From zero identity to verified financial profile in four steps.</p>

            <div className="docs-steps">
              {[
                { n: "01", title: "Declare", body: "Add .agent/wallets.json to your agent's GitHub or Gitlawb repo. Declare wallet addresses with roles: treasury, fee recipient, deployer, or operator. The GitHub Action validates the format on every push." },
                { n: "02", title: "Submit", body: "Paste your repo URL into the Claim Banner on your agent's profile page. Zetta fetches the manifest, validates the wallets, and queues the update for Luca review." },
                { n: "03", title: "Verify", body: "Luca reviews the submission. Verified manifests upgrade the agent's status to Wallets Declared. Matching a wallet address via the claim form upgrades to Claimed. Full Verified status follows Luca review." },
                { n: "04", title: "Distribute", body: "A live SVG badge appears at /api/badge/[your-slug]. Embed it in your README. Your Transparency Score updates. Your profile shows declared wallets, settlement patterns, and Luca's financial verdict." },
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

            <h2 className="docs-h2">Wallet manifest format</h2>
            <p className="docs-p">Add this file to your repo at <code>.agent/wallets.json</code>:</p>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>.agent/wallets.json</span></div>
              <pre>{`{
  "agent": "MyAgent",
  "ecosystem": "AEON",
  "x": "@MyAgent",
  "website": "https://myagent.xyz",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "notes": "Primary treasury wallet"
    }
  ]
}`}</pre>
            </div>

            <h2 className="docs-h2">Verification tiers</h2>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Trust pipeline</span></div>
              <pre>{`Candidate          →  Indexed, no proof of ownership
Needs Verification →  Flagged for review
Wallets Declared   →  Manifest submitted + validated ← start here
Claimed            →  Wallet address matches declared wallet
Verified           →  Luca-reviewed, fully verified
Luca Managed       →  Luca actively monitors finances`}</pre>
            </div>
          </section>

          {/* ── Core Product ── */}
          <section id="core-pages" className="docs-section">
            <span className="docs-tag">Product</span>
            <h1 className="docs-h1">Core Product</h1>
            <p className="docs-lead">The pages that make up the financial identity infrastructure.</p>

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
            <p className="docs-lead">Financial identity data for agents, builders, and prediction markets.</p>

            <div className="docs-callout docs-callout-info">
              Public endpoints require no auth. Financial intelligence endpoints require an API key — generate one at <a href="/developer" style={{ color: "var(--accent)" }}>/developer</a>. Free tier: 100 req/day. $LUCA holders: up to 2,000/day.
            </div>

            <h2 className="docs-h2">Public — no auth required</h2>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/stats</code>
              </div>
              <p className="docs-p">Live adoption metrics across the registry. Includes pre-computed resolution booleans for prediction markets.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response</span></div>
                <pre>{`{
  "agents_indexed": 125,
  "wallets_declared_or_above": 15,
  "claimed_or_above": 4,
  "verified_or_above": 2,
  "by_status": {
    "Candidate": 89, "Wallets Declared": 12,
    "Claimed": 3, "Verified": 1, "Luca Managed": 1
  },
  "by_ecosystem": {
    "AEON":  { "total": 8, "wallets_declared": 2, "verified": 1 },
    "BANKR": { "total": 34, "wallets_declared": 5, "verified": 0 }
  },
  "markets": {
    "100_manifests_before_august": false,
    "50_claimed_before_q4": false,
    "top_ecosystem_by_verified": { "ecosystem": "AEON", "count": 2 }
  },
  "updated_at": "2026-06-07T12:00:00Z"
}`}</pre>
              </div>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/badge/[slug]</code>
              </div>
              <p className="docs-p">Returns a live SVG verification badge for any indexed agent. Embed in GitHub READMEs or project pages.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Example</span></div>
                <pre>{`GET /api/badge/aeon
→ image/svg+xml — "aeon | Wallets Declared" (blue)

Cache-Control: public, max-age=60, stale-while-revalidate=300

# In a README:
![Zetta](https://www.zettaai.co/api/badge/aeon)`}</pre>
              </div>
              <p className="docs-p" style={{ marginTop: 8 }}>Badge colors: Verified / Luca Managed → green · Claimed → purple · Wallets Declared → blue · Candidate → gray</p>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/registry/agents</code>
              </div>
              <p className="docs-p">Returns all indexed agents with verification status, ecosystem, transparency scores, and declared wallets.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response (excerpt)</span></div>
                <pre>{`{
  "agents": [
    {
      "name": "Aeon",
      "symbol": "AEON",
      "ecosystem": "AEON",
      "verificationStatus": "Wallets Declared",
      "treasuryHealth": "Active",
      "wallets": [
        { "address": "0x...", "label": "likely treasury" }
      ]
    }
  ],
  "fromSupabase": true
}`}</pre>
              </div>
            </div>

            <h2 className="docs-h2">Registry — no auth required</h2>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method post">POST</span>
                <code>/api/registry/fetch-manifest</code>
              </div>
              <p className="docs-p">Fetch and validate a <code>.agent/wallets.json</code> manifest from a GitHub or Gitlawb repo. Queues wallet declarations for Luca verification.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`POST /api/registry/fetch-manifest
Content-Type: application/json

{ "repo_url": "https://github.com/your-org/your-repo" }`}</pre>
              </div>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response</span></div>
                <pre>{`{
  "ok": true,
  "agent": "MyAgent",
  "wallets": [
    { "address": "0x...", "role": "treasury", "label": "likely treasury" }
  ],
  "message": "Manifest submitted. 1 wallet(s) queued for Luca verification."
}`}</pre>
              </div>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method post">POST</span>
                <code>/api/registry/claim</code>
              </div>
              <p className="docs-p">Submit a wallet address to claim an agent profile. Checks against declared wallets — a match fast-tracks verification.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`POST /api/registry/claim
Content-Type: application/json

{
  "agent_slug": "my-agent",
  "wallet_address": "0x..."
}`}</pre>
              </div>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response</span></div>
                <pre>{`{
  "ok": true,
  "matched": true,
  "message": "Wallet matched — claim submitted for review."
}`}</pre>
              </div>
            </div>

            <h2 className="docs-h2">Financial Intelligence — API key required</h2>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/v1/agent-financial-state</code>
              </div>
              <p className="docs-p">Live treasury health for any wallet — token portfolio, flows, settlement patterns, top counterparties. Also accepts <code>$0.01 USDC</code> x402 payment ($0.007 for $LUCA holders).</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`GET /api/v1/agent-financial-state?wallet=0x...&range=30d
Authorization: Bearer xb_live_...`}</pre>
              </div>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Response (excerpt)</span></div>
                <pre>{`{
  "wallet": "0x...",
  "range": "30d",
  "financial_health": {
    "total_income_usd": 91.20,
    "total_spend_usd": 42.80,
    "net_flow_usd": 48.40,
    "budget_status": "safe",
    "transaction_count": 128
  },
  "token_portfolio": [...],
  "top_counterparties": [...],
  "recent_transactions": [...]
}`}</pre>
              </div>
            </div>

            <div className="docs-endpoint">
              <div className="docs-endpoint-head">
                <span className="docs-method get">GET</span>
                <code>/api/v1/agent-report</code>
              </div>
              <p className="docs-p">Returns a plain-language financial intelligence report for a named agent.</p>
              <div className="docs-code-block">
                <div className="docs-code-head"><span>Request</span></div>
                <pre>{`GET /api/v1/agent-report?agentName=Aeon&days=7
Authorization: Bearer xb_live_...`}</pre>
              </div>
            </div>

            <div className="docs-callout">
              <strong>Rate limits:</strong> Free — 100 req/day · $LUCA Holder (≥1,000) — 500/day · $LUCA Whale (≥10,000) — 2,000/day. Generate your key at <a href="/developer" style={{ color: "var(--accent)" }}>/developer</a>.
            </div>
          </section>

          {/* ── $LUCA ── */}
          <section id="xbooks" className="docs-section">
            <span className="docs-tag">Token</span>
            <h1 className="docs-h1">$LUCA</h1>
            <p className="docs-lead">The token for Luca — not for Zetta API access.</p>
            <p className="docs-p">
              $LUCA is Luca&apos;s intelligence token. It unlocks the full power of Luca as a financial intelligence agent — deeper analysis, premium reports, and priority verification. It is not required to use Zetta or the registry API.
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
              <strong>Zetta API is separate.</strong> Accessing the registry, wallet data, and financial intelligence endpoints does not require $LUCA. API access is tiered by usage volume — free, developer, and enterprise.
            </div>

            <h2 className="docs-h2">Access tiers</h2>
            <div className="docs-tier-table-wrap">
              <table className="docs-tier-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free</th>
                    <th>Holder ≥1K</th>
                    <th>Whale ≥10K</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Registry API (/api/registry/agents)", "✓", "✓", "✓"],
                    ["Public stats (/api/stats)", "✓", "✓", "✓"],
                    ["Verification badges (/api/badge/*)", "✓", "✓", "✓"],
                    ["Agent financial state (v1)", "100/day", "500/day", "2,000/day"],
                    ["Agent intelligence report (v1)", "100/day", "500/day", "2,000/day"],
                    ["Priority manifest review", "—", "✓", "✓"],
                    ["Priority claim processing", "—", "✓", "✓"],
                    ["Premium Luca reports", "—", "—", "✓"],
                    ["Enterprise monitoring API", "—", "—", "✓"],
                  ].map(([feat, ...tiers]) => (
                    <tr key={String(feat)}>
                      <td>{feat}</td>
                      {tiers.map((v, i) => (
                        <td key={i} className={v === "✓" ? "tier-yes" : v === "—" ? "tier-no" : ""}>{v}</td>
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
            <p className="docs-lead">Infrastructure companies monetize through trust, access, and data.</p>

            <div className="docs-mono-grid">
              {[
                { n: "01", title: "API Access (live)",            desc: "Tiered API access for financial intelligence endpoints. Free: 100 req/day. $LUCA Holder: 500/day. $LUCA Whale: 2,000/day." },
                { n: "02", title: "Verification Program",         desc: "Verification as a service — formal review, Luca verdict, and Verified badge for agent teams that want priority processing." },
                { n: "03", title: "Premium Luca Reports",         desc: "On-demand deep intelligence reports generated by Luca. Treasury health, settlement quality, runway analysis, counterparty risk." },
                { n: "04", title: "$LUCA Token",                  desc: "Token powers API tier upgrades, priority verification, and future governance over registry standards." },
                { n: "05", title: "Enterprise Monitoring API",    desc: "Bulk agent monitoring, custom dashboards, and compliance-grade exports for protocols managing agent fleets." },
                { n: "06", title: "Ecosystem Analytics",          desc: "Aggregated financial intelligence for protocol teams — ecosystem-level transparency scores, adoption metrics, settlement trends." },
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
            <p className="docs-lead">Zetta AI is read-only. It never touches your funds.</p>

            <div className="docs-callout docs-callout-green">
              <strong>Read-only by design.</strong> Zetta AI analyzes public onchain data. It does not require private keys, cannot execute transactions, and holds no custody over any assets.
            </div>

            <h2 className="docs-h2">What Zetta AI does not do</h2>
            <ul className="docs-list docs-list-check">
              <li>Request or store private keys</li>
              <li>Execute transactions from any wallet</li>
              <li>Take custody of funds</li>
              <li>Access wallet signing capabilities</li>
              <li>Store raw wallet secrets</li>
            </ul>

            <h2 className="docs-h2">What Zetta AI does</h2>
            <ul className="docs-list">
              <li>Reads public onchain USDC transfer data via Base RPC</li>
              <li>Stores Privy user IDs, email addresses, and X handles in Supabase</li>
              <li>Associates wallet addresses with user sessions (opt-in)</li>
              <li>Generates AI summaries using Claude Haiku (Anthropic)</li>
            </ul>

            <h2 className="docs-h2">Authentication</h2>
            <p className="docs-p">
              User authentication is handled entirely by Privy. Zetta AI does not implement its own credential store. Sessions are issued as HMAC-signed cookies with no sensitive data embedded.
            </p>

            <h2 className="docs-h2">Data handling</h2>
            <p className="docs-p">
              All wallet activity analyzed by Zetta AI is sourced from public Base chain data. No private transaction data, off-chain balances, or non-public information is accessed at any point.
            </p>
          </section>

          {/* ── FAQ ── */}
          <section id="faq" className="docs-section">
            <span className="docs-tag">Trust</span>
            <h1 className="docs-h1">FAQ</h1>
            <p className="docs-lead">Common questions about Zetta AI.</p>
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
            <p className="docs-lead">Financial identity infrastructure for autonomous agents.</p>

            <div className="docs-position-block">
              <p className="docs-position-line">The open standard for agent financial identity.</p>
            </div>

            <h2 className="docs-h2">What we are</h2>
            <p className="docs-p docs-p-large">
              Zetta is the financial identity layer for the autonomous agent economy — not a wallet scanner, not a dashboard, not a token project.
            </p>
            <p className="docs-p">
              AI agents are becoming economic actors. They operate wallets, settle payments, generate revenue, and pay for inference — all onchain. But raw blockchain data tells you nothing about who the agent is, whether it can be trusted, or whether its finances are healthy.
            </p>
            <p className="docs-p">
              Zetta solves the identity problem: every agent gets a verifiable financial identity, publicly readable, verified through an open manifest standard, and interpreted by Luca.
            </p>

            <h2 className="docs-h2">The architecture</h2>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Three layers</span></div>
              <pre>{`Zetta  =  infrastructure  (index, verify, classify, display)
Luca       =  intelligence    (interpret, verdict, score, monitor)
$LUCA      =  ecosystem asset (API tier, priority verification)

These are three distinct things. Never blur them.`}</pre>
            </div>

            <h2 className="docs-h2">The moat</h2>
            <p className="docs-p">
              The moat is the <strong>Agent Wallet Manifest standard</strong>. Any agent that adds <code>.agent/wallets.json</code> to their repo plugs into Zetta' verification pipeline, leaderboards, and badge system. As more agents adopt it, the registry becomes the canonical source of truth for agent financial identity.
            </p>
            <p className="docs-p">
              Infrastructure compounds slowly. Trust compounds slowly. Once infra wins — it is extremely difficult to replace.
            </p>

            <h2 className="docs-h2">What we are not</h2>
            <ul className="docs-list">
              <li>Not a wallet scanner for retail users</li>
              <li>Not another AI agent personality</li>
              <li>Not a token project or memecoin</li>
              <li>Not a dashboard for human wallet tracking</li>
            </ul>

            <div className="docs-callout docs-callout-green">
              <strong>The one question.</strong> Before we ship anything: <em>"Does this make autonomous agents more financially readable, trustworthy, or auditable?"</em> If yes — ship it. If no — don't build it.
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
            <a href="https://x.com/Zetta" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 Zetta. Not financial advice.</p>
      </footer>
    </div>
  );
}
