import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { CostStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Surplus × Zetta Pilot — Inference Economics for Autonomous Agents",
  description: "Surplus powers inference. Zetta records the economics. Luca explains what it means. Join the pilot.",
};

export default function SurplusPilotPage() {
  return (
    <div className="lp-root">
    <SiteNav />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase",
          letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 10,
        }}>
          Surplus × Zetta · Pilot
        </p>
        <h1 style={{
          fontSize: "clamp(1.7rem, 4vw, 2.4rem)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 14,
        }}>
          Inference economics<br />for autonomous agents.
        </h1>
        <p style={{ fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 520, marginBottom: 24 }}>
          Surplus powers inference. Zetta records the economics. Luca explains what it means.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--accent)", color: "#fff", fontWeight: 700,
            fontSize: "0.84rem", padding: "10px 20px", borderRadius: 7, textDecoration: "none",
          }}>
            Join the pilot →
          </Link>
          <Link href="/docs/surplus-integration" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--line)", color: "var(--ink)", fontWeight: 600,
            fontSize: "0.84rem", padding: "10px 20px", borderRadius: 7, textDecoration: "none",
          }}>
            Integration guide
          </Link>
        </div>
      </div>

      {/* What this is */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel style={{ marginBottom: 12 }}>What this is</SectionLabel>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.75, maxWidth: 580, marginBottom: 10 }}>
          Autonomous agents spend real money on inference. That cost is currently invisible — it doesn't appear
          on any financial statement, it can't be tracked against revenue, and it makes financial reporting impossible.
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.75, maxWidth: 580 }}>
          This pilot connects Surplus's inference layer with Zetta's financial record layer.
          Every inference request becomes a classified financial event — visible, attributable, and auditable.
        </p>
      </section>

      {/* What Zetta tracks */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel style={{ marginBottom: 10 }}>What Zetta tracks</SectionLabel>
        <LedgerCard>
          <LedgerRow first label="Inference requests"     value="Count, provider, model, request type" valueStyle={{ fontFamily: "inherit", fontSize: "0.76rem", color: "var(--muted)" }} />
          <LedgerRow       label="Provider concentration" value="Which providers, what share of volume"  valueStyle={{ fontFamily: "inherit", fontSize: "0.76rem", color: "var(--muted)" }} />
          <LedgerRow       label="Inference spend"        value="Cost per request" badge={<div style={{ display: "flex", gap: 4 }}><CostStatusBadge status="actual" /><CostStatusBadge status="estimated" /><CostStatusBadge status="missing" /></div>} />
          <LedgerRow       label="Wallet attribution"     value="Treasury, fee recipient, operator roles" valueStyle={{ fontFamily: "inherit", fontSize: "0.76rem", color: "var(--muted)" }} />
          <LedgerRow       label="Revenue"                value="Operating inflows from declared wallets" valueStyle={{ fontFamily: "inherit", fontSize: "0.76rem", color: "var(--muted)" }} />
          <LedgerRow       label="Treasury balance"       value="Current stablecoin balance and runway"  valueStyle={{ fontFamily: "inherit", fontSize: "0.76rem", color: "var(--muted)" }} />
          <LedgerRow last  label="Net position"           value="Revenue minus inference spend"          valueStyle={{ fontFamily: "inherit", fontSize: "0.76rem", color: "var(--muted)" }} />
        </LedgerCard>
      </section>

      {/* What Luca reports */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel style={{ marginBottom: 10 }}>What Luca reports</SectionLabel>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
          Every pilot agent gets a structured financial report at{" "}
          <code style={{ fontSize: "0.8rem", background: "var(--surface)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--line)" }}>
            /surplus/[your-agent-slug]
          </code>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1 }}>
          {[
            "Agent identity",
            "Wallet attribution",
            "Inference activity",
            "Provider concentration",
            "Inference spend",
            "Revenue",
            "Treasury balance",
            "Revenue vs inference cost",
            "Net position",
            "Data quality notes",
            "Luca verdict",
            "Recommended actions",
          ].map((item, i) => (
            <div key={item} style={{
              padding: "8px 12px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: "0.62rem", color: "var(--accent)", fontWeight: 700, minWidth: 18, fontFamily: "monospace" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.78rem", color: "var(--ink)" }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel style={{ marginBottom: 10 }}>Who it's for</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { label: "Surplus-powered agents", body: "Already routing inference through Surplus. Adding Zetta gives financial visibility with zero new infrastructure." },
            { label: "Agent teams with wallets", body: "You have a treasury and want to understand inference costs as a share of revenue and runway." },
            { label: "Agents building in public", body: "You want a verifiable, public financial record — not just token price." },
          ].map(({ label, body }, i, arr) => (
            <div key={label} style={{
              padding: "12px 14px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: i === 0 ? "8px 8px 0 0" : i === arr.length - 1 ? "0 0 8px 8px" : 0,
              borderBottomWidth: i < arr.length - 1 ? 0 : 1,
            }}>
              <p style={{ fontWeight: 700, fontSize: "0.84rem", marginBottom: 4, color: "var(--ink)" }}>{label}</p>
              <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you need to provide */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel style={{ marginBottom: 10 }}>What you need to provide</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              required: true,
              label: "Route inference through the Zetta proxy",
              body: "One URL change. Drop-in replacement for your Surplus calls. Zetta forwards the request and logs the event.",
            },
            {
              required: false,
              label: "Declare your wallet manifest",
              body: "Add .agent/wallets.json to your repo. Required for books, revenue tracking, and treasury data.",
            },
            {
              required: false,
              label: "Pass cost metadata",
              body: "If you call Surplus directly, pass cost_usd and token counts in the log event. Zetta will label it actual or estimated.",
            },
          ].map(({ required, label, body }) => (
            <div key={label} style={{
              padding: "12px 14px", border: "1px solid var(--line)",
              borderRadius: 8, background: "var(--surface)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px",
                  borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em",
                  background: required ? "var(--accent)18" : "var(--surface-soft)",
                  border: `1px solid ${required ? "var(--accent)40" : "var(--line)"}`,
                  color: required ? "var(--accent)" : "var(--muted)",
                }}>{required ? "required" : "optional"}</span>
                <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--ink)" }}>{label}</span>
              </div>
              <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example report */}
      <section style={{
        marginBottom: 48, padding: "18px 20px",
        background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
      }}>
        <SectionLabel style={{ marginBottom: 8 }}>Example pilot report</SectionLabel>
        <p style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 3, color: "var(--ink)" }}>Sleuth AI · Surplus Pilot Report</p>
        <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginBottom: 14 }}>
          Inference active · Wallet attributed · Last 30 days
        </p>
        <Link href="/registry/sleuth-ai" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accent)", color: "#fff", fontWeight: 700,
          fontSize: "0.8rem", padding: "8px 16px", borderRadius: 6, textDecoration: "none",
        }}>
          View Sleuth AI report →
        </Link>
      </section>

      {/* CTA */}
      <section style={{
        padding: "24px 28px", border: "1px solid var(--accent)40",
        background: "var(--accent)08", borderRadius: 10,
      }}>
        <p style={{ fontWeight: 800, fontSize: "0.96rem", marginBottom: 6, color: "var(--ink)" }}>Join the pilot</p>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, maxWidth: 480, marginBottom: 18 }}>
          We're working with a small group of Surplus-powered agents to build the first proof cases for agent inference economics.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--accent)", color: "#fff", fontWeight: 700,
            fontSize: "0.82rem", padding: "9px 18px", borderRadius: 7, textDecoration: "none",
          }}>
            1. Submit your agent →
          </Link>
          <Link href="/docs/surplus-integration" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--line)", color: "var(--ink)", fontWeight: 600,
            fontSize: "0.82rem", padding: "9px 18px", borderRadius: 7, textDecoration: "none",
          }}>
            2. Read the integration guide
          </Link>
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 12 }}>
          Questions?{" "}
          <a href="https://x.com/zettatracker" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
            @zettatracker
          </a>{" "}
          on X.
        </p>
      </section>
    </main>
    <SiteFooter />
    </div>
  );
}
