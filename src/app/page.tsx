import Link from "next/link";
import { FadeContent } from "@/components/effects";
import { HomeHeader } from "./home-header";
import { getAgentGDP } from "@/lib/agent-gdp";
import type { AgentGDP } from "@/lib/agent-gdp";

export const revalidate = 3600; // ISR: rebuild once per hour

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function netColor(n: number): string {
  if (n > 0) return "#6DB874";
  if (n < 0) return "#ef4444";
  return "var(--muted)";
}

const ECO_COLORS: Record<string, string> = {
  BANKR: "#6DB874",
  Virtuals: "#5B8FA8",
  AEON: "#8B5CF6",
  EigenCloud: "#F97316",
  Base: "#4F46E5",
};

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

// ── Sub-components ────────────────────────────────────────────────────────────

function GDPStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={{
      padding: "20px 24px",
      background: "var(--surface-soft)",
      border: "1px solid var(--line)",
      borderRadius: 10,
    }}>
      <p style={{ margin: "0 0 6px", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "1.55rem", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: accent ?? "var(--fg)" }}>
        {value}
      </p>
    </div>
  );
}

function TopAgentsTable({ gdp }: { gdp: AgentGDP }) {
  if (gdp.top_agents.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 24 }}>
        Financial data loads as agents submit wallet manifests.{" "}
        <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit yours →</Link>
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto", marginTop: 28 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {["Agent", "Ecosystem", "Revenue (30d)", "Expenses (30d)", "Net Income"].map((h) => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gdp.top_agents.map((agent) => {
            const ecoColor = ECO_COLORS[agent.ecosystem] ?? "var(--muted)";
            return (
              <tr key={agent.slug} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 12px" }}>
                  <Link href={`/registry/${agent.slug}`} style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>
                    {agent.name}
                  </Link>
                </td>
                <td style={{ padding: "12px 12px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: `1px solid color-mix(in srgb, ${ecoColor} 28%, transparent)`, background: `color-mix(in srgb, ${ecoColor} 10%, transparent)`, color: ecoColor }}>
                    {agent.ecosystem}
                  </span>
                </td>
                <td style={{ padding: "12px 12px", fontFamily: "var(--font-mono, monospace)", color: "#6DB874" }}>
                  {fmtUSD(agent.revenue_usd)}
                </td>
                <td style={{ padding: "12px 12px", fontFamily: "var(--font-mono, monospace)", color: "var(--muted)" }}>
                  {fmtUSD(agent.expenses_usd)}
                </td>
                <td style={{ padding: "12px 12px", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: netColor(agent.net_income_usd) }}>
                  {agent.net_income_usd >= 0 ? "+" : ""}{fmtUSD(agent.net_income_usd)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let gdp: AgentGDP | null = null;
  try {
    gdp = await getAgentGDP();
  } catch {
    // GDP unavailable — page still renders without live numbers
  }

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <FadeContent>
            <p className="lp-eyebrow">x402Books · Agent Economy Intelligence</p>
            <h1 className="lp-h1">
              Financial Intelligence<br />
              <em>for the Agent Economy.</em>
            </h1>
            <p className="lp-hero-sub">
              Track revenue, expenses, treasury activity, and financial history across autonomous agents. Every agent. Every wallet. Every dollar.
            </p>
            <div className="lp-hero-actions">
              <Link href="/registry" className="lp-btn-primary lp-btn-lg">Explore Agent Books</Link>
              <Link href="/developer" className="lp-btn-ghost lp-btn-lg">View API</Link>
            </div>
          </FadeContent>
        </div>

        {/* Agent Books preview card */}
        <div className="lp-hero-card" aria-label="Agent Books preview">
          <div className="lp-card-header">
            <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
            <span className="lp-card-title">Agent Books · 30d</span>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>AEON</span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>AEON Ecosystem</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {[{ l: "AEON", c: "#8B5CF6" }, { l: "Wallets Declared", c: "#6DB874" }].map((b) => (
                <span key={b.l} style={{ fontSize: "0.67rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: `1px solid color-mix(in srgb, ${b.c} 28%, transparent)`, background: `color-mix(in srgb, ${b.c} 10%, transparent)`, color: b.c }}>
                  {b.l}
                </span>
              ))}
            </div>
            {[
              { label: "Revenue", value: "$18,240.00", color: "#6DB874" },
              { label: "Expenses", value: "$11,820.00", color: "var(--muted)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{row.label}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, fontFamily: "monospace", color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", marginBottom: 14 }}>
              <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>Net Income</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: "monospace", color: "#6DB874" }}>+$6,420.00</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5, fontStyle: "italic" }}>
              &ldquo;Revenue exceeds expenses. Settlement patterns indicate active operational finance.&rdquo;
            </p>
          </div>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>3 wallets attributed · high confidence</span>
            <Link href="/registry/aeon" style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--accent)" }}>Full Books →</Link>
          </div>
        </div>
      </section>

      {/* ── Agent GDP ── */}
      <section className="lp-section lp-section-alt" id="agent-gdp">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">Agent GDP · 30 days</p>
            <h2 className="lp-h2">Attributed economic activity<br />across the agent economy.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 32 }}>
            <GDPStat label="Total Revenue" value={gdp ? fmtUSD(gdp.total_revenue_usd) : "—"} accent="#6DB874" />
            <GDPStat label="Total Expenses" value={gdp ? fmtUSD(gdp.total_expenses_usd) : "—"} />
            <GDPStat label="Net Income" value={gdp ? fmtUSD(gdp.total_net_income_usd) : "—"} accent={gdp && gdp.total_net_income_usd >= 0 ? "#6DB874" : "#ef4444"} />
            <GDPStat label="Attributed Agents" value={gdp ? String(gdp.attributed_agents) : "—"} />
            <GDPStat label="Attributed Wallets" value={gdp ? String(gdp.attributed_wallets) : "—"} />
            <GDPStat label="Total Indexed" value={gdp ? `${gdp.total_agents}+` : "—"} />
          </div>
          <p style={{ marginTop: 16, fontSize: "0.72rem", color: "var(--muted)" }}>
            Live data from attributed agents. Updated hourly. Attribution requires a declared wallet manifest.
          </p>
        </FadeContent>
      </section>

      {/* ── Top Agent Books ── */}
      <section className="lp-section" id="top-books">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">Top Agent Books</p>
            <h2 className="lp-h2">Revenue across the agent economy.</h2>
          </div>
          {gdp ? (
            <TopAgentsTable gdp={gdp} />
          ) : (
            <p style={{ color: "var(--muted)", marginTop: 24, fontSize: "0.85rem" }}>Financial data temporarily unavailable.</p>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/registry" className="lp-btn-primary">Browse All Agent Books →</Link>
          </div>
        </FadeContent>
      </section>

      {/* ── How x402Books Works ── */}
      <section className="lp-section lp-section-alt" id="how">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">How x402Books Works</p>
            <h2 className="lp-h2">From wallet declaration<br />to financial intelligence.</h2>
          </div>
        </FadeContent>
        <div className="lp-steps">
          {[
            { num: "01", title: "Wallet Attribution", body: "Operators declare wallet roles — treasury, revenue, operator, fee, deployer. The manifest is the source of attribution." },
            { num: "02", title: "Registry", body: "Agent identity is indexed. Wallets are attributed. Roles are established. The registry is Layer 1." },
            { num: "03", title: "Agent Books", body: "Revenue, expenses, net income, and financial history are generated per agent. Internal transfers between own wallets are excluded." },
            { num: "04", title: "Financial Intelligence", body: "Luca interprets the books. Revenue trends, expense concentration, treasury behavior, anomalies, growth signals." },
          ].map((s, i) => (
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

      {/* ── Registry ── */}
      <section className="lp-section" id="registry">
        <FadeContent delay={60}>
          <div className="lp-registry-inner">
            <div className="lp-registry-text">
              <p className="lp-section-label">Registry</p>
              <h2 className="lp-h2" style={{ margin: "10px 0 12px" }}>The attribution layer.</h2>
              <p className="lp-registry-sub">
                x402Books identifies which wallets belong to which agents, and what role each wallet plays. Attribution is the foundation. Without it, there are no books.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "20px 0" }}>
                {[
                  { role: "Treasury", desc: "Protocol reserves and capital allocation" },
                  { role: "Revenue", desc: "Incoming payments, fees, subscriptions" },
                  { role: "Operator", desc: "Active operational spend" },
                  { role: "Fee", desc: "Protocol fee collection" },
                  { role: "Deployer", desc: "Contract deployment and upgrades" },
                ].map((w) => (
                  <div key={w.role} style={{ display: "flex", gap: 10, fontSize: "0.83rem", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 700, color: "var(--accent)", width: 70, flexShrink: 0 }}>{w.role}</span>
                    <span style={{ color: "var(--muted)" }}>{w.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/registry" className="lp-btn-primary">Browse Registry →</Link>
                <Link href="/registry#verify" className="lp-btn-ghost">Submit Manifest</Link>
              </div>
            </div>

            <div className="lp-registry-card">
              <div className="lp-card-header">
                <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
                <span className="lp-card-title">Wallet Manifest</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <pre style={{ margin: 0, fontSize: "0.7rem", lineHeight: 1.7, color: "var(--muted)", overflowX: "auto", fontFamily: "monospace" }}>{`{
  "agent": "AEON",
  "ecosystem": "AEON",
  "wallets": [
    {
      "address": "0x1a2b...",
      "role": "treasury",
      "chain": "base"
    },
    {
      "address": "0x3c4d...",
      "role": "revenue",
      "chain": "base"
    },
    {
      "address": "0x5e6f...",
      "role": "operator",
      "chain": "base"
    }
  ]
}`}</pre>
              </div>
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: "0.7rem", color: "var(--muted)" }}>
                Place at <code style={{ fontFamily: "monospace", color: "var(--accent)" }}>.agent/wallets.json</code> in your repo.
              </div>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── State of the Agent Economy ── */}
      <section className="lp-section lp-section-alt" id="research">
        <FadeContent delay={60}>
          <div className="lp-section-head">
            <p className="lp-section-label">State of the Agent Economy</p>
            <h2 className="lp-h2">The financial publication<br />of the agent economy.</h2>
            <p style={{ marginTop: 12, color: "var(--muted)", maxWidth: 520, lineHeight: 1.65 }}>
              Weekly and monthly intelligence reports covering Agent GDP, top revenue agents, treasury trends, ecosystem breakdowns, and emerging economic activity.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 32 }}>
            {[
              { title: "Agent GDP Report", freq: "Monthly", desc: "Total attributed revenue and expense trends across the agent economy." },
              { title: "Top Revenue Agents", freq: "Weekly", desc: "Which agents are generating the most revenue and growing fastest." },
              { title: "Treasury Intelligence", freq: "Monthly", desc: "Treasury health, capital concentration, and runway analysis." },
              { title: "Ecosystem Breakdown", freq: "Quarterly", desc: "Revenue and activity broken down by ecosystem: BANKR, Virtuals, AEON." },
            ].map((report) => (
              <div key={report.title} style={{ padding: "18px 20px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{report.title}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: "1px solid var(--line)", color: "var(--muted)" }}>{report.freq}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55 }}>{report.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="https://x.com/x402Books" target="_blank" rel="noreferrer" className="lp-btn-primary">Follow @x402Books →</a>
            <a href="https://t.me/x402books" target="_blank" rel="noreferrer" className="lp-btn-ghost">Telegram</a>
          </div>
          <p style={{ marginTop: 16, fontSize: "0.72rem", color: "var(--muted)" }}>Research reports coming soon. Follow for updates.</p>
        </FadeContent>
      </section>

      {/* ── Developer API ── */}
      <section className="lp-section" id="api">
        <FadeContent delay={60}>
          <div className="lp-registry-inner">
            <div className="lp-registry-text">
              <p className="lp-section-label">Developer API</p>
              <h2 className="lp-h2" style={{ margin: "10px 0 12px" }}>Financial intelligence<br />as infrastructure.</h2>
              <p className="lp-registry-sub">
                The Agent Books API returns structured financial statements for any indexed agent. Revenue, expenses, net income, counterparties, expense breakdown — all derived from on-chain data.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, margin: "16px 0" }}>
                {[
                  "GET /api/v1/agent-books/[slug] — Agent financial statement",
                  "GET /api/v1/agent-financial-state — Portfolio + flow snapshot",
                  "GET /api/v1/full-report — Complete wallet audit",
                  "GET /api/v1/ledger-summary — Totals and transaction counts",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: 8, fontSize: "0.8rem", color: "var(--muted)", alignItems: "flex-start" }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>→</span>
                    <code style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{item}</code>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/developer" className="lp-btn-primary">Developer Access →</Link>
                <Link href="/docs" className="lp-btn-ghost">Documentation</Link>
              </div>
            </div>

            <div className="lp-registry-card">
              <div className="lp-card-header">
                <span className="lp-card-dot green" /><span className="lp-card-dot yellow" /><span className="lp-card-dot red" />
                <span className="lp-card-title">GET /api/v1/agent-books/aeon</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <pre style={{ margin: 0, fontSize: "0.68rem", lineHeight: 1.75, color: "var(--muted)", overflowX: "auto", fontFamily: "monospace" }}>{`{
  "ok": true,
  "attributed": true,
  "period": "30d",
  "financials": {
    "revenue_usd": 18240.00,
    "expenses_usd": 11820.00,
    "net_income_usd": 6420.00,
    "margin_pct": 35.2,
    "tx_count": 184
  },
  "luca_summary": "Revenue exceeds expenses.
    Settlement patterns indicate active
    operational finance.",
  "attribution": {
    "source": "manifest",
    "confidence": "high"
  }
}`}</pre>
              </div>
            </div>
          </div>
        </FadeContent>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <a href="/" className="lp-brand lp-brand-sm" style={{ fontWeight: 700, fontSize: "1rem" }}>x402Books</a>
            <p>Financial intelligence for the agent economy.</p>
            <p className="lp-footer-builder">Built by <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">@danbuildss</a></p>
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
              <Link href="/registry">Agent Books</Link>
              <Link href="/#agent-gdp">Agent GDP</Link>
              <Link href="/luca">Research</Link>
              <Link href="/developer">API</Link>
            </div>
            <div>
              <h4>Registry</h4>
              <Link href="/registry">Browse agents</Link>
              <Link href="/registry#verify">Claim profile</Link>
              <Link href="/registry#verify">Submit Manifest</Link>
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
          <span>© 2026 x402Books. All rights reserved.</span>
          <span>Financial analysis generated by Luca.</span>
        </div>
      </footer>
    </div>
  );
}
