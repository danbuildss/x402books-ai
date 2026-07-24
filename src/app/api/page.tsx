"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TIER_LABELS, TIER_LIMITS, type LucaTier } from "@/lib/luca-token";

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

const AUTH_ROWS = [
  { label: "Type",     value: "API Key (Bearer token or header)", mono: true },
  { label: "Header A", value: <>Authorization: Bearer <span style={{ color: "var(--accent)" }}>zt_live_…</span></>, mono: true },
  { label: "Header B", value: <>X-API-Key: <span style={{ color: "var(--accent)" }}>zt_live_…</span></>, mono: true },
  { label: "Format",   value: <><InlineCode>zt_live_</InlineCode> production · <InlineCode>zt_test_</InlineCode> sandbox</>, mono: false },
];

const SCOPES = ["read:books", "read:revenue", "read:ledger", "read:intelligence", "agent:self"];

const WALLET_ENDPOINTS = [
  { id: "ledger-summary", method: "GET",  path: "/api/v1/ledger-summary",       desc: "Income, spend, net flow, budget status",              params: "wallet, range" },
  { id: "transactions",   method: "GET",  path: "/api/v1/transactions",          desc: "Paginated transactions with USD values + categories", params: "wallet, range, page, limit" },
  { id: "full-report",    method: "GET",  path: "/api/v1/full-report",           desc: "Complete scan: portfolio, daily flows, categories",   params: "wallet, range" },
  { id: "categorize",     method: "POST", path: "/api/v1/categorize",            desc: "AI-powered transaction categorization",               params: "{ wallet, range }" },
];

const AGENT_ENDPOINTS = [
  { id: "agent-books",    method: "GET", path: <>/api/v1/agent-books/<span style={{ color: "var(--accent)" }}>{"{slug}"}</span></>,         desc: "Financial statement: revenue, spend, net across declared wallets", params: "range (7d|30d|90d)" },
  { id: "agent-history",  method: "GET", path: <>/api/v1/agent-books/<span style={{ color: "var(--accent)" }}>{"{slug}"}</span>/history</>, desc: "Historical books snapshots for time-series charting",              params: "period (7d|30d|90d|all)" },
  { id: "agent-revenue",  method: "GET", path: <>/api/v1/agent-revenue/<span style={{ color: "var(--accent)" }}>{"{slug}"}</span></>,       desc: "Classified revenue events for one agent",                         params: "limit, offset" },
  { id: "agent-truth",    method: "GET", path: <>/api/v1/agent-truth/<span style={{ color: "var(--accent)" }}>{"{slug}"}</span></>,         desc: "Wallet claims, eligibility, manifest status, revenue evidence",   params: "—" },
  { id: "agent-report",   method: "GET", path: "/api/v1/agent-report",                                                                        desc: "Luca-generated financial narrative and verdict",                   params: "slug, range" },
  { id: "economy",        method: "GET", path: "/api/v1/luca/economy",                                                                        desc: "Aggregate agent economy: GDP, active agents, settlement volume",  params: "—" },
];

const ERROR_ROWS = [
  { status: "401", code: "unauthorized",         color: "var(--negative)", desc: "Missing or invalid API key." },
  { status: "403", code: "forbidden",            color: "var(--negative)", desc: "Agent-scoped key accessing a different agent." },
  { status: "404", code: "agent_not_found",      color: "var(--warning)",  desc: "No agent with that slug in the registry." },
  { status: "409", code: "no_books",             color: "var(--warning)",  desc: "Agent indexed but no wallet manifest declared." },
  { status: "429", code: "rate_limited",         color: "var(--warning)",  desc: "Retry after X-RateLimit-Reset." },
  { status: "503", code: "registry_unavailable", color: "var(--negative)", desc: "Data layer offline. Safe to retry with backoff." },
];

const RATE_ROWS = [
  { plan: "Free",    rpm: "10 rpm",   day: "500 / day",    rpmColor: "var(--warning)", dayColor: "var(--warning)", note: "Public data only. No intelligence endpoints." },
  { plan: "Builder", rpm: "60 rpm",   day: "5,000 / day",  rpmColor: "var(--ink-em)", dayColor: "var(--ink-em)", note: "Full endpoint access. Agent-scoped by default." },
  { plan: "Pro",     rpm: "300 rpm",  day: "Unlimited",    rpmColor: "var(--accent)",  dayColor: "var(--accent)",  note: "Global read + Luca analysis + custom key scopes." },
];

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 3, padding: "1px 5px", color: "var(--ink-em)" }}>
      {children}
    </code>
  );
}

