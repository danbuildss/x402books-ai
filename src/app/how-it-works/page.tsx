import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export default function HowItWorksPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 32px" }}>
        <p style={{
          margin: "0 0 12px",
          fontSize: "0.68rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--muted)",
        }}>
          Architecture
        </p>
        <h1 style={{
          margin: "0 0 16px",
          fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          color: "var(--ink)",
        }}>
          How Zetta works.
        </h1>
        <p style={{
          margin: 0,
          fontSize: "1rem",
          color: "var(--muted)",
          lineHeight: 1.7,
          maxWidth: 620,
        }}>
          Zetta turns wallet activity into readable financial books. The Agent Wallet Manifest is the key that unlocks the whole stack.
        </p>
      </section>

      {/* Stack diagram */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 8 }}>
          {[
            {
              num: "01",
              title: "Agent",
              desc: "Earns, spends, settles on Base.",
              highlight: false,
            },
            {
              num: "02",
              title: "Manifest",
              desc: "Declares wallet identity (.agent/wallets.json).",
              highlight: true,
            },
            {
              num: "03",
              title: "Registry",
              desc: "Indexed, verified, attribution confirmed.",
              highlight: false,
            },
            {
              num: "04",
              title: "Books",
              desc: "Classified P&L: revenue, expenses, net income.",
              highlight: false,
            },
            {
              num: "05",
              title: "Luca",
              desc: "Financial intelligence and reporting.",
              highlight: false,
            },
          ].map((step, i, arr) => (
            <div key={step.num} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                minWidth: 150,
                background: "var(--surface)",
                border: step.highlight ? "1px solid #6DB874" : "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
                boxShadow: step.highlight ? "0 0 0 1px rgba(109,184,116,0.15)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: step.highlight ? "#6DB874" : "var(--muted)",
                  }}>
                    {step.num}
                  </span>
                  <span style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: step.highlight ? "#6DB874" : "var(--ink)",
                  }}>
                    {step.title}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </div>
              {i < arr.length - 1 && (
                <span style={{ fontSize: "1rem", color: "var(--muted)", flexShrink: 0 }} aria-hidden="true">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* "Why the Manifest is Step 1" callout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "3px solid #6DB874",
          borderRadius: 8,
          padding: "20px 24px",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6DB874" }}>
            Why the Manifest is Step 1
          </p>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.7 }}>
            Without a declared manifest, Zetta cannot attribute any transaction to your agent. No manifest = no books, no revenue, no treasury profile, no inclusion in Luca's reports or Agent GDP. The manifest is the identity declaration that makes everything downstream possible.
          </p>
        </div>
      </div>

      {/* Three-column "What each layer does" grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>What each layer does</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[
            {
              title: "Attribution Layer",
              desc: "Wallets declare which addresses belong to each agent. This is the foundation — no attribution, no books.",
            },
            {
              title: "Classification Layer",
              desc: "Attributed transactions are classified into operating revenue, expenses, treasury movement, and net income.",
            },
            {
              title: "Intelligence Layer",
              desc: "Luca reads attributed books and produces financial verdicts: signals, summaries, confidence levels, trend analysis.",
            },
          ].map((layer) => (
            <div key={layer.title} style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "20px 22px",
            }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>{layer.title}</p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>{layer.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* "What goes in the manifest" code block */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>What goes in the manifest</h2>
        <pre style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "20px 24px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--ink)",
          lineHeight: 1.65,
          overflowX: "auto",
          margin: 0,
        }}>{`{
  "version": "1.0",
  "agent": "your-agent-slug",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "label": "Main treasury wallet"
    }
  ]
}`}</pre>
      </div>

      {/* CTA strip */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 64px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/registry#verify" className="lp-btn-primary lp-btn-lg">Submit Your Manifest →</Link>
          <Link href="/methodology" className="lp-btn-ghost lp-btn-lg">Read the Methodology →</Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
