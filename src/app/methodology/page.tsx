import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Agent GDP Methodology · x402Books",
  description: "How x402Books computes Agent GDP, attributes revenue, and classifies on-chain activity.",
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
            Data Methodology
          </p>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, lineHeight: 1.15 }}>
            How Agent GDP is Computed
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.93rem", lineHeight: 1.7, maxWidth: 580 }}>
            Agent GDP is the sum of verified operational revenue across all attributed agents for the trailing 30 days.
            It is not token trading volume. It is not estimated. It is derived entirely from on-chain transactions
            at declared wallets — nothing more.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>

          {/* Section: Attribution */}
          <Section title="1. Attribution — the prerequisite">
            <p>
              An agent is <strong>attributed</strong> when its operator declares wallet addresses via a signed manifest
              (<code style={code}>.agent/wallets.json</code>). Only attributed agents appear in Agent GDP.
              An agent with no declared wallets has zero economic visibility — its on-chain activity exists
              but cannot be read.
            </p>
            <p>
              Attribution is self-declared. Wallet ownership is not cryptographically verified.
              The declaring party is responsible for the accuracy of their manifest.
              x402Books reviews manifests before approving them for inclusion.
            </p>
            <Callout>
              If an agent&apos;s operator has not submitted a manifest, the agent does not appear
              in the leaderboard, in Agent GDP, or in any economic aggregate.{" "}
              <Link href="/registry#verify" style={{ color: "var(--accent)" }}>Submit a manifest →</Link>
            </Callout>
          </Section>

          {/* Section: What is revenue */}
          <Section title="2. What counts as revenue">
            <p>
              Revenue is any <strong>inflow</strong> to a declared wallet that satisfies all of the following:
            </p>
            <ul style={list}>
              <li>The receiving wallet is declared in the agent&apos;s manifest</li>
              <li>The transaction is not a token swap (see swap exclusion below)</li>
              <li>The sender is not another declared wallet belonging to the same agent</li>
            </ul>
            <p>
              This means: payments received from third parties, protocol fees collected, service payments,
              and settlement inflows are counted as revenue. Treasury refills from other own wallets are not.
            </p>
          </Section>

          {/* Section: What is excluded */}
          <Section title="3. What is excluded">
            <Row label="Token swap volume">
              Any transaction where the same hash produces both an inflow and an outflow is classified
              as a token swap and excluded from both revenue and expenses. DeFi activity, liquidity provision,
              and trading are not operational finance.
            </Row>
            <Row label="Internal transfers">
              Transfers between two wallets that both belong to the same agent are treasury movement —
              capital reallocation, not revenue or spend. These are tracked but excluded from the P&L.
            </Row>
            <Row label="Undeclared wallets">
              Only wallets declared in the agent&apos;s manifest are scanned. Any wallet the agent controls
              but has not declared does not contribute to its books. Partial manifests produce partial books.
            </Row>
            <Row label="Token contracts">
              Wallet addresses with the role <code style={code}>token_contract</code> or <code style={code}>token</code>,
              and the agent&apos;s own token address, are never scanned. Token contract interactions
              produce volume, not operational revenue.
            </Row>
          </Section>

          {/* Section: What is expenses */}
          <Section title="4. What counts as expenses">
            <p>
              Expenses are any <strong>outflow</strong> from a declared wallet that satisfies all of the following:
            </p>
            <ul style={list}>
              <li>The sending wallet is declared in the agent&apos;s manifest</li>
              <li>The transaction is not a token swap</li>
              <li>The recipient is not another declared wallet belonging to the same agent</li>
            </ul>
            <p>
              Inference spend, protocol fees paid, operating costs, and third-party settlements are expenses.
            </p>
          </Section>

          {/* Section: GDP computation */}
          <Section title="5. Agent GDP computation">
            <p>
              Agent GDP (shown as &quot;Total Revenue&quot; on the leaderboard) is the arithmetic sum of
              <code style={code}>revenue_usd</code> across all attributed agents for the trailing 30-day window.
            </p>
            <p>
              The 30-day window is a rolling period ending at the time of the most recent data refresh.
              It is not a calendar month.
            </p>
            <Callout variant="neutral">
              Agent GDP reflects <em>attributed</em> agents only. Agents without declared manifests are
              excluded. The true agent economy is larger than what is visible here — attribution is the constraint,
              not activity.
            </Callout>
          </Section>

          {/* Section: Data freshness */}
          <Section title="6. Data freshness and refresh cycle">
            <p>
              Agent books are cached for up to 4 hours. The refresh cycle is triggered externally by Hermes
              on a recurring schedule. When a refresh runs, every attributed agent&apos;s books are recomputed
              from live on-chain data via Alchemy.
            </p>
            <p>
              The leaderboard and homepage display a &quot;last updated&quot; timestamp reflecting when
              Agent GDP was last computed. Data shown is never more than 4 hours old under normal operation.
            </p>
          </Section>

          {/* Section: Assumptions */}
          <Section title="7. Known assumptions and limitations">
            <Row label="Base chain only">
              x402Books currently scans Base mainnet only. Agents operating on Ethereum, Solana, or other
              chains cannot be attributed until multi-chain support is added.
            </Row>
            <Row label="USDC and stablecoin pricing">
              USD values are derived from stablecoin amounts (USDC, USDT) and ETH price at transaction time.
              Historical ETH pricing uses the value available at scan time and may differ slightly from
              the spot price at the moment of the original transaction.
            </Row>
            <Row label="Self-declaration risk">
              Because manifests are self-declared, an operator could theoretically declare a wallet they
              do not control. x402Books reviews manifests before approving them, but does not perform
              cryptographic proof-of-ownership verification. Trust the declared wallets accordingly.
            </Row>
            <Row label="Wallet ceiling">
              A maximum of 6 wallets per agent are scanned per refresh cycle. Agents with more than 6
              declared wallets will have the first 6 scanned.
            </Row>
          </Section>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/leaderboard" className="lp-btn-ghost">← Leaderboard</Link>
          <Link href="/registry#verify" className="lp-btn-primary">Submit a Manifest →</Link>
        </div>

        <p style={{ marginTop: 20, fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic" }}>
          Methodology reflects the current implementation. Changes are documented in the changelog.
          All figures are derived from on-chain data only — no estimates, no synthetic values.
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

function Callout({ children, variant = "accent" }: { children: React.ReactNode; variant?: "accent" | "neutral" }) {
  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: 8,
      border: `1px solid ${variant === "accent" ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--line)"}`,
      background: variant === "accent" ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "var(--surface-soft)",
      fontSize: "0.83rem",
      color: "var(--muted)",
      lineHeight: 1.65,
    }}>
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
