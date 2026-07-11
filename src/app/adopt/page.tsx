import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { getAttributionMetrics } from "@/lib/attribution-health";

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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Manifest Adopters", value: manifestAdopters, color: "#22c55e", sub: "of 25 target" },
            { label: "Wallets Declared", value: walletsDeclared, color: "#4AE8A0", sub: "of 100 target" },
            { label: "Ecosystems", value: 5, color: "var(--ink)", sub: "active" },
            { label: "Coverage", value: coveragePct + "%", color: "#5B9EF4", sub: "of registry" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "16px 22px",
              minWidth: 150,
              flex: "1 1 150px",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                {stat.label}
              </p>
              <p style={{ margin: "0 0 2px", fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: stat.color }}>
                {stat.value}
              </p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI progress section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 40px" }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "24px 28px",
        }}>
          <p style={{
            margin: "0 0 20px",
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--muted)",
          }}>
            30-Day Adoption Goal
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}>Agents with manifest</span>
                <span style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  {manifestAdopters} / {agentTarget}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${agentBarPct}%`, borderRadius: 3, background: "#22c55e", transition: "width 0.4s" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}>Wallets declared</span>
                <span style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  {walletsDeclared} / {walletTarget}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${walletBarPct}%`, borderRadius: 3, background: "#4AE8A0", transition: "width 0.4s" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Early adopters grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>Early Adopters</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {ADOPTERS.map((adopter) => {
            const ecoColor = ECO_COLORS[adopter.ecosystem] ?? "#4AE8A0";
            return (
              <div key={adopter.name} style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderLeft: adopter.manifestDeclared ? `3px solid ${ecoColor}` : "3px solid var(--line)",
                borderRadius: 10,
                padding: "18px 20px",
                opacity: adopter.manifestDeclared ? 1 : 0.75,
              }}>
                {/* Name + badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>{adopter.name}</span>
                  {adopter.manifestDeclared ? (
                    <span style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "#22c55e",
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.25)",
                      borderRadius: 4,
                      padding: "2px 8px",
                    }}>
                      Manifest Declared
                    </span>
                  ) : (
                    <span style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "var(--muted)",
                      background: "var(--surface-soft)",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      padding: "2px 8px",
                    }}>
                      Pending
                    </span>
                  )}
                </div>

                {/* Tag row */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: ecoColor,
                    background: `${ecoColor}2E`,
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}>
                    {adopter.ecosystem}
                  </span>
                  {adopter.walletCount > 0 && (
                    <span style={{
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                      background: "var(--surface-soft)",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      padding: "2px 8px",
                    }}>
                      {adopter.walletCount} wallet{adopter.walletCount !== 1 ? "s" : ""} declared
                    </span>
                  )}
                </div>

                {/* Note */}
                <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55 }}>
                  {adopter.note}
                </p>

                {/* Profile link */}
                {adopter.slug && (
                  <Link href={`/registry/${adopter.slug}`} style={{
                    fontSize: "0.78rem",
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}>
                    View profile →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                {
                  num: "01",
                  title: "Create .agent/wallets.json",
                  desc: "Declare your treasury, operator, and revenue wallets with roles and chain.",
                },
                {
                  num: "02",
                  title: "Submit to Zetta Registry",
                  desc: "Add your agent profile and link the manifest. Zetta verifies and indexes.",
                },
                {
                  num: "03",
                  title: "Books go live",
                  desc: "Your revenue, expenses, and net income appear in Luca's reports and the registry.",
                },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(74,232,160,0.15)",
                    border: "1px solid rgba(74,232,160,0.3)",
                    color: "#4AE8A0",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>{step.title}</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
