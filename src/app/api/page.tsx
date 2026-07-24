import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TIER_LABELS, TIER_LIMITS, type LucaTier } from "@/lib/luca-token";

export const metadata = {
  title: "API Reference — Zetta",
  description: "Programmatic access to agent financial books, attributed revenue, on-chain classification, and Luca economic analysis.",
};

const TIER_COLORS: Record<LucaTier, string> = {
  free:   "var(--ink-mid)",
  holder: "var(--blue)",
  whale:  "var(--accent)",
  luca:   "var(--purple)",
};

const TIER_DESCS: Record<LucaTier, string> = {
  free:   "Public data. No token required to start.",
  holder: "$LUCA holders — developer-level throughput.",
  whale:  "High-volume access for serious integrations.",
  luca:   "Full infrastructure access. Ecosystem partners.",
};

const WALLET_ENDPOINTS = [
  { method: "GET",  path: "/api/v1/ledger-summary",       desc: "Income, spend, net flow, budget status",              params: "wallet, range" },
  { method: "GET",  path: "/api/v1/transactions",          desc: "Paginated transactions with USD values + categories", params: "wallet, range, page, limit" },
  { method: "GET",  path: "/api/v1/full-report",           desc: "Complete scan: portfolio, daily flows, categories",   params: "wallet, range" },
  { method: "POST", path: "/api/v1/categorize",            desc: "AI-powered transaction categorization",               params: "{ wallet, range }" },
  { method: "GET",  path: "/api/v1/agent-financial-state", desc: "Agent snapshot: ecosystem, portfolio, x402 activity", params: "wallet, range" },
];

const AGENT_ENDPOINTS = [
  { method: "GET", path: "/api/v1/agent-books/{slug}",         desc: "Financial statement: revenue, spend, net income across declared wallets", params: "range (7d|14d|30d|90d)" },
  { method: "GET", path: "/api/v1/agent-books/{slug}/history", desc: "Historical books snapshots for time-series charting",                    params: "period (7d|30d|90d|all)" },
  { method: "GET", path: "/api/v1/agent-revenue/{slug}",       desc: "Classified revenue events for one agent",                                params: "limit, offset" },
  { method: "GET", path: "/api/v1/agent-truth/{slug}",         desc: "Wallet claims, eligibility, manifest status, and revenue evidence",      params: "—" },
  { method: "GET", path: "/api/v1/agent-report",               desc: "Luca-generated financial narrative and verdict",                         params: "slug, range" },
  { method: "GET", path: "/api/v1/luca/economy",               desc: "Aggregate agent economy: GDP, active agents, settlement volume",         params: "—" },
];

const ERROR_CODES = [
  { status: "401", code: "unauthorized",         desc: "Missing or invalid API key." },
  { status: "403", code: "forbidden",            desc: "Agent-scoped key attempting to access a different agent." },
  { status: "404", code: "agent_not_found",      desc: "No agent with that slug exists in the registry." },
  { status: "409", code: "no_books",             desc: "Agent indexed but no declared wallet manifest." },
  { status: "429", code: "rate_limited",         desc: "Retry after X-RateLimit-Reset." },
  { status: "503", code: "registry_unavailable", desc: "Data layer offline. Safe to retry with backoff." },
];

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "60px 1fr auto",
  gap: "12px 16px",
  alignItems: "start",
  padding: "12px 16px",
};

function EndpointRow({ ep, last }: { ep: { method: string; path: string; desc: string; params: string }; last: boolean }) {
  const isGet = ep.method === "GET";
  return (
    <div style={{
      ...row,
      borderBottom: last ? "none" : "1px solid var(--line)",
    }}>
      <span style={{
        fontSize: "0.62rem", fontWeight: 700, padding: "3px 6px", borderRadius: 4,
        textAlign: "center", lineHeight: 1.4, fontFamily: "var(--font-mono)",
        background: isGet ? "rgba(59,110,168,0.12)" : "rgba(28,184,112,0.10)",
        color: isGet ? "var(--blue)" : "var(--accent)",
      }}>
        {ep.method}
      </span>
      <div>
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.77rem", color: "var(--ink-em)", display: "block", marginBottom: 3 }}>
          {ep.path}
        </code>
        <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)", lineHeight: 1.45 }}>{ep.desc}</span>
      </div>
      <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
        {ep.params}
      </code>
    </div>
  );
}