function MethodBadge({ method }: { method: string }) {
  const isGet = method === "GET";
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700,
      padding: "3px 6px", borderRadius: 4, textAlign: "center" as const, lineHeight: 1.3,
      background: isGet ? "var(--accent-soft)" : "rgba(59,110,168,0.12)",
      color: isGet ? "var(--accent)" : "var(--blue)",
    }}>
      {method}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)",
      display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}

function Card({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <div id={id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 18, ...style }}>
      {children}
    </div>
  );
}

function CardHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "8px 14px", background: "var(--surface-soft)", borderBottom: "1px solid var(--line)", display: "flex", gap: 16 }}>
      {children}
    </div>
  );
}

function TH({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "var(--muted)", ...style }}>
      {children}
    </span>
  );
}

function JsonLine({ k, v, type, indent = 0, comma = true }: { k?: string; v?: React.ReactNode; type: "key" | "str" | "num" | "bool" | "bracket" | "comment"; indent?: number; comma?: boolean }) {
  const colors: Record<string, string> = {
    key: "var(--json-key)", str: "var(--json-str)", num: "var(--json-num)", bool: "var(--json-bool)", bracket: "var(--ink)", comment: "var(--muted)",
  };
  return (
    <div style={{ paddingLeft: indent * 16 }}>
      {k && <span style={{ color: "var(--json-key)" }}>&quot;{k}&quot;</span>}
      {k && <span style={{ color: "var(--ink)" }}>: </span>}
      <span style={{ color: colors[type] }}>{v}</span>
      {comma && type !== "bracket" && <span style={{ color: "var(--ink)" }}>,</span>}
    </div>
  );
}

