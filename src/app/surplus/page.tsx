import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Surplus × Zetta Pilot — Inference Economics for Autonomous Agents",
  description: "Surplus powers inference. Zetta records the economics. Luca explains what it means. Join the pilot.",
};

export default function SurplusPilotPage() {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "52px 24px 80px" }}>

      {/* Nav */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>← Zetta</Link>
      </div>

      {/* Hero */}
      <div style={{ marginBottom: 52 }}>
        <p style={{
          fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase",
          letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 12,
        }}>
          Surplus × Zetta · Pilot
        </p>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16,
        }}>
          Inference economics<br />for autonomous agents.
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>
          Surplus powers inference. Zetta records the economics. Luca explains what it means.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--accent)", color: "#fff", fontWeight: 700,
            fontSize: "0.85rem", padding: "11px 22px", borderRadius: 8, textDecoration: "none",
          }}>
            Join the pilot →
          </Link>
          <Link href="/docs/surplus-integration" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--line)", color: "var(--ink)", fontWeight: 600,
            fontSize: "0.85rem", padding: "11px 22px", borderRadius: 8, textDecoration: "none",
          }}>
            Integration guide
          </Link>
        </div>
      </div>

      {/* What this is */}
      <section style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16,
        }}>What this is</p>
        <p style={{ fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.75, maxWidth: 600 }}>
          Autonomous agents spend real money on inference. That cost is currently invisible — it doesn't appear
          on any financial statement, it can't be tracked against revenue, and it makes financial reporting impossible.
        </p>
        <p style={{ fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.75, maxWidth: 600, marginTop: 12 }}>
          This pilot connects Surplus's inference layer with Zetta's financial record layer.
          The result: every inference request becomes a classified financial event — visible, attributable, and auditable.
        </p>
      </section>

      {/* Who it's for */}
      <section style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16,
        }}>Who it's for</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { label: "Surplus-powered agents", body: "You're already routing inference through Surplus. Adding Zetta gives you financial visibility with zero new infrastructure." },
            { label: "Agent teams with wallets", body: "You have a treasury and you want to understand inference costs as a share of revenue and runway." },
            { label: "Agents building in public", body: "You want a verifiable, public financial record — not just token price." },
          ].map((item) => (
            <div key={item.label} style={{
              padding: "16px 18px", border: "1px solid var(--line)",
              borderRadius: 10, background: "var(--surface)",
            }}>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>{item.label}</p>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Zetta tracks */}
      <section style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16,
        }}>What Zetta tracks</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            ["Inference requests",       "Count, provider, model, request type"],
            ["Provider concentration",   "Which providers, what share of volume"],
            ["Inference spend",          "Cost per request — actual, estimated, or labeled missing"],
            ["Wallet attribution",       "Treasury, fee recipient, operator roles"],
            ["Revenue",                  "Operating inflows from declared wallets"],
            ["Treasury balance",         "Current stablecoin balance and runway"],
          ].map(([label, detail], i, arr) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 12px", background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: i === 0 ? "8px 8px 0 0" : i === arr.length - 1 ? "0 0 8px 8px" : 0,
              borderBottomWidth: i < arr.length - 1 ? 0 : 1,
            }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{detail}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What Luca reports */}
      <section style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16,
        }}>What Luca reports</p>
        <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
          Every pilot agent gets a structured financial report at{" "}
          <code style={{ fontSize: "0.82rem", background: "var(--surface-soft)", padding: "2px 6px", borderRadius: 4 }}>
            /surplus/[your-agent-slug]
          </code>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {[
            "Agent identity",
            "Wallet attribution status",
            "Inference activity",
            "Provider concentration",
            "Inference spend",
            "Revenue (if books exist)",
            "Treasury balance",
            "Revenue vs inference cost",
            "Net position",
            "Data quality notes",
            "Luca verdict",
            "Recommended actions",
          ].map((item, i) => (
            <div key={item} style={{
              padding: "8px 12px", background: "var(--surface)",
              border: "1px solid var(--line)", borderRadius: 6,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 700, minWidth: 18 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.78rem" }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What agents need to provide */}
      <section style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16,
        }}>What you need to provide</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              required: true,
              label: "Route inference through the Zetta proxy",
              body: "One URL change. Drop-in replacement for your Surplus calls. Zetta forwards the request and logs the event.",
            },
            {
              required: false,
              label: "Declare your wallet manifest",
              body: "Add .agent/wallets.json to your repo. Required for books, revenue tracking, and treasury data. Without it, Zetta tracks inference only.",
            },
            {
              required: false,
              label: "Pass cost metadata",
              body: "If you call Surplus directly, pass cost_usd and token counts in the log event. Zetta will label it as estimated or actual.",
            },
          ].map(({ required, label, body }) => (
            <div key={label} style={{
              padding: "14px 16px", border: "1px solid var(--line)",
              borderRadius: 8, background: "var(--surface)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px",
                  borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em",
                  background: required ? "var(--accent)18" : "var(--surface-soft)",
                  border: `1px solid ${required ? "var(--accent)40" : "var(--line)"}`,
                  color: required ? "var(--accent)" : "var(--muted)",
                }}>{required ? "required" : "optional"}</span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{label}</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example report */}
      <section style={{ marginBottom: 52, padding: "20px 24px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10,
        }}>Example</p>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 4 }}>Sleuth AI · Surplus Pilot Report</p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16 }}>
          Inference active · Wallet attributed · Last 30 days
        </p>
        <Link href="/surplus/sleuth-ai" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accent)", color: "#fff", fontWeight: 700,
          fontSize: "0.82rem", padding: "9px 18px", borderRadius: 7, textDecoration: "none",
        }}>
          View Sleuth AI report →
        </Link>
      </section>

      {/* CTA */}
      <section style={{
        padding: "28px 32px", border: "1px solid var(--accent)40",
        background: "var(--accent)08", borderRadius: 12, marginBottom: 0,
      }}>
        <p style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 8 }}>Join the pilot</p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.65, maxWidth: 500, marginBottom: 20 }}>
          We're working with a small group of Surplus-powered agents to build the first proof cases for agent inference economics.
          Two steps to get started.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--accent)", color: "#fff", fontWeight: 700,
            fontSize: "0.84rem", padding: "10px 20px", borderRadius: 8, textDecoration: "none",
          }}>
            1. Submit your agent →
          </Link>
          <Link href="/docs/surplus-integration" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--line)", color: "var(--ink)", fontWeight: 600,
            fontSize: "0.84rem", padding: "10px 20px", borderRadius: 8, textDecoration: "none",
          }}>
            2. Read the integration guide
          </Link>
        </div>
        <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 14 }}>
          Questions? <a href="https://x.com/zettatracker" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>@zettatracker</a> on X.
        </p>
      </section>
    </main>
  );
}
