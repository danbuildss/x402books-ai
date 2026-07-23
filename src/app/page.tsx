import Link from "next/link";
import { FadeContent } from "@/components/effects";
import { HomeHeader } from "./home-header";
import { SiteFooter } from "@/components/site-footer";
import { getAgentGDP } from "@/lib/agent-gdp";
import { getAttributionMetrics } from "@/lib/attribution-health";
import type { AgentGDP } from "@/lib/agent-gdp";
import type { AttributionMetrics } from "@/lib/attribution-health";

export const revalidate = 3600;

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      display: "inline-block",
      margin: "0 0 16px",
      padding: "3px 10px",
      background: "rgba(74,232,160,0.08)",
      border: "1px solid rgba(74,232,160,0.2)",
      borderRadius: 3,
      fontSize: "0.6rem",
      fontWeight: 700,
      fontFamily: "var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      color: "#4AE8A0",
    }}>
      {children}
    </p>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: "0 0 16px",
      fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      color: "#D0D4E0",
      lineHeight: 1.2,
    }}>
      {children}
    </h2>
  );
}

function Badge({ children, color = "#4AE8A0" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      background: `${color}18`,
      color,
      border: `1px solid ${color}38`,
      borderRadius: 3,
      padding: "2px 7px",
      fontSize: "0.58rem",
      fontWeight: 700,
      fontFamily: "var(--font-sans)",
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
    }}>
      {children}
    </span>
  );
}

// ── Hero product preview ──────────────────────────────────────────────────────

