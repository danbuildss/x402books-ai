"use client";

import Link from "next/link";
import { useState } from "react";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/registry/agents",
    desc: "List all indexed agents with verification status and transparency scores.",
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  https://zetta.finance/api/v1/registry/agents`,
  },
  {
    method: "GET",
    path: "/api/v1/registry/agents/:slug",
    desc: "Full agent profile — wallets, score breakdown, settlement patterns.",
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  https://zetta.finance/api/v1/registry/agents/my-agent`,
  },
  {
    method: "POST",
    path: "/api/luca/skills/luca-report",
    desc: "Generate a Luca financial intelligence report for any indexed agent.",
    example: `curl -X POST -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"my-agent","period":"30d"}' \\
  https://zetta.finance/api/luca/skills/luca-report`,
  },
  {
    method: "GET",
    path: "/api/badge/:slug",
    desc: "Live SVG verification badge — embed in GitHub READMEs.",
    example: `![Zetta](https://zetta.finance/api/badge/my-agent)`,
  },
  {
    method: "POST",
    path: "/api/v1/luca/surplus/webhook",
    desc: "Surplus inference spend callback. Configure in your Surplus dashboard to record inference costs on your agent's Zetta profile automatically.",
    example: `# Set in Surplus dashboard:
# Webhook URL: https://zetta.finance/api/v1/luca/surplus/webhook
# Secret:      <SURPLUS_WEBHOOK_SECRET from your Zetta env>
#
# Surplus POSTs on each settled inference job:
curl -X POST \\
  -H "X-Surplus-Secret: YOUR_WEBHOOK_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"inference.completed","agent_id":"your-agent","model":"llama-3.3-70b","cost_usd":0.0012}' \\
  https://zetta.finance/api/v1/luca/surplus/webhook`,
  },
];

const TIERS = [
  { name: "Free",       rpm: "20",  daily: "500",   features: ["Registry read", "Badge embed", "Public profiles"] },
  { name: "Builder",    rpm: "120", daily: "5,000",  features: ["All Free", "Luca reports", "Books data"] },
  { name: "Pro",        rpm: "600", daily: "50,000", features: ["All Builder", "Batch endpoints", "Webhooks"] },
  { name: "Enterprise", rpm: "—",   daily: "—",      features: ["Custom limits", "SLA", "Priority support"] },
];

const STEPS = [
  { n: "1", title: "Get an API key", body: "Create a free key in your dashboard. No credit card needed for the Free tier." },
  { n: "2", title: "Add your manifest", body: "Place a .agent/wallets.json file in your agent's repo to declare financial identity. One file, instant indexing." },
  { n: "3", title: "Call the API", body: "Use your key in the X-API-Key header. All endpoints return JSON. SDKs are coming soon." },
  { n: "4", title: "Embed the badge", body: "Drop a single <img> tag anywhere. The badge auto-updates as your verification status changes." },
];

export default function DeveloperPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
          Developer Portal
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
          Build on Zetta
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 560, marginBottom: 24 }}>
          Financial identity infrastructure for autonomous agents. Index wallets,
          read settlement patterns, generate Luca reports, embed verification badges.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/keys" style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 9,
            background: "var(--accent)", color: "#fff",
            fontSize: "0.85rem", fontWeight: 700, textDecoration: "none",
          }}>
            Get API key →
          </Link>
          <Link href="/docs" style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 9,
            border: "1px solid var(--line)", color: "var(--ink)",
            fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
          }}>
            Full documentation
          </Link>
          <Link href="/docs/erc-8004" style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 9,
            border: "1px solid var(--line)", color: "var(--ink)",
            fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
          }}>
            ERC-8004 spec
          </Link>
        </div>
      </div>

      {/* Quick start */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>
          Quick start
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{
              padding: "18px 20px", borderRadius: 12,
              border: "1px solid var(--line)", background: "var(--surface)",
            }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--accent)", marginBottom: 6, letterSpacing: "0.05em" }}>
                STEP {s.n}
              </p>
              <p style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 6 }}>{s.title}</p>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API endpoints */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>
          Key endpoints
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ENDPOINTS.map((ep, i) => (
            <div key={i} style={{
              padding: "18px 20px", borderRadius: 12,
              border: "1px solid var(--line)", background: "var(--surface)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                  background: ep.method === "GET" ? "rgba(74,232,160,0.12)" : "rgba(99,102,241,0.12)",
                  color: ep.method === "GET" ? "#4AE8A0" : "#818cf8",
                  letterSpacing: "0.04em",
                }}>
                  {ep.method}
                </span>
                <code style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)" }}>{ep.path}</code>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: 10 }}>{ep.desc}</p>
              <div style={{ position: "relative" }}>
                <pre style={{
                  fontSize: "0.75rem", lineHeight: 1.6,
                  background: "var(--code-bg, rgba(0,0,0,0.04))", borderRadius: 8,
                  padding: "10px 14px", overflowX: "auto", margin: 0,
                  border: "1px solid var(--line)",
                }}>
                  <code>{ep.example}</code>
                </pre>
                <button
                  onClick={() => copy(ep.example, i)}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    padding: "3px 8px", borderRadius: 5,
                    border: "1px solid var(--line)", background: "var(--surface)",
                    fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
                    color: copiedIdx === i ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {copiedIdx === i ? "✓" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rate limit tiers */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>
          Rate limits
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Tier", "Req / min", "Req / day", "Features"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: "var(--muted)", fontSize: "0.72rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t, i) => (
                <tr key={t.name} style={{ borderBottom: i < TIERS.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>{t.name}</td>
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{t.rpm}</td>
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{t.daily}</td>
                  <td style={{ padding: "12px 14px", color: "var(--muted)" }}>{t.features.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 10 }}>
          Rate limits are per API key. Enterprise plans available — contact us on{" "}
          <a href="https://x.com/zettatracker" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>X</a>.
        </p>
      </section>

      {/* Footer links */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        {[
          { href: "/docs",           label: "Full docs" },
          { href: "/docs/erc-8004",  label: "ERC-8004 spec" },
          { href: "/dashboard/keys", label: "Manage API keys" },
          { href: "/registry",       label: "Browse registry" },
          { href: "/register",       label: "Register your agent" },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ fontSize: "0.82rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            {l.label} →
          </Link>
        ))}
      </div>
    </main>
  );
}