export default function ApiPage() {
  const sbLinksRef = useRef<NodeListOf<Element> | null>(null);

  useEffect(() => {
    const links = document.querySelectorAll(".sb-link[data-section]");
    sbLinksRef.current = links;

    const sections = Array.from(links)
      .map((l) => l.getAttribute("data-section"))
      .filter(Boolean)
      .map((id) => document.getElementById(id!))
      .filter(Boolean) as HTMLElement[];

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) =>
              l.classList.toggle("api-sb-active", l.getAttribute("data-section") === e.target.id)
            );
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-root" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteNav />

      <style>{`
        .api-sb-active { color: var(--accent) !important; background: var(--accent-soft) !important; }
        .sb-link:hover { color: var(--ink) !important; background: var(--accent-soft) !important; }
        .api-json-bg { background: var(--surface-soft); }
        @media (max-width: 768px) { .api-sidebar { display: none !important; } .api-hero, .api-sec { padding-left: 20px !important; padding-right: 20px !important; } .api-cta { margin-left: 20px !important; margin-right: 20px !important; } .api-tier-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ display: "flex", flex: 1 }}>

        {/* Sidebar */}
        <nav className="api-sidebar" style={{
          position: "sticky", top: 48, height: "calc(100vh - 48px)", width: 224, flexShrink: 0,
          overflowY: "auto", background: "var(--surface)", borderRight: "1px solid var(--line)",
        }}>
          <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, color: "var(--ink-em)" }}>API Reference</div>
            <div style={{ display: "inline-block", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid rgba(74,232,160,0.28)", borderRadius: 4, padding: "2px 7px" }}>v1</div>
            <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--muted)", wordBreak: "break-all" }}>zettaai.co/api/v1</div>
          </div>
          <div style={{ padding: "10px 0 20px" }}>
            <SbGroup>Overview</SbGroup>
            <SbLink section="auth">Authentication</SbLink>
            <SbLink section="tiers">Access Tiers</SbLink>
            <SbLink section="rate">Rate Limits</SbLink>
            <SbLink section="errors">Error Codes</SbLink>

            <SbGroup>Wallet / Ledger</SbGroup>
            <SbLink section="ledger-summary" chip="GET">ledger-summary</SbLink>
            <SbLink section="transactions" chip="GET">transactions</SbLink>
            <SbLink section="full-report" chip="GET">full-report</SbLink>
            <SbLink section="categorize" chip="POST">categorize</SbLink>

            <SbGroup>Agent Financial</SbGroup>
            <SbLink section="agent-books" chip="GET">agent-books</SbLink>
            <SbLink section="agent-revenue" chip="GET">agent-revenue</SbLink>
            <SbLink section="agent-truth" chip="GET">agent-truth</SbLink>
            <SbLink section="agent-report" chip="GET">agent-report</SbLink>
            <SbLink section="economy" chip="GET">luca/economy</SbLink>

            <SbGroup>Guide</SbGroup>
            <SbLink section="quickstart">Quickstart</SbLink>
            <SbLink section="scoped-keys">Scoped Keys</SbLink>
          </div>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: 80 }}>

          {/* Hero */}
          <div className="api-hero" id="overview" style={{ padding: "44px 40px 32px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
              Developer Reference · v1
            </div>
            <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "var(--ink-em)", lineHeight: 1.2, marginBottom: 12 }}>
              Zetta API v1
            </h1>
            <p style={{ fontSize: "0.88rem", color: "var(--ink-mid)", lineHeight: 1.7, maxWidth: 520, marginBottom: 22 }}>
              Programmatic access to agent financial books, attributed revenue, on-chain classification,
              and Luca economic analysis. RESTful API with tier-based rate limits.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Base URL</span>
              <span style={{ color: "var(--ink-em)" }}>https://www.zettaai.co/api/v1</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
              <Link href="/access" style={{ padding: "8px 18px", background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>Get API Key →</Link>
              <Link href="/dashboard/keys" style={{ padding: "8px 18px", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>Manage Keys</Link>
              <Link href="/manifest" style={{ padding: "8px 18px", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>Manifest Spec</Link>
            </div>
          </div>

          {/* Authentication */}
          <div className="api-sec" id="auth" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Authentication</SectionLabel>
            <Card>
              {AUTH_ROWS.map((r) => (
                <div key={r.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr", padding: "10px 14px", borderBottom: "1px solid var(--line)", gap: 14, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{r.label}</span>
                  <span style={{ fontFamily: r.mono ? "var(--font-mono)" : "var(--font-sans)", fontSize: r.mono ? "0.74rem" : "0.76rem", color: "var(--ink-em)" }}>{r.value}</span>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", padding: "10px 14px", borderBottom: "1px solid var(--line)", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Scopes</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SCOPES.map((s) => (
                    <span key={s} style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", padding: "2px 7px", border: "1px solid var(--line)", borderRadius: 4, color: "var(--ink-mid)", background: "var(--surface-soft)" }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", padding: "10px 14px", gap: 14, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Note</span>
                <span style={{ fontSize: "0.74rem", color: "var(--ink-mid)", lineHeight: 1.6 }}>
                  Agent-scoped keys (<InlineCode>agent:your-slug</InlineCode>) can only query their own agent&apos;s data.
                  Global keys have read access to all public agent data. Create one in{" "}
                  <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>your key dashboard</Link>.
                </span>
              </div>
            </Card>
          </div>

          {/* Access Tiers */}
          <div className="api-sec" id="tiers" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Access Tiers</SectionLabel>
            <div className="api-tier-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              {(["free", "holder", "whale"] as LucaTier[]).map((tier) => (
                <div key={tier} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: TIER_COLORS[tier] }}>
                    {TIER_LABELS[tier]}
                  </span>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: TIER_COLORS[tier], margin: "8px 0 4px", lineHeight: 1 }}>
                    {TIER_LIMITS[tier].toLocaleString()}
                    <span style={{ fontSize: "0.68rem", fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>req/day</span>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{TIER_DESCS[tier]}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Tier determined by $LUCA balance verified via wallet signature. Link your wallet in the{" "}
              <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>Operators Dashboard</Link>.
            </p>
          </div>

          {/* Wallet Endpoints */}
          <div className="api-sec" id="ledger-summary" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Wallet / Ledger Endpoints</SectionLabel>
            <Card>
              <CardHead>
                <TH style={{ width: 60 }}>Method</TH>
                <TH style={{ flex: 1 }}>Endpoint · Description</TH>
                <TH>Params</TH>
              </CardHead>
              {WALLET_ENDPOINTS.map((ep, i) => (
                <div key={ep.id} id={ep.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: "12px 14px", padding: "10px 14px", borderBottom: i === WALLET_ENDPOINTS.length - 1 ? "none" : "1px solid var(--line)", alignItems: "center" }}>
                  <MethodBadge method={ep.method} />
                  <div>
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink-em)", display: "block", marginBottom: 3 }}>{ep.path}</code>
                    <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)" }}>{ep.desc}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{ep.params}</span>
                </div>
              ))}
            </Card>

            {/* Curl + JSON example */}
            <Card>
              <div style={{ padding: "7px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Example — ledger summary</span>
              </div>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", lineHeight: 1.7, color: "var(--ink)", padding: "14px 16px", margin: 0, overflowX: "auto" }}>{`curl "https://www.zettaai.co/api/v1/ledger-summary?wallet=0xabc…&range=30d" \\
  -H "Authorization: Bearer zt_live_…"`}</pre>
              <div style={{ padding: "7px 14px", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Response 200</span>
              </div>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", lineHeight: 1.7, padding: "14px 16px", margin: 0, overflowX: "auto", background: "var(--surface-soft)" }}>
                <JsonKV k="wallet"  v={`"0xabc…123"`}        type="str" />
                <JsonKV k="range"   v={`"30d"`}              type="str" />
                <JsonKV k="summary" v="{"                    type="bracket" noComma />
                <JsonKV k="total_income"      v="142380.50"  type="num" indent={1} />
                <JsonKV k="total_spend"       v="18200.00"   type="num" indent={1} />
                <JsonKV k="net_flow"          v="124180.50"  type="num" indent={1} />
                <JsonKV k="transaction_count" v="4821"       type="num" indent={1} />
                <JsonKV k="budget_status"     v={`"healthy"`} type="str" indent={1} noComma />
                <span style={{ color: "var(--ink)" }}>{"}"}</span>
              </pre>
            </Card>
          </div>

          {/* Agent Endpoints */}
          <div className="api-sec" id="agent-books" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Agent-Centric Endpoints</SectionLabel>
            <p style={{ fontSize: "0.76rem", color: "var(--ink-mid)", marginBottom: 14, lineHeight: 1.6 }}>
              Query financial data for a specific registered agent. Use an agent-scoped key to restrict access to your agent only, or an unscoped key for cross-agent access.
            </p>
            <Card>
              <CardHead>
                <TH style={{ width: 60 }}>Method</TH>
                <TH style={{ flex: 1 }}>Endpoint · Description</TH>
                <TH>Params</TH>
              </CardHead>
              {AGENT_ENDPOINTS.map((ep, i) => (
                <div key={ep.id} id={ep.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: "12px 14px", padding: "10px 14px", borderBottom: i === AGENT_ENDPOINTS.length - 1 ? "none" : "1px solid var(--line)", alignItems: "center" }}>
                  <MethodBadge method={ep.method} />
                  <div>
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink-em)", display: "block", marginBottom: 3 }}>{ep.path}</code>
                    <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)" }}>{ep.desc}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{ep.params}</span>
                </div>
              ))}
            </Card>

            {/* Quickstart */}
            <Card id="quickstart">
              <div style={{ padding: "7px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Quickstart — fetch agent books</span>
              </div>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", lineHeight: 1.7, color: "var(--ink)", padding: "14px 16px", margin: 0, overflowX: "auto" }}>{`curl "https://www.zettaai.co/api/v1/agent-books/bankr?range=30d" \\
  -H "Authorization: Bearer zt_live_…"`}</pre>
              <div style={{ padding: "7px 14px", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Response 200</span>
              </div>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", lineHeight: 1.7, padding: "14px 16px", margin: 0, overflowX: "auto", background: "var(--surface-soft)" }}>
                <JsonKV k="slug"      v={`"bankr"`}   type="str" />
                <JsonKV k="has_books" v="true"         type="bool" />
                <JsonKV k="summary"   v="{"            type="bracket" noComma />
                <JsonKV k="total_revenue"  v="142380.50"  type="num" indent={1} />
                <JsonKV k="total_expenses" v="18200.00"   type="num" indent={1} />
                <JsonKV k="net_flow"       v="124180.50"  type="num" indent={1} />
                <JsonKV k="tx_count"       v="4821"       type="num" indent={1} noComma />
                <span style={{ color: "var(--ink)" }}>{"}"}</span>
              </pre>
            </Card>
          </div>

          {/* Rate Limits */}
          <div className="api-sec" id="rate" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Rate Limits</SectionLabel>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)", gap: 12 }}>
                {["Plan", "Req / min", "Req / day", "Notes"].map((h) => <TH key={h}>{h}</TH>)}
              </div>
              {RATE_ROWS.map((r, i) => (
                <div key={r.plan} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "10px 14px", borderBottom: i === RATE_ROWS.length - 1 ? "none" : "1px solid var(--line)", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink-em)", fontWeight: 600 }}>{r.plan}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: r.rpmColor }}>{r.rpm}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: r.dayColor }}>{r.day}</span>
                  <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)" }}>{r.note}</span>
                </div>
              ))}
            </Card>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Rate limit status in every response: <InlineCode>X-RateLimit-Remaining</InlineCode> · <InlineCode>X-RateLimit-Reset</InlineCode>
            </p>
          </div>

          {/* Error Codes */}
          <div className="api-sec" id="errors" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Error Codes</SectionLabel>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "56px 180px 1fr", padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface-soft)", gap: 14 }}>
                {["HTTP", "Code", "Meaning"].map((h) => <TH key={h}>{h}</TH>)}
              </div>
              {ERROR_ROWS.map((e, i) => (
                <div key={e.code} style={{ display: "grid", gridTemplateColumns: "56px 180px 1fr", padding: "10px 14px", borderBottom: i === ERROR_ROWS.length - 1 ? "none" : "1px solid var(--line)", gap: 14, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", fontWeight: 700, color: e.color }}>{e.status}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-em)" }}>{e.code}</span>
                  <span style={{ fontSize: "0.73rem", color: "var(--ink-mid)" }}>{e.desc}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Scoped Keys */}
          <div className="api-sec" id="scoped-keys" style={{ padding: "36px 40px 0" }}>
            <SectionLabel>Agent-Scoped Keys &amp; Manifest</SectionLabel>
            <Card style={{ padding: "18px 16px" }}>
              <p style={{ fontSize: "0.77rem", color: "var(--ink-mid)", lineHeight: 1.7, margin: "0 0 10px" }}>
                An agent-scoped key is a standard API key whose name follows the pattern{" "}
                <InlineCode>agent:your-slug</InlineCode>. The API enforces this key can only query data for that agent — any cross-agent request returns 403. Create one in{" "}
                <Link href="/dashboard/keys" style={{ color: "var(--accent)" }}>your key dashboard</Link>.
              </p>
              <p style={{ fontSize: "0.77rem", color: "var(--ink-mid)", lineHeight: 1.7, margin: 0 }}>
                To have your agent indexed on the registry, submit a wallet manifest at{" "}
                <Link href="/manifest" style={{ color: "var(--accent)" }}>/manifest</Link>.
                The manifest links your agent to its treasury and fee wallets, enabling financial attribution.
              </p>
            </Card>
          </div>

          {/* CTA */}
          <div className="api-cta" style={{ margin: "36px 40px 0", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 3 }}>Get your API key</p>
              <p style={{ fontSize: "0.74rem", color: "var(--ink-mid)" }}>Free tier: 500 requests / day. No credit card required.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/access" style={{ padding: "8px 18px", background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>Request Access →</Link>
              <Link href="/manifest" style={{ padding: "8px 18px", border: "1px solid var(--line)", color: "var(--ink)", fontSize: "0.8rem", borderRadius: 6, textDecoration: "none" }}>Manifest Spec</Link>
            </div>
          </div>

        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

function SbGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 18px 3px", fontFamily: "var(--font-mono)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
      {children}
    </div>
  );
}

function SbLink({ section, chip, children }: { section: string; chip?: string; children: React.ReactNode }) {
  const isGet = chip === "GET";
  return (
    <a
      href={`#${section}`}
      data-section={section}
      className="sb-link"
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 18px", fontSize: "0.76rem", color: "var(--ink-mid)", textDecoration: "none", transition: "color 0.1s, background 0.1s" }}
    >
      {chip && (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.54rem", fontWeight: 700,
          padding: "1px 5px", borderRadius: 3, flexShrink: 0,
          background: isGet ? "var(--accent-soft)" : "rgba(59,110,168,0.12)",
          color: isGet ? "var(--accent)" : "var(--blue)",
        }}>{chip}</span>
      )}
      {children}
    </a>
  );
}

function JsonKV({ k, v, type, indent = 0, noComma = false }: { k: string; v: string; type: "str" | "num" | "bool" | "bracket"; indent?: number; noComma?: boolean }) {
  const colors: Record<string, string> = {
    str: "var(--json-str, #0A6640)", num: "var(--json-num, #9A3412)", bool: "var(--json-bool, #1CB870)", bracket: "var(--ink)",
  };
  return (
    <div style={{ paddingLeft: indent * 16 }}>
      <span style={{ color: "var(--json-key, #0550AE)" }}>&quot;{k}&quot;</span>
      <span style={{ color: "var(--ink)" }}>: </span>
      <span style={{ color: colors[type] }}>{v}</span>
      {!noComma && <span style={{ color: "var(--ink)" }}>,</span>}
    </div>
  );
}
