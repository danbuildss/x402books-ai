import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { TIER_LABELS, TIER_LIMITS, type LucaTier } from "@/lib/luca-token";

const TIER_COLORS: Record<LucaTier, string> = {
  free:   "var(--muted)",
  holder: "var(--blue)",
  whale:  "var(--accent)",
  luca:   "#8B7CF6",
};

const TIER_DESCS: Record<LucaTier, string> = {
  free:   "Get started with the API. No token required.",
  holder: "For $LUCA holders — developer-level throughput.",
  whale:  "High-volume access for serious integrations.",
  luca:   "Full infrastructure access. Ecosystem partners.",
};

function TierBadge({ tier }: { tier: LucaTier }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
      letterSpacing: "0.04em",
      background: `color-mix(in srgb, ${TIER_COLORS[tier]} 14%, transparent)`,
      color: TIER_COLORS[tier],
    }}>
      {TIER_LABELS[tier]}
    </span>
  );
}

const ENDPOINTS = [
  { method: "GET",  path: "/api/v1/ledger-summary",          desc: "Income, spend, net flow, budget status",               params: "wallet, range" },
  { method: "GET",  path: "/api/v1/transactions",             desc: "Paginated transactions with USD values + categories",  params: "wallet, range, page, limit" },
  { method: "GET",  path: "/api/v1/full-report",              desc: "Complete scan: portfolio, daily flows, categories",    params: "wallet, range" },
  { method: "POST", path: "/api/v1/categorize",               desc: "AI-powered transaction categorization",                params: "{ wallet, range }" },
  { method: "GET",  path: "/api/v1/agent-financial-state",    desc: "Agent snapshot: ecosystem, portfolio, x402 activity", params: "wallet, range" },
];

const AGENT_ENDPOINTS = [
  { method: "GET",  path: "/api/v1/agent-books/{slug}",        desc: "Agent financial statement: revenue, spend, net income across all declared wallets", params: "range (7d|14d|30d|90d)" },
  { method: "GET",  path: "/api/v1/agent-books/{slug}/history",desc: "Historical books snapshots for time-series charting",  params: "period (7d|30d|90d|all)" },
  { method: "GET",  path: "/api/v1/agent-revenue/{slug}",      desc: "Classified revenue events for one agent",              params: "limit, offset" },
  { method: "GET",  path: "/api/v1/agent-truth/{slug}",        desc: "Wallet claims, eligibility, manifest status, and revenue evidence summary", params: "—" },
];

function EndpointRow({ ep, last }: { ep: { method: string; path: string; desc: string; params: string }; last: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "56px 1fr 1fr",
      gap: "12px 20px",
      alignItems: "start",
      padding: "14px 20px",
      borderBottom: last ? "none" : "1px solid var(--line)",
    }}>
      <span style={{
        fontSize: "0.65rem", fontWeight: 700, padding: "3px 6px", borderRadius: 4,
        textAlign: "center", lineHeight: 1.4,
        background: ep.method === "GET"
          ? "color-mix(in srgb, var(--blue) 14%, transparent)"
          : "color-mix(in srgb, var(--accent) 14%, transparent)",
        color: ep.method === "GET" ? "var(--blue)" : "var(--accent)",
      }}>
        {ep.method}
      </span>
      <div>
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--ink)", display: "block", marginBottom: 3 }}>
          {ep.path}
        </code>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{ep.desc}</span>
      </div>
      <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)", wordBreak: "break-word" }}>
        {ep.params}
      </code>
    </div>
  );
}

export default function ApiPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "72px 40px 48px" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
          API Reference
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 3vw, 2.5rem)", fontWeight: 700, lineHeight: 1.2, color: "var(--ink)", marginBottom: 16 }}>
          Build on Zetta.
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--muted)", maxWidth: 560, lineHeight: 1.65, marginBottom: 32 }}>
          Query agent financial data, retrieve attributed books, and integrate
          financial intelligence into your applications. RESTful API with
          tier-based rate limits linked to your $LUCA balance.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/access" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
            Get API Key →
          </Link>
          <Link href="/dashboard/keys" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid var(--line)", color: "var(--ink)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
            Manage Keys →
          </Link>
        </div>
      </section>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px" }}>
        <hr style={{ border: "none", borderTop: "1px solid var(--line)" }} />
      </div>

      {/* Tiers */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 24 }}>
          Access Tiers
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {(["free", "holder", "whale"] as LucaTier[]).map((tier) => (
            <div key={tier} style={{ padding: "20px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ marginBottom: 10 }}><TierBadge tier={tier} /></div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: TIER_COLORS[tier], marginBottom: 4 }}>
                {TIER_LIMITS[tier].toLocaleString()}
                <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>req/day</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>{TIER_DESCS[tier]}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 16 }}>
          Tier is determined by $LUCA balance verified via wallet signature. Link your wallet in the{" "}
          <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>Operators Dashboard</Link>.
        </p>
      </section>

      {/* Auth */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 48px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
          Authentication
        </h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", fontSize: "0.78rem", color: "var(--muted)" }}>
            Include your API key in every request using either header:
          </div>
          <div style={{ padding: "16px 20px", display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bearer token</p>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--ink)", background: "var(--surface-soft)", padding: "6px 10px", borderRadius: 6, display: "block" }}>
                Authorization: Bearer zt_live_…
              </code>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>API key header</p>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--ink)", background: "var(--surface-soft)", padding: "6px 10px", borderRadius: 6, display: "block" }}>
                X-API-Key: zt_live_…
              </code>
            </div>
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", fontSize: "0.72rem", color: "var(--muted)", background: "var(--surface-soft)" }}>
            Base URL: <code style={{ fontFamily: "var(--font-mono)" }}>https://www.zettaai.co/api/v1</code>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 80px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
          Endpoints
        </h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {ENDPOINTS.map((ep, i) => <EndpointRow key={ep.path} ep={ep} last={i === ENDPOINTS.length - 1} />)}
        </div>
      </section>

      {/* Agent endpoints */}
      <section id="agent-endpoints" style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 48px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
          Agent-Centric Endpoints
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Query financial data for a specific registered agent. Use an agent-scoped key
          (named <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>agent:your-slug</code>) to restrict
          access to your agent only, or an unscoped key for cross-agent access.
          Create agent-scoped keys at{" "}
          <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>/dashboard/keys</Link>.
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          {AGENT_ENDPOINTS.map((ep, i) => <EndpointRow key={ep.path} ep={ep} last={i === AGENT_ENDPOINTS.length - 1} />)}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Example — fetch your agent&apos;s 30-day books
          </p>
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--ink)", display: "block", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {`curl https://www.zettaai.co/api/v1/agent-books/your-slug?range=30d \\\n  -H "Authorization: Bearer zt_live_…"`}
          </code>
        </div>
      </section>

      {/* Manifest + agent-scoped keys */}
      <section id="manifest" style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 80px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
          Agent-Scoped Keys &amp; Manifest
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 16 }}>
          An agent-scoped key is a standard API key whose name follows the
          pattern <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>agent:your-slug</code>.
          The API enforces that this key can only query data for that agent — any cross-agent request
          returns 403. Create one in{" "}
          <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>your key dashboard</Link>{" "}
          by entering the key name as <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>agent:your-slug</code>.
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>
          To have your agent indexed and appear on the registry, submit a wallet manifest at{" "}
          <Link href="/manifest" style={{ color: "var(--accent)" }}>/manifest</Link>.
          The manifest links your agent to its treasury and fee wallets, enabling financial attribution.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
