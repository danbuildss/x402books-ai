import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LedgerCard, SectionLabel } from "@/components/ui/ledger";

export const metadata = {
  title: "Manifest Examples · Zetta",
  description: "Example .agent/wallets.json manifests by agent type — trading agents, inference APIs, DeFi protocols, and token agents.",
};

const code = { fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" } as const;
const muted = { color: "var(--muted)" } as const;

function CodeBlock({ filename, children }: { filename: string; children: string }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 600, ...muted, padding: "7px 18px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderBottom: "none", borderRadius: "7px 7px 0 0", letterSpacing: "0.04em" }}>
        {filename}
      </div>
      <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.79rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 0 7px 7px", padding: "18px 20px", overflowX: "auto", margin: 0, lineHeight: 1.7 }}>
        {children}
      </pre>
    </div>
  );
}

export default function ManifestExamplesPage() {
  return (
    <div className="lp-root">
      <SiteNav />

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "3.5rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", ...muted }}>
          <Link href="/" style={{ ...muted, textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/manifest" style={{ ...muted, textDecoration: "none" }}>.agent/wallets.json</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Examples</span>
        </nav>

        <div style={{ marginBottom: 40 }}>
          <SectionLabel style={{ marginBottom: 10 }}>Examples — v1.0</SectionLabel>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px" }}>
            Manifest Examples
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.65, ...muted, margin: 0 }}>
            Example manifests by agent type. Copy the one closest to your architecture and adapt.
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 48px" }} />

        {/* Quick nav */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48 }}>
          {[
            { label: "Trading agent", href: "#trading" },
            { label: "Inference API", href: "#inference" },
            { label: "DeFi protocol", href: "#defi" },
            { label: "Token agent", href: "#token" },
            { label: "ERC-8004 agent", href: "#erc8004" },
          ].map((l) => (
            <a key={l.href} href={l.href} style={{ fontSize: "0.8rem", padding: "5px 12px", border: "1px solid var(--line)", borderRadius: 20, color: "var(--muted)", textDecoration: "none", background: "var(--surface)" }}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Trading agent */}
        <section id="trading" style={{ marginBottom: 40 }}>
          <LedgerCard title="Trading agent" eyebrow="Example 1">
            <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
              An agent that executes on-chain trades and earns revenue from trading fees or performance.
              Treasury holds capital, revenue wallet collects fees, expense wallet pays gas and protocol costs.
            </p>
            <CodeBlock filename=".agent/wallets.json">{`{
  "version": "1.0",
  "agent": "AlphaTrader",
  "project": "AlphaTrader Protocol",
  "ecosystem": "Base",
  "website": "https://alphatrader.xyz",
  "x": "@AlphaTraderXYZ",
  "wallets": [
    {
      "address": "0x1111111111111111111111111111111111111111",
      "chain": "base",
      "role": "treasury",
      "verification_method": "repo_manifest",
      "label": "Primary trading capital",
      "notes": "Holds USDC and WETH reserves for active positions.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x2222222222222222222222222222222222222222",
      "chain": "base",
      "role": "fee_recipient",
      "verification_method": "repo_manifest",
      "label": "Performance fee collection",
      "notes": "Collects 1% performance fee on profitable trades.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x3333333333333333333333333333333333333333",
      "chain": "base",
      "role": "expense",
      "verification_method": "repo_manifest",
      "label": "Gas and protocol cost wallet",
      "notes": "Pays gas fees and DEX protocol fees.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x4444444444444444444444444444444444444444",
      "chain": "base",
      "role": "deployer",
      "verification_method": "repo_manifest",
      "label": "Contract deployer",
      "active": false,
      "last_updated": "2026-01-15"
    }
  ]
}`}</CodeBlock>
          </LedgerCard>
        </section>

        {/* Inference API */}
        <section id="inference" style={{ marginBottom: 40 }}>
          <LedgerCard title="Inference API agent" eyebrow="Example 2">
            <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
              An agent that sells inference (compute, AI responses) via x402 pay-per-call.
              Revenue flows in to the payment receiver, expenses flow out for compute costs.
              This is the simplest case — one inflow wallet, one outflow wallet.
            </p>
            <CodeBlock filename=".agent/wallets.json">{`{
  "version": "1.0",
  "agent": "InferenceAgent",
  "project": "InferenceAgent",
  "ecosystem": "Base",
  "website": "https://inferenceagent.xyz",
  "wallets": [
    {
      "address": "0x5555555555555555555555555555555555555555",
      "chain": "base",
      "role": "payment_receiver",
      "verification_method": "repo_manifest",
      "label": "x402 payment receiver",
      "notes": "Receives per-call USDC payments via x402 protocol.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x6666666666666666666666666666666666666666",
      "chain": "base",
      "role": "expense",
      "verification_method": "repo_manifest",
      "label": "Compute cost wallet",
      "notes": "Pays Surplus and other inference providers.",
      "active": true,
      "last_updated": "2026-06-22"
    }
  ]
}`}</CodeBlock>
          </LedgerCard>
        </section>

        {/* DeFi protocol */}
        <section id="defi" style={{ marginBottom: 40 }}>
          <LedgerCard title="DeFi protocol agent" eyebrow="Example 3">
            <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
              A protocol with a fee switch, treasury, and token contract. The deployer is inactive
              (historical reference). Token contract is declared separately from treasury.
              Fee revenue flows through a dedicated recipient wallet.
            </p>
            <CodeBlock filename=".agent/wallets.json">{`{
  "version": "1.0",
  "agent": "LiquidityProtocol",
  "project": "Liquidity Protocol",
  "ecosystem": "Base",
  "website": "https://liquidityprotocol.xyz",
  "x": "@LiquidityProto",
  "wallets": [
    {
      "address": "0x7777777777777777777777777777777777777777",
      "chain": "base",
      "role": "treasury",
      "verification_method": "repo_manifest",
      "label": "Protocol treasury",
      "notes": "DAO-controlled treasury. Multisig 3-of-5.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x8888888888888888888888888888888888888888",
      "chain": "base",
      "role": "fee_recipient",
      "verification_method": "repo_manifest",
      "label": "Protocol fee receiver",
      "notes": "Collects 0.05% swap fees before distribution to LPs.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x9999999999999999999999999999999999999999",
      "chain": "base",
      "role": "token_contract",
      "verification_method": "repo_manifest",
      "label": "PROTO token contract",
      "notes": "ERC-20 governance token.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "chain": "base",
      "role": "deployer",
      "verification_method": "repo_manifest",
      "label": "Protocol deployer EOA",
      "active": false,
      "last_updated": "2025-03-01"
    }
  ]
}`}</CodeBlock>
          </LedgerCard>
        </section>

        {/* Token agent (Bankr / Virtuals style) */}
        <section id="token" style={{ marginBottom: 40 }}>
          <LedgerCard title="Token agent (Bankr / Virtuals)" eyebrow="Example 4">
            <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
              An AI agent with a meme/utility token issued via Bankr or Virtuals. Treasury holds operating capital,
              the token contract is declared for transparency, and a token-bound account (ERC-6551)
              is used for agent-controlled assets.
            </p>
            <CodeBlock filename=".agent/wallets.json">{`{
  "version": "1.0",
  "agent": "BANKR Agent",
  "project": "BANKR Agent",
  "ecosystem": "BANKR",
  "website": "https://bankr.xyz/agent/bankr-agent",
  "x": "@BANKRagent",
  "wallets": [
    {
      "address": "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "chain": "base",
      "role": "treasury",
      "verification_method": "repo_manifest",
      "label": "Agent treasury",
      "notes": "Operating capital. Funded by token bonding curve.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      "chain": "base",
      "role": "revenue",
      "verification_method": "repo_manifest",
      "label": "Service revenue wallet",
      "notes": "Collects revenue from agent services and API calls.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
      "chain": "base",
      "role": "token_contract",
      "verification_method": "repo_manifest",
      "label": "Agent token contract",
      "notes": "ERC-20 issued on Bankr.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
      "chain": "base",
      "role": "token_bound_account",
      "verification_method": "repo_manifest",
      "label": "ERC-6551 token-bound account",
      "notes": "Controlled by the agent NFT via ERC-6551.",
      "active": true,
      "last_updated": "2026-06-22"
    }
  ]
}`}</CodeBlock>
          </LedgerCard>
        </section>

        {/* ERC-8004 agent */}
        <section id="erc8004" style={{ marginBottom: 40 }}>
          <LedgerCard title="ERC-8004 agent" eyebrow="Example 5">
            <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
              An agent registered in the ERC-8004 on-chain agent registry. The <code style={code}>did</code> field
              anchors the manifest to the on-chain identity. All other fields follow the same pattern
              as the examples above.
            </p>
            <CodeBlock filename=".agent/wallets.json">{`{
  "version": "1.0",
  "agent": "pawr",
  "project": "pawr.link",
  "ecosystem": "Base",
  "website": "https://pawr.link",
  "x": "@pawrlink",
  "did": "did:erc8004:8453:22945",
  "wallets": [
    {
      "address": "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      "chain": "base",
      "role": "revenue",
      "verification_method": "repo_manifest",
      "label": "Service revenue",
      "notes": "Link-in-bio subscription revenue.",
      "active": true,
      "last_updated": "2026-06-22"
    },
    {
      "address": "0x1111111111111111111111111111111111111112",
      "chain": "base",
      "role": "expense",
      "verification_method": "repo_manifest",
      "label": "Cron execution costs",
      "notes": "Pays for 22 daily cron jobs running on Bankr.",
      "active": true,
      "last_updated": "2026-06-22"
    }
  ]
}`}</CodeBlock>
            <p style={{ fontSize: "0.82rem", ...muted, margin: "14px 0 0" }}>
              The <code style={code}>did</code> field connects the off-chain declaration to an on-chain identity anchor.
              ERC-8004 integration is coming — agents that declare their DID now will be automatically linked
              when ERC-8004 ingestion ships.
            </p>
          </LedgerCard>
        </section>

        {/* Nav footer */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: "0.82rem" }}>
          <Link href="/manifest/spec" style={{ color: "var(--accent)", textDecoration: "none" }}>← Spec</Link>
          <Link href="/manifest/migration" style={{ color: "var(--accent)", textDecoration: "none" }}>Migration →</Link>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