export default function ApiPage() {
  return (
    <div className="lp-root">
      <SiteNav />

      <article style={{ maxWidth: 920, margin: "0 auto", padding: "3rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.76rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>API Reference</span>
        </nav>

        {/* Masthead */}
        <div style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 12 }}>Developer Reference · v1</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "var(--ink-em)", lineHeight: 1.2, margin: "0 0 12px" }}>
            Zetta API v1
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-mid)", maxWidth: 560, lineHeight: 1.7, margin: "0 0 24px" }}>
            Programmatic access to agent financial books, attributed revenue, on-chain classification,
            and Luca economic analysis. RESTful API with tier-based rate limits.
          </p>
          {/* Base URL bar */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "9px 16px", fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Base URL</span>
            <span style={{ color: "var(--ink-em)" }}>https://www.zettaai.co/api/v1</span>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 48 }}>
          <Link href="/access" style={{ padding: "8px 18px", background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>
            Get API Key →
          </Link>
          <Link href="/dashboard/keys" style={{ padding: "8px 18px", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>
            Manage Keys
          </Link>
          <Link href="/manifest" style={{ padding: "8px 18px", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>
            Manifest Spec
          </Link>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 40px" }} />

        {/* Authentication */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 16 }}>Authentication</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            {[
              { label: "Type",     value: "API Key (Bearer token or header)" },
              { label: "Header A", value: "Authorization: Bearer zt_live_…" },
              { label: "Header B", value: "X-API-Key: zt_live_…" },
              { label: "Format",   value: "zt_live_ prefix for production · zt_test_ for sandbox" },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr", padding: "10px 16px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line)", gap: 16, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{r.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--ink-em)" }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", padding: "10px 16px", gap: 16, alignItems: "flex-start" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Scopes</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["read:books", "read:revenue", "read:ledger", "read:intelligence", "agent:self"].map((s) => (
                  <span key={s} style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", padding: "2px 7px", border: "1px solid var(--line)", borderRadius: 4, color: "var(--ink-mid)", background: "var(--surface-soft)" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
            Agent-scoped keys (<code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)", color: "var(--ink-em)" }}>agent:your-slug</code>) can only query their own agent&apos;s data.
            Create one in <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>your key dashboard</Link>.
          </p>
        </section>

        {/* Access Tiers */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 16 }}>Access Tiers</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {(["free", "holder", "whale"] as LucaTier[]).map((tier) => (
              <div key={tier} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: TIER_COLORS[tier] }}>
                  {TIER_LABELS[tier]}
                </span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: TIER_COLORS[tier], margin: "8px 0 4px", lineHeight: 1 }}>
                  {TIER_LIMITS[tier].toLocaleString()}
                  <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>req/day</span>
                </div>
                <p style={{ fontSize: "0.73rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{TIER_DESCS[tier]}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.73rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
            Tier determined by $LUCA balance verified via wallet signature. Link your wallet in the{" "}
            <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>Operators Dashboard</Link>.
          </p>
        </section>

        {/* Wallet Endpoints */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 16 }}>Wallet / Ledger Endpoints</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: "12px 16px", padding: "8px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
              {["Method", "Endpoint / Description", "Params"].map((h) => (
                <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</span>
              ))}
            </div>
            {WALLET_ENDPOINTS.map((ep, i) => (
              <EndpointRow key={ep.path} ep={ep} last={i === WALLET_ENDPOINTS.length - 1} />
            ))}
          </div>
        </section>

        {/* Agent Endpoints */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 8 }}>Agent-Centric Endpoints</div>
          <p style={{ fontSize: "0.76rem", color: "var(--ink-mid)", marginBottom: 16, lineHeight: 1.6 }}>
            Query financial data for a specific registered agent. Use an agent-scoped key to restrict access to your agent only, or an unscoped key for cross-agent access.
          </p>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: "12px 16px", padding: "8px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
              {["Method", "Endpoint / Description", "Params"].map((h) => (
                <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</span>
              ))}
            </div>
            {AGENT_ENDPOINTS.map((ep, i) => (
              <EndpointRow key={ep.path} ep={ep} last={i === AGENT_ENDPOINTS.length - 1} />
            ))}
          </div>

          {/* Curl example */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Example — fetch agent books</span>
            </div>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--ink)", padding: "14px 16px", margin: 0, lineHeight: 1.7, overflowX: "auto" }}>
{`curl https://www.zettaai.co/api/v1/agent-books/your-slug?range=30d \\
  -H "Authorization: Bearer zt_live_…"`}
            </pre>
          </div>
        </section>

        {/* Rate Limits */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 16 }}>Rate Limits</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "8px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)", gap: 12 }}>
              {["Plan", "Req / min", "Req / day", "Notes"].map((h) => (
                <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</span>
              ))}
            </div>
            {[
              { plan: "Free",    rpm: "10 rpm",  day: "500 / day",  note: "Public data only. No intelligence endpoints.", color: "var(--warning)" },
              { plan: "Builder", rpm: "60 rpm",  day: "5,000 / day", note: "Full endpoint access. Agent-scoped by default.", color: "var(--ink-mid)" },
              { plan: "Pro",     rpm: "300 rpm", day: "Unlimited",   note: "Global read + Luca analysis + custom key scopes.", color: "var(--accent)" },
            ].map((r, i, arr) => (
              <div key={r.plan} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "10px 16px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line)", gap: 12, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--ink-em)", fontWeight: 600 }}>{r.plan}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: r.color }}>{r.rpm}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: r.color }}>{r.day}</span>
                <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)" }}>{r.note}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.73rem", color: "var(--muted)", marginTop: 10 }}>
            Rate limit status in every response: <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)", color: "var(--ink-em)" }}>X-RateLimit-Remaining</code> · <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)", color: "var(--ink-em)" }}>X-RateLimit-Reset</code>
          </p>
        </section>

        {/* Error Codes */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 16 }}>Error Codes</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "56px 180px 1fr", padding: "8px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)", gap: 16 }}>
              {["HTTP", "Code", "Meaning"].map((h) => (
                <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</span>
              ))}
            </div>
            {ERROR_CODES.map((e, i, arr) => {
              const isErr = e.status.startsWith("4") || e.status.startsWith("5");
              const isWarn = e.status === "404" || e.status === "409" || e.status === "429";
              const color = isWarn ? "var(--warning)" : isErr ? "var(--negative)" : "var(--accent)";
              return (
                <div key={e.code} style={{ display: "grid", gridTemplateColumns: "56px 180px 1fr", padding: "10px 16px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line)", gap: 16, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color, fontWeight: 700 }}>{e.status}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.73rem", color: "var(--ink-em)" }}>{e.code}</span>
                  <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)" }}>{e.desc}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Agent-scoped keys & manifest info */}
        <section style={{ marginBottom: 40 }}>
          <div className="tla-section-label" style={{ marginBottom: 16 }}>Agent-Scoped Keys &amp; Manifest</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-mid)", lineHeight: 1.7, margin: "0 0 12px" }}>
              An agent-scoped key is a standard API key whose name follows the pattern{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)", color: "var(--ink-em)" }}>agent:your-slug</code>.
              The API enforces this key can only query data for that agent — any cross-agent request returns 403.
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-mid)", lineHeight: 1.7, margin: 0 }}>
              To have your agent indexed and appear on the registry, submit a wallet manifest at{" "}
              <Link href="/manifest" style={{ color: "var(--accent)", textDecoration: "none" }}>/manifest</Link>.
              The manifest links your agent to its treasury and fee wallets, enabling financial attribution.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink-em)", margin: "0 0 4px" }}>Get your API key</p>
            <p style={{ fontSize: "0.76rem", color: "var(--ink-mid)", margin: 0 }}>Free tier: 500 requests / day. No credit card required.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/access" style={{ padding: "8px 18px", background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>
              Request Access →
            </Link>
            <Link href="/manifest" style={{ padding: "8px 18px", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>
              Manifest Spec
            </Link>
          </div>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
