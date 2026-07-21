import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

export const metadata = {
  title: "Financial Methodology · Zetta",
  description: "How Zetta classifies revenue, builds agent financial statements, and scores confidence. Revenue Classification v2.",
};

export default function MethodologyPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/leaderboard" style={{ color: "var(--muted)", textDecoration: "none" }}>Leaderboard</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Methodology</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <SectionLabel style={{ marginBottom: 10 }}>Financial Methodology — v2</SectionLabel>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, lineHeight: 1.15 }}>
            How Zetta Builds Agent Financial Statements
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.93rem", lineHeight: 1.7, maxWidth: 580 }}>
            Revenue figures are only meaningful if the classification behind them is defensible.
            This page documents what counts, what is excluded, and how confident we are in every number we show.
          </p>
          <Callout variant="update" style={{ marginTop: 20 }}>
            <strong>June 2026 — Revenue Classification v2.</strong>{" "}
            We updated our methodology to quarantine capital injections, bridge transfers, token distributions,
            and grant inflows from operating revenue. All headline figures now reflect operating revenue only.
            Quarantined amounts are visible in admin views but excluded from public aggregates.
          </Callout>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Section: The fundamental rule */}
          <LedgerCard title="0. The fundamental rule">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                We only show numbers we can defend. When we cannot classify a transaction with confidence,
                we quarantine it — we do not count it as revenue and we do not hide it.
                Numbers shown publicly are <strong>conservative by design</strong>.
              </p>
              <p style={{ margin: 0 }}>
                Accuracy is more important than making the numbers look large.
              </p>
            </div>
          </LedgerCard>

          {/* Section: Attribution */}
          <LedgerCard title="1. Attribution — the prerequisite">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                An agent is <strong>attributed</strong> when its operator declares wallet addresses via a signed manifest
                (<code style={code}>.agent/wallets.json</code>) or the registry submission flow.
                Only attributed agents appear in Agent GDP and the leaderboard.
              </p>
              <p style={{ margin: 0 }}>
                Attribution is self-declared. Wallet ownership is not cryptographically verified on-chain.
                The declaring operator is responsible for the accuracy of their manifest.
                Zetta reviews manifests before approving inclusion.
              </p>
              <Callout>
                An agent with no declared wallets has zero economic visibility — its on-chain activity exists
                but cannot be read by Zetta.{" "}
                <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
              </Callout>
            </div>
          </LedgerCard>

          {/* Section: Revenue classification */}
          <LedgerCard title="2. Revenue classification (v2)">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                Not every inflow to a declared wallet is operating revenue. Zetta applies a
                layered classification filter before counting any inflow as revenue.
              </p>

              <div>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "0.83rem", color: "var(--ink)" }}>
                  What counts as operating revenue
                </p>
                <ul style={list}>
                  <li>Payment received from a third party (not an own wallet)</li>
                  <li>Not a swap, bridge transfer, or DEX interaction</li>
                  <li>Counterparty has prior interaction history, or amount is consistent with service-level payments</li>
                  <li>Stablecoin inflow below the capital injection threshold from a known counterparty</li>
                </ul>
              </div>

              <div>
                <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "0.83rem", color: "var(--ink)" }}>
                  What is quarantined (removed from headline revenue)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { label: "Capital injections", body: "Single inflows exceeding $10,000 USD from a counterparty with fewer than 3 prior interactions are flagged as suspected capital injections. They are not counted as operating revenue. Fundraising, investor capital, and DAO treasury allocations fall into this category." },
                    { label: "Grant inflows", body: "Inflows from known ecosystem grant program addresses (Base Grants, OP Foundation, Virtuals treasury) are tagged as grants and removed from operating revenue." },
                    { label: "Token distributions", body: "Non-stablecoin inflows from counterparties with no prior relationship — consistent with airdrops, token launch distributions, and LP reward claims — are quarantined." },
                    { label: "Bridge receipts", body: "Inflows from bridge contracts (Across, Stargate, Hop, Wormhole, deBridge) represent cross-chain capital movement, not economic activity. Excluded from revenue." },
                  ].map((r, i, arr) => (
                    <div key={r.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)", borderBottom: i === arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.83rem", paddingTop: 1 }}>{r.label}</span>
                      <span>{r.body}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </LedgerCard>

          {/* Section: Exclusions */}
          <LedgerCard title="3. Hard exclusions (never in P&L)">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", padding: "4px 0" }}>
              {[
                { label: "Internal transfers", body: "Transfers between two wallets that both belong to the same agent are treasury movement. Excluded from both revenue and expenses. Tracked and reported separately." },
                { label: "Token swaps", body: "Any transaction where the same tx hash produces both an inflow and outflow is a token swap. Additionally, any transaction where the counterparty is a known DEX router (Uniswap v3, Aerodrome, 1inch, Odos, Paraswap, PancakeSwap) is excluded from P&L." },
                { label: "Bridge transfers (expenses)", body: "Outbound bridge transfers are not operating expenses — the capital continues to exist on another chain. Bridge contract outflows are removed from the expense ledger." },
                { label: "Token contracts", body: null },
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)", borderBottom: i === arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.83rem", paddingTop: 1 }}>{r.label}</span>
                  <span>
                    {r.label === "Token contracts"
                      ? <>Wallet addresses with the role <code style={code}>token_contract</code> or the agent&apos;s own token address are never scanned. Token contract interactions produce volume, not revenue.</>
                      : r.body}
                  </span>
                </div>
              ))}
            </div>
          </LedgerCard>

          {/* Section: Expenses */}
          <LedgerCard title="4. Expenses">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                Expenses are outflows from declared wallets to third-party addresses, after removing
                swaps, bridge transfers, and internal transfers.
              </p>
              <p style={{ margin: 0 }}>Expenses are classified by amount and counterparty pattern:</p>
              <ul style={list}>
                <li><strong>API Call</strong> — outflow &lt; $1 USD</li>
                <li><strong>Data Access</strong> — $1–$5, repeated counterparty (likely x402)</li>
                <li><strong>Subscription</strong> — $5–$25, repeated counterparty</li>
                <li><strong>Compute</strong> — &gt; $25</li>
              </ul>
              <Callout variant="neutral">
                If an agent pays expenses from a wallet not declared in their manifest, those expenses are
                invisible to Zetta. Incomplete manifests produce understated expenses and overstated margins.
                This is a known limitation — manifests should include all operational wallets.
              </Callout>
            </div>
          </LedgerCard>

          {/* Section: Treasury */}
          <LedgerCard title="5. Treasury and runway">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                Treasury balance is the live stablecoin balance (USDC + USDT) of all wallets declared
                with <code style={code}>role: &quot;treasury&quot;</code>. It is a point-in-time snapshot,
                not a time-averaged figure.
              </p>
              <p style={{ margin: 0 }}>Runway is computed as:</p>
              <div style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: "0.82rem", color: "var(--ink)" }}>
                runway_months = treasury_balance / 30d_expenses
              </div>
              <p style={{ margin: 0 }}>
                Both metrics are <code style={code}>null</code> if no wallet with <code style={code}>role: &quot;treasury&quot;</code> is
                declared. A missing treasury role does not mean the agent has no treasury — it means the wallet
                has not been declared with that role.
              </p>
            </div>
          </LedgerCard>

          {/* Section: GDP */}
          <LedgerCard title="6. Agent GDP">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                Agent GDP is the sum of <code style={code}>operating_revenue_usd</code> across all attributed agents
                for the trailing 30 days. This is operating revenue after quarantine — it excludes capital injections,
                grants, bridge receipts, and token distributions.
              </p>
              <Callout variant="neutral">
                Agent GDP is a lower bound. It reflects attributed agents only, and only operating revenue
                within those agents. The true agent economy is larger than what is visible here —
                attribution coverage and operating revenue classification are the constraints, not economic activity.
              </Callout>
            </div>
          </LedgerCard>

          {/* Section: Confidence */}
          <LedgerCard title="7. Confidence scoring">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
              <p style={{ margin: 0 }}>
                Every agent&apos;s books carry a per-metric confidence score. Confidence reflects
                the quality of the attribution and classification — not the quality of the agent&apos;s business.
              </p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  {
                    label: "High confidence",
                    variant: "green" as const,
                    body: "All wallets verified. Multiple wallet roles declared (treasury, fee, operator). No quarantined inflows. Attribution source is a signed manifest.",
                  },
                  {
                    label: "Medium confidence",
                    variant: "amber" as const,
                    body: "Wallets declared but not cryptographically verified. Single wallet only. Attribution source is registry submission.",
                  },
                  {
                    label: "Low confidence",
                    variant: "red" as const,
                    body: "Wallet confidence unset or unknown. No role metadata. No treasury wallet declared. Quarantined inflows present.",
                  },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)", borderBottom: i === arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <StatusBadge variant={r.variant}>{r.label}</StatusBadge>
                    </div>
                    <span>{r.body}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0 }}>
                Confidence scores are displayed on agent profiles and in the leaderboard.
                A low confidence score does not mean the agent is inactive — it means the financial
                data should be read as directional, not precise.
              </p>
            </div>
          </LedgerCard>

          {/* Section: Data freshness */}
          <LedgerCard title="8. Data freshness">
            <p style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", margin: "4px 0 0" }}>
              Agent books are cached for up to 4 hours. The refresh cycle runs every 4 hours.
              When a refresh runs, every attributed agent&apos;s books are recomputed from live on-chain
              data via Alchemy. The leaderboard displays a &quot;last updated&quot; timestamp.
            </p>
          </LedgerCard>

          {/* Section: Limitations */}
          <LedgerCard title="9. Known limitations">
            <div style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)", padding: "4px 0" }}>
              {[
                { label: "Base chain only", body: "Zetta currently scans Base mainnet only. Agents operating cross-chain cannot be fully attributed until multi-chain support is added." },
                { label: "Self-declaration", body: "Manifests are self-declared. Zetta reviews them before approval but does not perform cryptographic proof-of-ownership. Declared wallets are attributed, not proven." },
                { label: "Stablecoin pricing", body: "USDC and USDT are treated as $1.00. Non-stablecoin tokens are priced at Alchemy's available market price at scan time. Historical prices may differ from transaction-time prices." },
                { label: "Incomplete manifests", body: "An agent that controls 10 wallets but declares only 2 will show books for those 2 wallets. Revenue and expenses from undeclared wallets are invisible. Agents are responsible for the completeness of their manifests." },
                { label: "Bridge contract list", body: "The bridge exclusion list covers major Base bridges (Across, Stargate, Hop, Wormhole, deBridge, Base native bridge). Unknown or newer bridge contracts may not be excluded." },
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)", borderBottom: i === arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.83rem", paddingTop: 1 }}>{r.label}</span>
                  <span>{r.body}</span>
                </div>
              ))}
            </div>
          </LedgerCard>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/leaderboard" className="lp-btn-ghost">← Leaderboard</Link>
          <Link href="/registry#verify" className="lp-btn-primary">Submit a Manifest →</Link>
        </div>

        <p style={{ marginTop: 20, fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic" }}>
          Revenue Classification v2 — June 2026. All figures are derived from on-chain data only.
          No estimates. No synthetic values. Quarantined inflows are never hidden — they are excluded
          from headline revenue and visible to operators in their admin view.
        </p>

      </article>

      <SiteFooter />
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function Callout({
  children,
  variant = "accent",
  style,
}: {
  children: React.ReactNode;
  variant?: "accent" | "neutral" | "update";
  style?: React.CSSProperties;
}) {
  const bg =
    variant === "accent" ? "color-mix(in srgb, var(--accent) 6%, transparent)"
    : variant === "update" ? "color-mix(in srgb, #F4B942 8%, transparent)"
    : "var(--surface-soft)";
  const border =
    variant === "accent" ? "color-mix(in srgb, var(--accent) 20%, transparent)"
    : variant === "update" ? "color-mix(in srgb, #F4B942 30%, transparent)"
    : "var(--line)";
  return (
    <div style={{ padding: "12px 16px", borderRadius: 8, border: `1px solid ${border}`, background: bg, fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.65, ...style }}>
      {children}
    </div>
  );
}

const code: React.CSSProperties = {
  fontFamily: "monospace",
  background: "var(--line)",
  padding: "1px 5px",
  borderRadius: 3,
  fontSize: "0.82em",
  color: "var(--fg)",
};

const list: React.CSSProperties = {
  margin: "8px 0",
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
