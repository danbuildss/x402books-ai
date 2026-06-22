import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Manifest Spec v1.0 · Zetta",
  description: "Full schema reference for .agent/wallets.json — the open wallet declaration standard for autonomous agents.",
};

const code = { fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" } as const;
const muted = { color: "var(--muted)" } as const;

function Badge({ children, color = "var(--muted)" }: { children: string; color?: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `color-mix(in srgb, ${color} 14%, transparent)`, color, letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

export default function ManifestSpecPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "3.5rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", ...muted }}>
          <Link href="/" style={{ ...muted, textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/manifest" style={{ ...muted, textDecoration: "none" }}>.agent/wallets.json</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Spec</span>
        </nav>

        <div style={{ marginBottom: 40 }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", ...muted }}>
            Schema Reference — v1.0
          </p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px" }}>
            Manifest Spec v1.0
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.65, ...muted, margin: 0 }}>
            Complete schema for <code style={code}>.agent/wallets.json</code>.
            Place this file at <code style={code}>.agent/wallets.json</code> in the root of your agent&apos;s public repository.
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 48px" }} />

        {/* Annotated example */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Full example
          </h2>
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 600, ...muted, padding: "8px 20px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderBottom: "none", borderRadius: "8px 8px 0 0", letterSpacing: "0.04em" }}>
              .agent/wallets.json
            </div>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 0 8px 8px", padding: "20px 24px", overflowX: "auto", margin: 0, lineHeight: 1.7 }}>{`{
  "version": "1.0",
  "agent": "AEON",
  "project": "AEON Protocol",
  "ecosystem": "Base",
  "website": "https://aeon.xyz",
  "x": "@aeonxyz",
  "did": "did:erc8004:8453:12345",
  "wallets": [
    {
      "address": "0xAbCd...1234",
      "chain": "base",
      "role": "treasury",
      "verification_method": "repo_manifest",
      "label": "Primary operating treasury",
      "notes": "Holds USDC operating reserves.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0xEfGh...5678",
      "chain": "base",
      "role": "payment_receiver",
      "verification_method": "repo_manifest",
      "label": "API revenue collection",
      "active": true,
      "last_updated": "2026-06-22"
    }
  ]
}`}</pre>
          </div>
        </section>

        {/* Root fields */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 20px" }}>
            Root fields
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Field", "Type", "Required", "Description"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.06em", ...muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { field: "version",   type: "string",  req: "Recommended", desc: `Schema version. Use "1.0". Omitting means v0 (pre-standard).` },
                  { field: "agent",     type: "string",  req: "Required",     desc: "Canonical agent name — must match the registry entry." },
                  { field: "project",   type: "string",  req: "Recommended", desc: "Project or organization name." },
                  { field: "ecosystem", type: "string",  req: "Recommended", desc: "Primary chain ecosystem (Base, AEON, Virtuals, EigenCloud, etc.)." },
                  { field: "website",   type: "URL",     req: "Optional",    desc: "Agent or project website URL." },
                  { field: "x",         type: "string",  req: "Optional",    desc: "X/Twitter handle (with or without @)." },
                  { field: "did",       type: "string",  req: "Optional",    desc: "Decentralized identity. Format: did:<method>:<id>. ERC-8004 example: did:erc8004:8453:22945." },
                  { field: "wallets",   type: "array",   req: "Required",     desc: "Array of wallet declarations. Min 1." },
                ].map((r, i) => (
                  <tr key={r.field} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{r.field}</td>
                    <td style={{ padding: "10px 12px", ...muted }}>{r.type}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <Badge color={r.req === "Required" ? "var(--accent)" : r.req === "Recommended" ? "#6DB874" : "var(--muted)"}>{r.req}</Badge>
                    </td>
                    <td style={{ padding: "10px 12px", ...muted, fontSize: "0.79rem" }}>{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Wallet entry fields */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 20px" }}>
            Wallet entry fields
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Field", "Type", "Required", "Description"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.06em", ...muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { field: "address",             type: "string",  req: "Required",    desc: "EVM wallet address. Must be 0x + 40 hex characters." },
                  { field: "chain",               type: "string",  req: "Required",    desc: "Chain this address operates on. See chain enum below." },
                  { field: "role",                type: "string",  req: "Required",    desc: "Wallet role. See role table below." },
                  { field: "verification_method", type: "string",  req: "Recommended", desc: "How ownership is proven. Default: repo_manifest. See methods below." },
                  { field: "label",               type: "string",  req: "Optional",    desc: "Human-readable label, e.g. \"Primary treasury\"." },
                  { field: "notes",               type: "string",  req: "Optional",    desc: "Freeform notes for context." },
                  { field: "active",              type: "boolean", req: "Optional",    desc: "Whether this wallet is currently operational. Default: true." },
                  { field: "last_updated",        type: "string",  req: "Optional",    desc: "ISO date (YYYY-MM-DD) when this entry was last updated." },
                ].map((r, i) => (
                  <tr key={r.field} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{r.field}</td>
                    <td style={{ padding: "10px 12px", ...muted }}>{r.type}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <Badge color={r.req === "Required" ? "var(--accent)" : r.req === "Recommended" ? "#6DB874" : "var(--muted)"}>{r.req}</Badge>
                    </td>
                    <td style={{ padding: "10px 12px", ...muted, fontSize: "0.79rem" }}>{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Wallet roles */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 8px" }}>
            Wallet roles
          </h2>
          <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 20px", lineHeight: 1.6 }}>
            Use the most specific role that applies. Roles determine how Zetta classifies on-chain flows when building financial books.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Role", "Financial class", "Description"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.06em", ...muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { role: "treasury",            cls: "Asset",    desc: "Primary treasury. Holds operating capital and reserves." },
                  { role: "revenue",             cls: "Inflow",   desc: "Revenue collection wallet. All inflows classified as income." },
                  { role: "fee_recipient",       cls: "Inflow",   desc: "Protocol fees and revenue share. Inflows classified as fee income." },
                  { role: "payment_receiver",    cls: "Inflow",   desc: "API payments and per-call settlement. Inflows classified as service revenue." },
                  { role: "expense",             cls: "Outflow",  desc: "Operational expense wallet. Outflows classified as operating costs." },
                  { role: "operator",            cls: "Outflow",  desc: "Hot wallet for day-to-day execution. Outflows classified as operational spend." },
                  { role: "deployer",            cls: "Neutral",  desc: "Contract deployer. Historical only — excluded from ongoing P&L." },
                  { role: "token_contract",      cls: "Contract", desc: "ERC-20 token contract address. Excluded from treasury calculations." },
                  { role: "token_bound_account", cls: "Asset",    desc: "ERC-6551 token-bound account. Tracked as agent-controlled asset." },
                  { role: "unknown",             cls: "Pending",  desc: "Role unclear. Declared for attribution; classification deferred." },
                ].map((r, i) => {
                  const clsColor: Record<string, string> = { Asset: "#6DB874", Inflow: "var(--accent)", Outflow: "#F97316", Neutral: "var(--muted)", Contract: "#8B5CF6", Pending: "var(--muted)" };
                  return (
                    <tr key={r.role} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{r.role}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}><Badge color={clsColor[r.cls] ?? "var(--muted)"}>{r.cls}</Badge></td>
                      <td style={{ padding: "10px 12px", ...muted, fontSize: "0.79rem" }}>{r.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Chain enum */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Chain values
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["base", "ethereum", "arbitrum", "optimism", "polygon", "solana", "avalanche", "bnb", "zora", "blast", "linea", "scroll", "mode", "other"].map((c) => (
              <code key={c} style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 5, padding: "3px 9px", color: c === "base" ? "var(--accent)" : "var(--ink)" }}>{c}</code>
            ))}
          </div>
          <p style={{ fontSize: "0.78rem", ...muted, marginTop: 10 }}>
            Use <code style={code}>other</code> for any chain not listed. Zetta currently indexes activity on Base.
            Multi-chain agents should declare all active wallets with their respective chains.
          </p>
        </section>

        {/* Verification methods */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 20px" }}>
            Verification methods
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Method", "Trust level", "How it works"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.06em", ...muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { method: "repo_manifest",      trust: "Baseline", how: "File exists in a public repo (GitHub or Gitlawb). Default." },
                  { method: "on_chain_signature",  trust: "High",     how: "Wallet signed a known message proving ownership." },
                  { method: "multisig_ownership",  trust: "High",     how: "Wallet appears in a multisig owner list." },
                  { method: "dns_record",          trust: "Medium",   how: "DNS TXT record links domain to wallet address." },
                  { method: "social_post",         trust: "Low",      how: "Social media post declares wallet ownership." },
                ].map((r, i) => {
                  const trustColor: Record<string, string> = { Baseline: "var(--muted)", High: "#6DB874", Medium: "#F97316", Low: "var(--muted)" };
                  return (
                    <tr key={r.method} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{r.method}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}><Badge color={trustColor[r.trust]}>{r.trust}</Badge></td>
                      <td style={{ padding: "10px 12px", ...muted, fontSize: "0.79rem" }}>{r.how}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Validation rules */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Validation rules
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "address must match /^0x[a-fA-F0-9]{40}$/ — 0x + 40 hex chars",
              "wallets[] must contain at least one entry",
              "chain must be one of the valid chain values",
              "role must be one of the valid role values",
              "verification_method if present must be a valid method",
              "last_updated if present must be YYYY-MM-DD",
              "active if present must be a boolean",
              "website if present must be a valid URL",
              "x if present must match /^@?[A-Za-z0-9_]{1,50}$/",
              "did if present must match /^did:[a-z]+:.+$/",
              "File size max 50KB",
            ].map((rule) => (
              <div key={rule} style={{ display: "flex", gap: 10, fontSize: "0.82rem" }}>
                <span style={{ color: "#6DB874", flexShrink: 0, marginTop: 1 }}>✓</span>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", ...muted }}>{rule}</code>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.82rem", ...muted, marginTop: 16 }}>
            Run these checks instantly at{" "}
            <Link href="/validate" style={{ color: "var(--accent)" }}>/validate</Link>{" "}
            or via the API endpoint <code style={code}>POST /api/validate-manifest</code>.
          </p>
        </section>

        {/* API endpoint */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Validate via API
          </h2>
          <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
            Stateless endpoint — no auth, no DB write. Returns validation errors if any.
          </p>
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px", overflowX: "auto", margin: "0 0 16px", lineHeight: 1.65 }}>{`# Validate a manifest file
curl -s -X POST https://zetta.xyz/api/validate-manifest \\
  -H "Content-Type: application/json" \\
  -d @.agent/wallets.json | jq .

# GitHub Actions CI check
- name: Validate manifest
  run: |
    curl -s -X POST https://zetta.xyz/api/validate-manifest \\
      -H "Content-Type: application/json" \\
      -d @.agent/wallets.json | jq -e '.ok == true'`}</pre>
          <p style={{ fontSize: "0.78rem", ...muted, margin: 0 }}>
            Returns <code style={code}>{`{ ok: true, summary: { ... } }`}</code> on valid manifests,{" "}
            <code style={code}>{`{ ok: false, errors: [...] }`}</code> with a 422 on invalid ones.
          </p>
        </section>

        {/* Nav footer */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: "0.82rem" }}>
          <Link href="/manifest" style={{ color: "var(--accent)", textDecoration: "none" }}>← Overview</Link>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/manifest/examples" style={{ color: "var(--accent)", textDecoration: "none" }}>Examples →</Link>
            <Link href="/validate" style={{ color: "var(--accent)", textDecoration: "none" }}>Validate →</Link>
          </div>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