function HeroPreview() {
  return (
    <div className="lp2-hero-preview">
      {/* Card header */}
      <div style={{
        background: "#181C24",
        padding: "10px 16px",
        borderBottom: "1px solid #21262F",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#505870", fontSize: "0.58rem", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Agent</span>
          <span style={{ color: "#D0D4E0", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.85rem" }}>AEON</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge>Wallets Declared</Badge>
          <Badge>Live</Badge>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: "14px 16px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, borderBottom: "1px solid #21262F" }}>
        {[
          { label: "Treasury",    value: "—",      color: "#D0D4E0" },
          { label: "30d Revenue", value: "—",      color: "#D0D4E0" },
          { label: "Net Flow",    value: "—",      color: "#D0D4E0" },
          { label: "Confidence",  value: "Medium", color: "#F4B942" },
        ].map((m) => (
          <div key={m.label}>
            <div style={{ color: "#505870", fontSize: "0.56rem", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.label}</div>
            <div style={{ color: m.color, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.85rem" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Luca verdict */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{
          borderLeft: "3px solid #4AE8A0",
          paddingLeft: 12,
          background: "rgba(74,232,160,0.04)",
          padding: "10px 12px",
          borderRadius: "0 4px 4px 0",
        }}>
          <div style={{ color: "#4AE8A0", fontSize: "0.58rem", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Luca&apos;s Read
          </div>
          <div style={{ color: "#8B96A8", fontSize: "0.75rem", fontFamily: "var(--font-sans)", lineHeight: 1.55 }}>
            This agent has declared wallets. Revenue confidence depends on attributed wallet activity.
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div style={{ borderTop: "1px solid #21262F", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Books",   value: "Live",        color: "#4AE8A0" },
            { label: "Data",    value: "Fresh",       color: "#4AE8A0" },
            { label: "Wallets", value: "2 declared",  color: "#D0D4E0" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#505870", fontSize: "0.6rem", fontFamily: "var(--font-sans)" }}>{item.label}</span>
              <span style={{ color: item.color, fontSize: "0.6rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4AE8A0", flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let gdp: AgentGDP | null = null;
  let attr: AttributionMetrics | null = null;

  try { gdp = await getAgentGDP(); } catch { /* unavailable */ }
  try { attr = await getAttributionMetrics(); } catch { /* unavailable */ }

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(74,232,160,0.055) 0%, transparent 65%)",
        padding: "80px 40px 64px",
      }}>
        <div className="lp2-hero">
          <FadeContent>
            <Tag>Financial Intelligence Platform</Tag>
            <h1 style={{
              margin: "0 0 20px",
              fontSize: "clamp(1.9rem, 3.4vw, 3rem)",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "#D0D4E0",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}>
              Financial intelligence<br />
              for autonomous{" "}
              <em style={{ fontStyle: "normal", color: "#4AE8A0" }}>agents.</em>
            </h1>
            <p style={{ margin: "0 0 32px", fontSize: "1rem", color: "#8B96A8", lineHeight: 1.7, maxWidth: 460, fontFamily: "var(--font-sans)" }}>
              Zetta turns attributed agent wallet activity into Agent Books, treasury monitoring, revenue analysis, and Luca-powered reports.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <Link href="/registry" className="lp-btn-primary lp-btn-lg">Explore Registry →</Link>
              <Link href="/registry#verify" className="lp-btn-ghost lp-btn-lg">Register Agent</Link>
            </div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#505870", fontFamily: "var(--font-sans)" }}>
              Bankr-first. Accuracy over breadth. No manifest, no official books.
            </p>
          </FadeContent>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ── 2. STATS BAR ─────────────────────────────────────────────────────── */}
      <div className="zetta-stats-bar" style={{ marginTop: 0 }}>
        {[
          { label: "Indexed Agents",       value: attr ? String(attr.total_agents) : "—" },
          { label: "Attributed Agents",    value: attr ? String(attr.attributed_agents) : "—" },
          { label: "Attribution Coverage", value: attr ? `${attr.attribution_coverage_pct}%` : "—" },
          { label: "Agent GDP (30d)",      value: gdp  ? fmtUSD(gdp.total_revenue_usd) : "$—" },
        ].map((s) => (
          <div key={s.label} className="zetta-stats-bar-item">
            <p className="zetta-stat-label">{s.label}</p>
            <p className="zetta-stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── 3. PROBLEM ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-center" style={{ marginBottom: 48 }}>
            <Tag>The Problem</Tag>
            <H2>Agent wallets are hard to trust without attribution.</H2>
            <p className="lp2-narrow" style={{ margin: "0 auto", fontSize: "0.9rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
              Agents operate wallets, receive payments, pay for inference, hold treasury, and deploy contracts. Raw wallet data cannot tell you who owns a wallet or whether activity is real revenue.
            </p>
          </div>
          <div className="lp2-3col">
            {[
              {
                label: "Unknown Ownership",
                desc: "A wallet may be discovered, but that does not make it official. Discovery is not attribution.",
                top: "#F4B942",
              },
              {
                label: "Misleading Revenue",
                desc: "Gross inflow, token transfers, and bridge receipts can look like revenue when they are not.",
                top: "#F46060",
              },
              {
                label: "Missing Context",
                desc: "Without wallet roles, confidence levels, and source labels, users cannot trust the numbers.",
                top: "#505870",
              },
            ].map((c) => (
              <div key={c.label} style={{
                background: "#111418",
                border: "1px solid #21262F",
                borderTop: `3px solid ${c.top}`,
                borderRadius: 8,
                padding: "24px",
              }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700, color: "#D0D4E0", fontFamily: "var(--font-mono)" }}>{c.label}</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#8B96A8", lineHeight: 1.65, fontFamily: "var(--font-sans)" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WHAT ZETTA DOES (Features) ────────────────────────────────────── */}
      <section className="lp2-section-bg" style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-center" style={{ marginBottom: 48 }}>
            <Tag>The Platform</Tag>
            <H2>One layer for agent financial intelligence.</H2>
          </div>
          <div className="lp2-6col">
            {[
              { icon: "◈", label: "Agent Registry",    desc: "Browse indexed agents with verification, wallet, books, and data status." },
              { icon: "▤", label: "Wallet Attribution", desc: "Agents declare official wallets through .agent/wallets.json. Declared wallets are never confused with discovered ones." },
              { icon: "≡", label: "Agent Books",        desc: "Attributed wallet activity becomes readable revenue, expenses, treasury, and net flow — with confidence levels." },
              { icon: "◎", label: "Luca Reports",       desc: "Luca explains what is known, what is missing, and what needs verification — without inventing data." },
              { icon: "⌁", label: "API Access",         desc: "Build with agent books, revenue, wallet truth, registry, and badge endpoints. Machine-readable." },
              { icon: "✓", label: "Trust Rules",        desc: "Missing data is not zero. Discovered wallets are not official. Token activity is not revenue." },
            ].map((c) => (
              <div key={c.label} className="lp2-feature-card">
                <div style={{ fontSize: "1.1rem", color: "#4AE8A0", marginBottom: 12, fontFamily: "var(--font-mono)" }} aria-hidden="true">{c.icon}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "0.85rem", fontWeight: 700, color: "#D0D4E0", fontFamily: "var(--font-sans)" }}>{c.label}</h3>
                <p style={{ margin: 0, fontSize: "0.76rem", color: "#505870", lineHeight: 1.65, fontFamily: "var(--font-sans)" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-center" style={{ marginBottom: 48 }}>
            <Tag>Process</Tag>
            <H2>From wallet declaration to financial intelligence.</H2>
          </div>
          <div className="lp2-flow">
            {[
              { step: "Agent Profile",      desc: "Agent indexed with identity, ecosystem, and metadata." },
              { step: ".agent/wallets.json", desc: "Team submits a manifest declaring official wallets and roles." },
              { step: "Wallet Attribution", desc: "Declared wallets are attributed. Discovered wallets remain unattributed." },
              { step: "On-chain Data",      desc: "Attributed wallet transactions are fetched and stored." },
              { step: "Classification",     desc: "Activity classified as revenue, expenses, treasury, or internal transfer." },
              { step: "Agent Books",        desc: "Classified data becomes readable financial statements per agent." },
              { step: "Luca Report",        desc: "Luca reads the books and writes a plain-language financial verdict." },
              { step: "API / Profile",      desc: "Data served through public profiles and developer API endpoints." },
            ].map((item, i, arr) => (
              <div key={item.step} style={{ display: "flex", alignItems: "flex-start" }}>
                <div className="lp2-flow-step">
                  <div style={{ color: "#4AE8A0", fontSize: "0.6rem", fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ color: "#D0D4E0", fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-sans)", marginBottom: 6, lineHeight: 1.3 }}>
                    {item.step}
                  </div>
                  <div style={{ color: "#505870", fontSize: "0.68rem", fontFamily: "var(--font-sans)", lineHeight: 1.55 }}>
                    {item.desc}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="lp2-flow-arrow" aria-hidden="true">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. AGENT BOOKS PREVIEW ────────────────────────────────────────────── */}
      <section className="lp2-section-bg" style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-2col">
            <div>
              <Tag>Agent Books</Tag>
              <H2>Readable books for autonomous agents.</H2>
              <p style={{ margin: "0 0 20px", fontSize: "0.875rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
                Agent Books are generated only from attributed, books-eligible wallets. If data is missing, Zetta shows —, not fake $0.00.
              </p>
              <ul style={{ margin: "0 0 28px", padding: "0 0 0 16px", color: "#8B96A8", fontSize: "0.82rem", fontFamily: "var(--font-sans)", lineHeight: 1.9 }}>
                <li>Only manifest-declared wallets contribute to books</li>
                <li>Operating revenue is separate from token inflows</li>
                <li>Every figure carries source, period, and confidence</li>
                <li>Missing data is shown as — not $0.00</li>
              </ul>
              <Link href="/registry" className="lp-btn-primary" style={{ display: "inline-flex" }}>Explore Agent Profiles →</Link>
            </div>
            <div style={{ background: "#0A0C10", border: "1px solid #21262F", borderRadius: 8, overflow: "hidden" }}>
              <div style={{
                background: "#181C24",
                padding: "10px 16px",
                borderBottom: "1px solid #21262F",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ color: "#D0D4E0", fontSize: "0.78rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>Agent Books</span>
                <Badge color="#F4B942">Confidence: Medium</Badge>
              </div>
              <div style={{ padding: 16 }}>
                {[
                  { label: "Period",           value: "30d",                      color: "#D0D4E0" },
                  { label: "Source",           value: "Manifest-declared wallets", color: "#D0D4E0" },
                  { label: "Wallets included", value: "2",                        color: "#D0D4E0" },
                  { label: "Data status",      value: "Fresh",                    color: "#4AE8A0" },
                ].map((row) => (
                  <div key={row.label} className="lp2-books-row">
                    <span style={{ color: "#505870", fontFamily: "var(--font-sans)" }}>{row.label}</span>
                    <span style={{ color: row.color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, background: "#181C24", borderRadius: 6, padding: "12px 14px" }}>
                  {[
                    { label: "Operating Revenue", value: "—" },
                    { label: "Expenses",          value: "—" },
                    { label: "Net Flow",          value: "—" },
                    { label: "Treasury",          value: "—" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "0.82rem" }}>
                      <span style={{ color: "#8B96A8", fontFamily: "var(--font-sans)" }}>{row.label}</span>
                      <span style={{ color: "#D0D4E0", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. LUCA ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-2col">
            <div>
              <Tag>Intelligence</Tag>
              <H2>Meet Luca, the AI financial analyst for agents.</H2>
              <p style={{ margin: "0 0 28px", fontSize: "0.875rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
                Luca reads Zetta data and explains agent finances in plain language. Luca cites its sources, flags what is missing, and never invents data that is not in the books.
              </p>
              <Link href="/luca" className="lp-btn-primary" style={{ display: "inline-flex" }}>Ask Luca →</Link>
            </div>
            <div style={{ background: "#111418", border: "1px solid #21262F", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ background: "#181C24", padding: "10px 16px", borderBottom: "1px solid #21262F" }}>
                <span style={{ color: "#4AE8A0", fontSize: "0.58rem", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Luca&apos;s Read</span>
              </div>
              <div style={{ padding: "20px" }}>
                {[
                  {
                    label: "What we know",
                    points: [
                      "Wallets have been declared.",
                      "Books are generated from eligible wallets.",
                      "Revenue confidence is medium.",
                    ],
                    color: "#4AE8A0",
                  },
                  {
                    label: "What is missing",
                    points: [
                      "More wallet evidence may improve confidence.",
                      "Some activity may be unclassified.",
                    ],
                    color: "#F4B942",
                  },
                ].map((s) => (
                  <div key={s.label} style={{ marginBottom: 20 }}>
                    <div style={{ color: s.color, fontSize: "0.6rem", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      {s.label}
                    </div>
                    {s.points.map((pt) => (
                      <div key={pt} style={{ color: "#8B96A8", fontSize: "0.77rem", fontFamily: "var(--font-sans)", lineHeight: 1.6, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid #21262F" }}>
                        {pt}
                      </div>
                    ))}
                  </div>
                ))}
                <div>
                  <div style={{ color: "#5B9EF4", fontSize: "0.6rem", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Next action
                  </div>
                  <div style={{ color: "#8B96A8", fontSize: "0.77rem", fontFamily: "var(--font-sans)", lineHeight: 1.6, paddingLeft: 10, borderLeft: "2px solid #21262F" }}>
                    Submit or update the wallet manifest.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. WALLET MANIFEST ────────────────────────────────────────────────── */}
      <section className="lp2-section-bg" style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-2col">
            <div>
              <Tag>Wallet Manifest</Tag>
              <H2>No manifest, no official books.</H2>
              <p style={{ margin: "0 0 14px", fontSize: "0.875rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
                The Agent Wallet Manifest is how agent teams declare official wallets. Without it, Zetta can discover wallets but cannot attribute them.
              </p>
              <p style={{ margin: "0 0 28px", fontSize: "0.875rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
                Once submitted, attributed wallets contribute to Agent Books, revenue attribution, and Luca reports.
              </p>
              <Link href="/registry#verify" className="lp-btn-primary" style={{ display: "inline-flex" }}>Submit Manifest →</Link>
            </div>
            <div style={{ background: "#0A0C10", border: "1px solid #21262F", borderRadius: 8, overflow: "hidden" }}>
              {/* Terminal bar */}
              <div style={{ background: "#181C24", padding: "8px 14px", borderBottom: "1px solid #21262F", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F46060", display: "inline-block" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F4B942", display: "inline-block" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4AE8A0", display: "inline-block" }} />
                <span style={{ marginLeft: 8, color: "#505870", fontSize: "0.6rem", fontFamily: "var(--font-mono)" }}>.agent/wallets.json</span>
              </div>
              <pre style={{
                margin: 0,
                padding: "20px",
                fontSize: "0.72rem",
                lineHeight: 1.7,
                fontFamily: "var(--font-mono)",
                color: "#8B96A8",
                overflowX: "auto",
              }}>
{`{
  "agent": "MyAgent",
  "ecosystem": "Bankr",
  "x": "@myagent",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "notes": "Primary treasury wallet"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. BANKR-FIRST ───────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 40px", borderTop: "1px solid #21262F" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-center" style={{ marginBottom: 40 }}>
            <Tag>Bankr-First</Tag>
            <H2>Starting with Bankr agents.</H2>
            <p className="lp2-narrow" style={{ margin: "0 auto 40px", fontSize: "0.875rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
              Zetta is currently focused on making Bankr agents financially readable before expanding broadly across every ecosystem. Accuracy over breadth.
            </p>
          </div>
          <div className="lp2-4col" style={{ marginBottom: 40 }}>
            {[
              { label: "Agents Indexed",     value: attr ? String(attr.total_agents) : "—" },
              { label: "Manifests Submitted", value: attr ? String(attr.status_breakdown.manifest) : "—" },
              { label: "Live Books",          value: attr ? String(attr.attributed_agents) : "—" },
              { label: "Needing Manifest",    value: attr ? String(attr.status_breakdown.none) : "—" },
            ].map((s) => (
              <div key={s.label} className="lp2-bankr-stat">
                <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#D0D4E0", marginBottom: 6 }}>{s.value}</div>
                <div style={{ fontSize: "0.65rem", color: "#505870", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="lp2-center">
            <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">Register your Bankr agent →</Link>
          </div>
        </div>
      </section>

      {/* ── 10. API ───────────────────────────────────────────────────────────── */}
      <section className="lp2-section-bg" style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-2col">
            <div>
              <Tag>Developer API</Tag>
              <H2>Build with agent financial data.</H2>
              <p style={{ margin: "0 0 28px", fontSize: "0.875rem", color: "#8B96A8", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}>
                Use Zetta APIs to read attributed agent books, revenue, wallet truth, registry data, and badges. The same numbers the UI shows, machine-readable.
              </p>
              <Link href="/api" className="lp-btn-primary" style={{ display: "inline-flex" }}>View Developers →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { method: "GET", path: "/api/v1/agent-books/{slug}",    desc: "Agent financial statements" },
                { method: "GET", path: "/api/v1/agent-revenue/{slug}",  desc: "Revenue attribution and breakdown" },
                { method: "GET", path: "/api/v1/agent-truth/{slug}",    desc: "Wallet truth and attribution status" },
                { method: "GET", path: "/api/registry/agents",          desc: "Full agent registry" },
                { method: "GET", path: "/api/badge/{slug}",             desc: "Embeddable agent badge" },
              ].map((ep) => (
                <div key={ep.path} className="lp2-endpoint">
                  <span style={{ color: "#4AE8A0", background: "rgba(74,232,160,0.08)", padding: "2px 6px", borderRadius: 3, fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>
                    {ep.method}
                  </span>
                  <span style={{ color: "#D0D4E0", fontSize: "0.72rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ep.path}
                  </span>
                  <span style={{ color: "#505870", fontSize: "0.68rem", fontFamily: "var(--font-sans)", flexShrink: 0 }}>
                    {ep.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. TRUST ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp2-center" style={{ marginBottom: 48 }}>
            <Tag>Trust &amp; Safety</Tag>
            <H2>Designed for financial truth, not hype.</H2>
          </div>
          <div className="lp2-4col">
            {[
              { label: "Read-only",            desc: "Zetta never asks for private keys and cannot move funds." },
              { label: "Attribution-first",    desc: "Discovered wallets are not official until attributed by the agent team." },
              { label: "Conservative Revenue", desc: "Gross inflow and token activity are not treated as operating revenue by default." },
              { label: "Confidence-aware",     desc: "Every financial number carries source, period, and confidence level." },
            ].map((c) => (
              <div key={c.label} className="lp2-trust-card">
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "rgba(74,232,160,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  flexShrink: 0,
                }}>
                  <span style={{ color: "#4AE8A0", fontSize: "0.85rem" }}>✓</span>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "0.85rem", fontWeight: 700, color: "#D0D4E0", fontFamily: "var(--font-sans)" }}>{c.label}</h3>
                <p style={{ margin: 0, fontSize: "0.76rem", color: "#505870", lineHeight: 1.65, fontFamily: "var(--font-sans)" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{
        background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(74,232,160,0.055) 0%, transparent 65%), #111418",
        borderTop: "1px solid #21262F",
        padding: "96px 40px",
        textAlign: "center",
      }}>
        <Tag>Get Started</Tag>
        <h2 style={{
          margin: "0 0 16px",
          fontSize: "clamp(1.7rem, 3vw, 2.4rem)",
          fontWeight: 800,
          fontFamily: "var(--font-mono)",
          color: "#D0D4E0",
          lineHeight: 1.15,
        }}>
          Make your agent financially readable.
        </h2>
        <p style={{ margin: "0 auto 40px", fontSize: "0.95rem", color: "#8B96A8", lineHeight: 1.7, maxWidth: 480, fontFamily: "var(--font-sans)" }}>
          Submit your wallet manifest, get attributed books, and let Luca explain the financial state of your agent.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">Register Agent →</Link>
          <Link href="/registry" className="lp-btn-ghost lp-btn-lg">Explore Registry</Link>
        </div>
      </section>

      {/* ── 13. FOOTER ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </div>
  );
}
