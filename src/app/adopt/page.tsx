import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { getAttributionMetrics } from "@/lib/attribution-health";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

export const revalidate = 300;

const ECO_COLORS: Record<string, string> = {
  BANKR: "#4AE8A0",
  Virtuals: "#5B9EF4",
  AEON: "#8B7CF6",
  EigenCloud: "#F4B942",
  Base: "#5B9EF4",
};

const ADOPTERS = [
  {
    name: "Aeon",
    ecosystem: "AEON",
    slug: "aeon",
    walletCount: 2,
    manifestDeclared: true,
    note: "Execution and settlement layer. Treasury and deployer wallets declared via manifest.",
    xHandle: "@aeonframework",
  },
  {
    name: "Luca",
    ecosystem: "Base",
    slug: "luca",
    walletCount: 1,
    manifestDeclared: true,
    note: "Zetta's financial intelligence layer. Operational wallet declared via manifest.",
    xHandle: "@AskLucaAI",
  },
  {
    name: "Surplus",
    ecosystem: "Base",
    slug: null,
    walletCount: 0,
    manifestDeclared: false,
    note: "Inference routing layer. Manifest submission in progress.",
    xHandle: null,
  },
  {
    name: "Nipmod",
    ecosystem: "BANKR",
    slug: null,
    walletCount: 0,
    manifestDeclared: false,
    note: "BANKR ecosystem agent. Wallet declaration in progress.",
    xHandle: null,
  },
];

export default async function AdoptPage() {
  let manifestAdopters = 0;
  let walletsDeclared = 0;
  let coveragePct = 0;

  try {
    const metrics = await getAttributionMetrics();
    manifestAdopters = metrics.manifest_attributed_agents;
    walletsDeclared = metrics.books_eligible_wallets;
    coveragePct = metrics.attribution_coverage_pct;
  } catch {
    // defaults remain 0
  }

  const agentTarget = 25;
  const walletTarget = 100;
  const agentBarPct = Math.min((manifestAdopters / agentTarget) * 100, 100);
  const walletBarPct = Math.min((walletsDeclared / walletTarget) * 100, 100);

  return (
    <div className="lp-root">
      <HomeHeader />

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 32px" }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{
            display: "inline-block",
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#4AE8A0",
            border: "1px solid #4AE8A0",
            borderRadius: 4,
            padding: "3px 10px",
          }}>
            Manifest Adoption
          </span>
        </div>
        <h1 style={{
          margin: "12px 0 16px",
          fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          color: "var(--ink)",
        }}>
          Agents declaring financial identity.
        </h1>
        <p style={{
          margin: 0,
          fontSize: "1rem",
          color: "var(--muted)",
          lineHeight: 1.7,
          maxWidth: 660,
        }}>
          The Agent Wallet Manifest is the foundation of financial attribution. Every agent here has declared their wallets — making their books readable, their treasury verifiable, and their revenue auditable.
        </p>
      </section>

      {/* Live stats bar */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 32px" }}>
        <MetricGrid cols={4}>
          <MetricCard label="Manifest Adopters" value={String(manifestAdopters)} sub={`of ${agentTarget} target`} valueColor="#4AE8A0" />
          <MetricCard label="Wallets Declared"  value={String(walletsDeclared)}  sub={`of ${walletTarget} target`} valueColor="#4AE8A0" />
          <MetricCard label="Ecosystems"        value="5"                         sub="active" />
          <MetricCard label="Attribution Cover" value={coveragePct + "%"}         sub="of registry" valueColor="#5B9EF4" />
        </MetricGrid>
      </div>

      {/* KPI progress section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 40px" }}>
        <LedgerCard eyebrow="30-Day Adoption Goal">
          <LedgerRow
            first
            label="Agents with manifest"
            value={`${manifestAdopters} / ${agentTarget}`}
            valueStyle={{ color: "#4AE8A0" }}
            detail={
              <div style={{ height: 4, width: 80, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${agentBarPct}%`, background: "#4AE8A0", borderRadius: 99 }} />
              </div>
            }
          />
          <LedgerRow
            last
            label="Wallets declared"
            value={`${walletsDeclared} / ${walletTarget}`}
            valueStyle={{ color: "#4AE8A0" }}
            detail={
              <div style={{ height: 4, width: 80, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${walletBarPct}%`, background: "#4AE8A0", borderRadius: 99 }} />
              </div>
            }
          />
        </LedgerCard>
      </div>

      {/* Early adopters */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <LedgerCard eyebrow="Early Adopters">
          {ADOPTERS.map((adopter, i) => {
            const ecoColor = ECO_COLORS[adopter.ecosystem] ?? "#4AE8A0";
            return (
              <LedgerRow
                key={adopter.name}
                first={i === 0}
                last={i === ADOPTERS.length - 1}
                label={
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>{adopter.name}</span>
                      <span style={{
                        fontSize: "0.62rem", fontWeight: 600,
                        color: ecoColor, background: `${ecoColor}2E`,
                        borderRadius: 4, padding: "1px 7px",
                      }}>{adopter.ecosystem}</span>
                      {adopter.walletCount > 0 && (
                        <span style={{
                          fontSize: "0.62rem", color: "var(--muted)",
                          background: "var(--surface-soft)", border: "1px solid var(--line)",
                          borderRadius: 4, padding: "1px 7px",
                        }}>{adopter.walletCount}w</span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{adopter.note}</span>
                  </div>
                }
                value={adopter.slug ? (
                  <Link href={`/registry/${adopter.slug}`} style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                    View →
                  </Link>
                ) : ""}
                badge={
                  <StatusBadge variant={adopter.manifestDeclared ? "green" : "neutral"}>
                    {adopter.manifestDeclared ? "Manifest Declared" : "Pending"}
                  </StatusBadge>
                }
                style={{ opacity: adopter.manifestDeclared ? 1 : 0.75 }}
              />
            );
          })}
        </LedgerCard>
      </div>

      {/* "Your agent should be on this list" panel */}
      <div style={{
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        padding: "48px 0",
        marginBottom: 40,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
            {/* Left */}
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)", fontWeight: 800, color: "var(--ink)", lineHeight: 1.2 }}>
                Your agent should be on this list.
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.65 }}>
                Declare your wallets, submit your manifest, and your agent's books go live — revenue, expenses, and treasury visible to the whole registry.
              </p>
              <Link href="/registry#verify" className="lp-btn-primary">Submit Manifest →</Link>
            </div>

            {/* Right: steps */}
            <LedgerCard eyebrow="How it works">
              {[
                { num: "01", title: "Create .agent/wallets.json", desc: "Declare your treasury, operator, and revenue wallets with roles and chain." },
                { num: "02", title: "Submit to Zetta Registry", desc: "Add your agent profile and link the manifest. Zetta verifies and indexes." },
                { num: "03", title: "Books go live", desc: "Your revenue, expenses, and net income appear in Luca's reports and the registry." },
              ].map((step, i, arr) => (
                <LedgerRow
                  key={step.num}
                  first={i === 0}
                  last={i === arr.length - 1}
                  label={
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700,
                        color: "#4AE8A0", minWidth: 22, paddingTop: 1,
                      }}>{step.num}</span>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>{step.title}</p>
                        <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>{step.desc}</p>
                      </div>
                    </div>
                  }
                  value=""
                />
              ))}
            </LedgerCard>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
