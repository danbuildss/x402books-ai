import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Financial Methodology · x402Books",
  description: "How x402Books classifies revenue, builds agent financial statements, and scores confidence. Revenue Classification v2.",
};

export default function MethodologyPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>x402Books</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/leaderboard" style={{ color: "var(--muted)", textDecoration: "none" }}>Leaderboard</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Methodology</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            Financial Methodology — v2
          </p>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, lineHeight: 1.15 }}>
            How x402Books Builds Agent Financial Statements
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

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>

          {/* Section: The fundamental rule */}
          <Section title="0. The fundamental rule">
            <p>
              We only show numbers we can defend. When we cannot classify a transaction with confidence,
              we quarantine it — we do not count it as revenue and we do not hide it.
              Numbers shown publicly are <strong>conservative by design</strong>.
            </p>
            <p>
              Accuracy is more important than making the numbers look large.
            </p>
          </Section>

          {/* Section: Attribution */}
          <Section title="1. Attribution — the prerequisite">
            <p>
              An agent is <strong>attributed</strong> when its operator declares wallet addresses via a signed manifest
              (<code style={code}>.agent/wallets.json</code>) or the registry submission flow.
              Only attributed agents appear in Agent GDP and the leaderboard.
            </p>
            <p>
              Attribution is self-declared. Wallet ownership is not cryptographically verified on-chain.
              The declaring operator is responsible for the accuracy of their manifest.
              x402Books reviews manifests before approving inclusion.
            </p>
            <Callout>
              An agent with no declared wallets has zero economic visibility — its on-chain activity exists
              but cannot be read by x402Books.{" "}
              <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
            </Callout>
          </Section>

          {/* Section: Revenue classification */}
          <Section title="2. Revenue classification (v2)">
            <p>
              Not every inflow to a declared wallet is operating revenue. x402Books applies a
              layered classification filter before counting any inflow as revenue.
            </p>

            <h3 style={{ margin: "8px 0 4px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>
              What counts as operating revenue
            </h3>
            <ul style={list}>
              <li>Payment received from a third party (not an own wallet)</li>
              <li>Not a swap, bridge transfer, or DEX interaction</li>
              <li>Counterparty has prior interaction history, or amount is consistent with service-level payments</li>
              <li>Stablecoin inflow below the capital injection threshold from a known counterparty</li>
            </ul>

            <h3 style={{ margin: "8px 0 4px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>
              What is quarantined (removed from headline revenue)
            </h3>
            <Row label="Capital injections">
              Single inflows exceeding $10,000 USD from a counterparty with fewer than 3 prior interactions
              are flagged as suspected capital injections. They are not counted as operating revenue.
              Fundraising, investor capital, and DAO treasury allocations fall into this category.
            </Row>
            <Row label="Grant inflows">
              Inflows from known ecosystem grant program addresses (Base Grants, OP Foundation, Virtuals treasury)
              are tagged as grants and removed from operating revenue.
            </Row>
            <Row label="Token distributions">
              Non-stablecoin inflows from counterparties with no prior relationship — consistent with
              airdrops, token launch distributions, and LP reward claims — are quarantined.
            </Row>
            <Row label="Bridge receipts">
              Inflows from bridge contracts (Across, Stargate, Hop, Wormhole, deBridge) represent
              cross-chain capital movement, not economic activity. Excluded from revenue.
            </Row>
          </Section>

          {/* Section: Exclusions */}
          <Section title="3. Hard exclusions (never in P&L)">
            <Row label="Internal transfers">
              Transfers between two wallets that both belong to the same agent are treasury movement.
              Excluded from both revenue and expenses. Tracked and reported separately.
            </Row>
            <Row label="Token swaps">
              Any transaction where the same tx hash produces both an inflow and outflow is a token swap.
              Additionally, any transaction where the counterparty is a known DEX router (Uniswap v3,
              Aerodrome, 1inch, Odos, Paraswap, PancakeSwap) is excluded from P&L.
            </Row>
            <Row label="Bridge transfers (expenses)">
              Outbound bridge transfers are not operating expenses — the capital continues to exist on
              another chain. Bridge contract outflows are removed from the expense ledger.
            </Row>
            <Row label="Token contracts">
              Wallet addresses with the role <code style={code}>token_contract</code> or the agent&apos;s
              own token address are never scanned. Token contract interactions produce volume, not revenue.
            </Row>
          </Section>

          {/* Section: Expenses */}
          <Section title="4. Expenses">
            <p>
              Expenses are outflows from declared wallets to third-party addresses, after removing
              swaps, bridge transfers, and internal transfers.
            </p>
            <p>
              Expenses are classified by amount and counterparty pattern:
            </p>
            <ul style={list}>
              <li><strong>API Call</strong> — outflow &lt; $1 USD</li>
              <li><strong>Data Access</strong> — $1–$5, repeated counterparty (likely x402)</li>
              <li><strong>Subscription</strong> — $5–$25, repeated counterparty</li>
              <li><strong>Compute</strong> — &gt; $25</li>
            </ul>
            <Callout variant="neutral">
              If an agent pays expenses from a wallet not declared in their manifest, those expenses are
              invisible to x402Books. Incomplete manifests produce understated expenses and overstated margins.
              This is a known limitation — manifests should include all operational wallets.
            </Callout>
          </Section>

          {/* Section: Treasury */}
          <Section title="5. Treasury and runway">
            <p>
              Treasury balance is the live stablecoin balance (USDC + USDT) of all wallets declared
              with <code style={code}>role: "treasury"</code>. It is a point-in-time snapshot,
              not a time-averaged figure.
            </p>
            <p>
              Runway is computed as:
            </p>
            <div style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: "0.82rem", color: "var(--ink)" }}>
              runway_months = treasury_balance / 30d_expenses
            </div>
            <p style={{ marginTop: 12 }}>
              Both metrics are <code style={code}>null</code> if no wallet with <code style={code}>role: "treasury"</code> is
              declared. A missing treasury role does not mean the agent has no treasury — it means the wallet
              has not been declared with that role.
            </p>
          </Section>

          {/* Section: GDP */}
          <Section title="6. Agent GDP">
            <p>
              Agent GDP is the sum of <code style={code}>operating_revenue_usd</code> across all attributed agents
              for the trailing 30 days. This is operating revenue after quarantine — it excludes capital injections,
              grants, bridge receipts, and token distributions.
            </p>
            <Callout variant="neutral">
              Agent GDP is a lower bound. It reflects attributed agents only, and only operating revenue
              within those agents. The true agent economy is larger than what is visible here —
              attribution coverage and operating revenue classification are the constraints, not economic activity.
            </Callout>
          </Section>

          {/* Section: Confidence */}
          <Section title="7. Confidence scoring">
            <p>
              Every agent&apos;s books carry a per-metric confidence score. Confidence reflects
              the quality of the attribution and classification — not the quality of the agent&apos;s business.
            </p>
            <Row label="High confidence">
              All wallets verified. Multiple wallet roles declared (treasury, fee, operator).
              No quarantined inflows. Attribution source is a signed manifest.
            </Row>
            <Row label="Medium confidence">
              Wallets declared but not cryptographically verified. Single wallet only.
              Attribution source is registry submission.
            </Row>
            <Row label="Low confidence">
              Wallet confidence unset or unknown. No role metadata.
              No treasury wallet declared. Quarantined inflows present.
            </Row>
            <p>
              Confidence scores are displayed on agent profiles and in the leaderboard.
              A low confidence score does not mean the agent is inactive — it means the financial
              data should be read as directional, not precise.
            </p>
          </Section>

          {/* Section: Data freshness */}
          <Section title="8. Data freshness">
            <p>
              Agent books are cached for up to 4 hours. The refresh cycle runs every 4 hours.
              When a refresh runs, every attributed agent&apos;s books are recomputed from live on-chain
              data via Alchemy. The leaderboard displays a &quot;last updated&quot; timestamp.
            </p>
          </Section>

          {/* Section: Limitations */}
          <Section title="9. Known limitations">
            <Row label="Base chain only">
              x402Books currently scans Base mainnet only. Agents operating cross-chain cannot be
              fully attributed until multi-chain support is added.
            </Row>
            <Row label="Self-declaration">
              Manifests are self-declared. x402Books reviews them before approval but does not
              perform cryptographic proof-of-ownership. Declared wallets are attributed, not proven.
            </Row>
            <Row label="Stablecoin pricing">
              USDC and USDT are treated as $1.00. Non-stablecoin tokens are priced at Alchemy&apos;s
              available market price at scan time. Historical prices may differ from transaction-time prices.
            </Row>
            <Row label="Incomplete manifests">
              An agent that controls 10 wallets but declares only 2 will show books for those 2 wallets.
              Revenue and expenses from undeclared wallets are invisible. Agents are responsible for
              the completeness of their manifests.
            </Row>
            <Row label="Bridge contract list">
              The bridge exclusion list covers major Base bridges (Across, Stargate, Hop, Wormhole,
              deBridge, Base native bridge). Unknown or newer bridge contracts may not be excluded.
            </Row>
          </Section>

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

// ── Internal layout components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.88rem", lineHeight: 1.75, color: "var(--muted)" }}>
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
      <span style={{ fontWeight: 600, color: "var(--fg)", fontSize: "0.83rem", paddingTop: 1 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

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
    : variant === "update" ? "color-mix(in srgb, #F59E0B 8%, transparent)"
    : "var(--surface-soft)";
  const border =
    variant === "accent" ? "color-mix(in srgb, var(--accent) 20%, transparent)"
    : variant === "update" ? "color-mix(in srgb, #F59E0B 30%, transparent)"
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
