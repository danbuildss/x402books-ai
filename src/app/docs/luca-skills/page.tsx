"use client";

import { useState } from "react";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

const BASE_URL = "https://www.zettaai.co";

const SKILLS = [
  {
    id: "wallet-audit",
    name: "Wallet Audit",
    method: "POST",
    endpoint: "/api/luca/skills/wallet-audit",
    description: "Classify an on-chain address and determine its books-eligibility type. Returns address_type (eoa, token_contract, treasury_contract, etc.) and whether it is compatible with books attribution.",
    input: [
      { field: "address", type: "string", required: true,  desc: "0x Ethereum address to audit" },
      { field: "chain",   type: "string", required: false, desc: "Chain name. Default: base" },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/wallet-audit \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0xf1e958db7d1e4c074377946018ad645db4fb158e"}'`,
    example_response: `{
  "skill": "wallet-audit",
  "address": "0xf1e958db7d1e4c074377946018ad645db4fb158e",
  "chain": "base",
  "address_type": "eoa",
  "books_compatible": true,
  "books_note": "EOA wallet is books-eligible when manifest-declared"
}`,
  },
  {
    id: "agent-books",
    name: "Agent Books",
    method: "POST",
    endpoint: "/api/luca/skills/agent-books",
    description: "Full financial statement for a registered agent: revenue, expenses, net income, wallet count, and confidence signals. Only manifest-declared eoa and treasury_contract wallets are counted.",
    input: [
      { field: "slug",   type: "string", required: true,  desc: "Agent slug (e.g. 'aeon', 'luca')" },
      { field: "period", type: "string", required: false, desc: "Time window. One of: 7d, 14d, 30d, 90d. Default: 30d" },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/agent-books \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "aeon", "period": "30d"}'`,
    example_response: `{
  "skill": "agent-books",
  "agent": { "slug": "aeon", "name": "Aeon" },
  "attributed": true,
  "period": "30d",
  "wallets": ["0x..."],
  "financials": {
    "gross_inflow_usd": 4820.00,
    "revenue_usd": 3210.50,
    "expenses_usd": 1840.20,
    "net_income_usd": 1370.30,
    "margin_pct": 42.7
  }
}`,
  },
  {
    id: "treasury-monitor",
    name: "Treasury Monitor",
    method: "POST",
    endpoint: "/api/luca/skills/treasury-monitor",
    description: "Stablecoin balance and health of an agent's declared treasury wallets. Returns per-wallet USDC+USDT balances and an overall health signal (healthy/low/critical).",
    input: [
      { field: "slug",    type: "string", required: false, desc: "Agent slug. Required if address not provided." },
      { field: "address", type: "string", required: false, desc: "Single wallet address. Required if slug not provided." },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/treasury-monitor \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "aeon"}'`,
    example_response: `{
  "skill": "treasury-monitor",
  "agent": { "slug": "aeon", "name": "Aeon" },
  "wallets": [
    {
      "address": "0x...",
      "usdc_balance": 8420.00,
      "usdt_balance": 0,
      "total_stable_usd": 8420.00
    }
  ],
  "total_stable_balance_usd": 8420.00,
  "health": "healthy"
}`,
  },
  {
    id: "revenue-analysis",
    name: "Revenue Analysis",
    method: "POST",
    endpoint: "/api/luca/skills/revenue-analysis",
    description: "Revenue breakdown with the critical gross_inflow vs operating_revenue distinction. Shows quarantine breakdown, revenue recognition rate, and per-source attribution. gross_inflow_usd is NOT revenue.",
    input: [
      { field: "slug",   type: "string", required: true,  desc: "Agent slug" },
      { field: "period", type: "string", required: false, desc: "Time window. One of: 7d, 14d, 30d, 90d. Default: 30d" },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/revenue-analysis \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "aeon", "period": "30d"}'`,
    example_response: `{
  "skill": "revenue-analysis",
  "agent": { "slug": "aeon", "name": "Aeon" },
  "period": "30d",
  "attributed": true,
  "revenue": {
    "gross_inflow_usd": 4820.00,
    "operating_revenue_usd": 3210.50,
    "quarantined_inflows_usd": 1609.50,
    "revenue_recognition_rate_pct": 67,
    "gross_inflow_is_not_revenue": true,
    "note": "33% of gross inflows excluded (capital injections, DEX activity, or internal transfers)"
  }
}`,
  },
  {
    id: "registry-check",
    name: "Registry Check",
    method: "POST",
    endpoint: "/api/luca/skills/registry-check",
    description: "Look up an agent by slug, name, or wallet address. Returns attribution tier, books-eligible wallet count, ERC-8004 identity if available, and full wallet list with eligibility status.",
    input: [
      { field: "query", type: "string", required: true, desc: "Agent slug, name fragment, or 0x wallet address" },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/registry-check \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"query": "aeon"}'`,
    example_response: `{
  "skill": "registry-check",
  "found": true,
  "query": "aeon",
  "match_type": "slug",
  "agent": {
    "name": "Aeon",
    "slug": "aeon",
    "attribution_tier": "manifest_attributed",
    "books_eligible_wallets": 2,
    "total_wallets": 2,
    "erc8004_agent_id": null,
    "wallets": [
      {
        "address": "0x...",
        "books_eligible": true,
        "role": "treasury"
      }
    ]
  }
}`,
  },
  {
    id: "luca-report",
    name: "Luca Report",
    method: "POST",
    endpoint: "/api/luca/skills/luca-report",
    description: "Full composite report: registry identity, attribution tier, financial statement, treasury balance, and Luca's narrative summary. The single-call complete picture of an agent's financial identity.",
    input: [
      { field: "slug",   type: "string", required: true,  desc: "Agent slug" },
      { field: "period", type: "string", required: false, desc: "Time window. One of: 7d, 14d, 30d, 90d. Default: 30d" },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/luca-report \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "aeon", "period": "30d"}'`,
    example_response: `{
  "skill": "luca-report",
  "agent": { "name": "Aeon", "slug": "aeon", "ecosystem": "AEON" },
  "attribution": {
    "tier": "manifest_attributed",
    "books_eligible_wallets": 2,
    "source": "manifest"
  },
  "books": {
    "attributed": true,
    "financials": {
      "revenue_usd": 3210.50,
      "expenses_usd": 1840.20,
      "net_income_usd": 1370.30
    }
  },
  "treasury": {
    "total_stable_balance_usd": 8420.00,
    "health": "healthy"
  },
  "summary": "Aeon shows positive net income over 30d with healthy treasury coverage..."
}`,
  },
  {
    id: "b20-token-analysis",
    name: "B20 Token Analysis",
    method: "POST",
    endpoint: "/api/luca/skills/b20-token-analysis",
    description: "Analyse a B20 token on Base: identity, issuer wallet, linked agent, manifest status, mint/burn activity, and financial readiness. Token contracts are never books-eligible. Token transfers are not revenue.",
    input: [
      { field: "address",    type: "string", required: true,  desc: "Token contract address (0x...)" },
      { field: "agent_slug", type: "string", required: false, desc: "Optional agent slug to correlate" },
      { field: "period",     type: "string", required: false, desc: "Activity period. Default: 30d" },
    ],
    example_request: `curl -X POST https://www.zettaai.co/api/luca/skills/b20-token-analysis \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3"}'`,
    example_response: `{
  "skill": "b20-token-analysis",
  "token": {
    "address": "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3",
    "symbol": "LUCA",
    "name": "Luca Token",
    "books_eligible": false,
    "books_eligible_note": "Token contracts are never books-eligible"
  },
  "linked_agent": {
    "name": "Luca",
    "slug": "luca",
    "link_method": "known_token",
    "link_confidence": "confirmed"
  },
  "manifest_status": "attributed",
  "activity": {
    "mint_count": 12,
    "burn_count": 0
  },
  "luca_read": "LUCA token is confirmed as the registered token for the Luca agent..."
}`,
  },
];

const INTEGRITY_RULES = [
  { rule: "ERC-8004 = identity only", detail: "ERC-8004 agent IDs are used for discovery and identity — never for financial attribution" },
  { rule: "B20 = token intelligence only", detail: "Token contracts are never books-eligible. Token transfers are not operating revenue. B20 activity is excluded from Agent GDP" },
  { rule: ".agent/wallets.json = attribution", detail: "Only wallets declared in the manifest file produce financial attribution" },
  { rule: "Books-eligible types: eoa, treasury_contract", detail: "Smart contracts, proxy contracts, token contracts, and vaults are all excluded regardless of activity" },
  { rule: "Discovered wallets = not books", detail: "A wallet appearing on-chain does not make it books-eligible — manifest declaration is required" },
  { rule: "gross_inflow_usd ≠ revenue", detail: "Gross inflows include capital injections, DEX activity, and internal transfers. operating_revenue_usd is always the correct figure" },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ position: "relative", marginTop: 12 }}>
      <pre style={{
        background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8,
        padding: "14px 16px", fontSize: 12, fontFamily: "var(--font-mono)",
        overflowX: "auto", lineHeight: 1.7, margin: 0,
        color: "var(--ink)",
      }}>
        {code}
      </pre>
      <button
        onClick={copy}
        style={{
          position: "absolute", top: 8, right: 8, padding: "3px 10px",
          fontSize: 11, border: "1px solid var(--line)", borderRadius: 5,
          background: "var(--surface)", color: "var(--muted)", cursor: "pointer",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function LucaSkillsDocsPage() {
  const [activeSkill, setActiveSkill] = useState("wallet-audit");
  const [showBearer, setShowBearer] = useState(true);

  const skill = SKILLS.find((s) => s.id === activeSkill) ?? SKILLS[0];
  const exampleWithKey = showBearer
    ? skill.example_request
    : skill.example_request.replace('Authorization: Bearer zt_live_..."', 'X-API-Key: zt_live_..."');

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <HomeHeader />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "32px 24px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Luca · API Reference
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 10px" }}>Luca Skills</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px", maxWidth: 600, lineHeight: 1.6 }}>
            Callable financial intelligence for autonomous agents, builders, and operators.
            Seven skills. One API key. Strict data integrity across every response.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ padding: "6px 14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Base URL: </span>
              <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{BASE_URL}/api/luca/skills</code>
            </div>
            <div style={{ padding: "6px 14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Auth: </span>
              <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>Authorization: Bearer zt_live_...</code>
            </div>
            <Link href="/api" style={{ padding: "6px 14px", background: "#6DB874", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Get API Key →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }}>

        {/* Sidebar nav */}
        <div>
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Skills</div>
            {SKILLS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSkill(s.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", borderRadius: 6, marginBottom: 2,
                  border: "none", cursor: "pointer", fontSize: 13,
                  background: activeSkill === s.id ? "#6DB87420" : "transparent",
                  color: activeSkill === s.id ? "#6DB874" : "var(--ink)",
                  fontWeight: activeSkill === s.id ? 700 : 400,
                }}
              >
                {s.name}
              </button>
            ))}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Reference</div>
              <a href="#discovery" style={{ display: "block", padding: "6px 12px", fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Skill Discovery</a>
              <a href="#auth" style={{ display: "block", padding: "6px 12px", fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Authentication</a>
              <a href="#integrity" style={{ display: "block", padding: "6px 12px", fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Data Integrity</a>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div>

          {/* Skill detail */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                background: "#6DB87420", color: "#6DB874",
              }}>
                {skill.method}
              </span>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>
                {BASE_URL}{skill.endpoint}
              </code>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>{skill.name}</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.65 }}>{skill.description}</p>

            {/* Inputs */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Input Parameters</div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 80px 70px 1fr", padding: "6px 12px", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
                  {["Field", "Type", "Required", "Description"].map((h) => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                  ))}
                </div>
                {skill.input.map((inp) => (
                  <div key={inp.field} style={{ display: "grid", gridTemplateColumns: "140px 80px 70px 1fr", padding: "8px 12px", borderBottom: "1px solid var(--line)", fontSize: 12 }}>
                    <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{inp.field}</code>
                    <span style={{ color: "var(--muted)" }}>{inp.type}</span>
                    <span style={{ color: inp.required ? "#6DB874" : "var(--muted)" }}>{inp.required ? "Yes" : "No"}</span>
                    <span style={{ color: "var(--muted)", lineHeight: 1.4 }}>{inp.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth toggle + example */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Request</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["Bearer", "X-API-Key"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setShowBearer(m === "Bearer")}
                      style={{
                        padding: "3px 10px", fontSize: 11, borderRadius: 4,
                        border: "1px solid var(--line)", cursor: "pointer",
                        background: (m === "Bearer") === showBearer ? "var(--ink)" : "transparent",
                        color: (m === "Bearer") === showBearer ? "var(--bg)" : "var(--muted)",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <CodeBlock code={exampleWithKey} />
            </div>

            {/* Response */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Example Response</div>
              <CodeBlock code={skill.example_response} />
            </div>
          </div>

          {/* Skill nav pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 32 }}>
            {SKILLS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSkill(s.id)}
                style={{
                  padding: "5px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                  border: "1px solid var(--line)",
                  background: activeSkill === s.id ? "#6DB874" : "var(--surface)",
                  color: activeSkill === s.id ? "#fff" : "var(--ink)",
                  fontWeight: 600,
                }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Discovery */}
          <div id="discovery" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "24px 28px", marginBottom: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Skill Discovery</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.6 }}>
              Call the discovery endpoint to get the full manifest of all available skills — no auth required.
            </p>
            <CodeBlock code={`curl https://www.zettaai.co/api/luca/skills`} />
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>
              Returns version, all 7 skill definitions with inputs, and the data integrity block.
            </p>
          </div>

          {/* Auth */}
          <div id="auth" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "24px 28px", marginBottom: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Authentication</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
              All skill routes (POST) require an API key. Two formats are supported — use whichever fits your stack.
            </p>
            <CodeBlock code={`# Option 1 — Bearer token (recommended)
curl -X POST https://www.zettaai.co/api/luca/skills/agent-books \\
  -H "Authorization: Bearer zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "aeon"}'

# Option 2 — X-API-Key header
curl -X POST https://www.zettaai.co/api/luca/skills/agent-books \\
  -H "X-API-Key: zt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "aeon"}'`} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {[
                { tier: "Free", req: "Any API key", rpm: "100 req/day" },
                { tier: "LUCA Holder", req: "≥ 1,000 $LUCA", rpm: "500 req/day" },
                { tier: "LUCA Whale", req: "≥ 10,000 $LUCA", rpm: "2,000 req/day" },
              ].map((t) => (
                <div key={t.tier} style={{ padding: "10px 16px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, minWidth: 160 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{t.tier}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{t.req}</div>
                  <div style={{ fontSize: 11, color: "#6DB874", fontWeight: 600 }}>{t.rpm}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link href="/api" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                Get your API key →
              </Link>
            </div>
          </div>

          {/* Data Integrity */}
          <div id="integrity" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "3px solid #6DB874", borderRadius: 10, padding: "24px 28px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Data Integrity Rules</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
              Every skill enforces these rules on every response. They cannot be overridden.
            </p>
            {INTEGRITY_RULES.map((r) => (
              <div key={r.rule} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 14, color: "#6DB874", flexShrink: 0 }}>✓</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{r.rule}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{r.detail}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
