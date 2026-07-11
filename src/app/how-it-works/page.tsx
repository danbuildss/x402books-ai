import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";
import { LedgerRow, LedgerCard, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

const STACK_STEPS = [
  { num: "01", title: "Agent",    desc: "Earns, spends, settles on Base.",                       highlight: false },
  { num: "02", title: "Manifest", desc: "Declares wallet identity (.agent/wallets.json).",        highlight: true  },
  { num: "03", title: "Registry", desc: "Indexed, verified, attribution confirmed.",              highlight: false },
  { num: "04", title: "Books",    desc: "Classified P&L: revenue, expenses, net income.",        highlight: false },
  { num: "05", title: "Luca",     desc: "Financial intelligence and reporting.",                  highlight: false },
];

const LAYERS = [
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
];

export default function HowItWorksPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 32px" }}>
        <SectionLabel>Architecture</SectionLabel>
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
        <LedgerCard eyebrow="5-step stack" title="From agent to intelligence">
          {STACK_STEPS.map((step, i) => (
            <LedgerRow
              key={step.num}
              first={i === 0}
              last={i === STACK_STEPS.length - 1}
              label={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    color: step.highlight ? "var(--accent)" : "var(--muted)",
                    width: 24,
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </span>
                  <span style={{ color: step.highlight ? "var(--accent)" : undefined }}>
                    {step.title}
                  </span>
                  {step.highlight && (
                    <StatusBadge variant="green">Key Step</StatusBadge>
                  )}
                </span>
              }
              value={step.desc}
              valueStyle={{
                fontFamily: "inherit",
                fontWeight: 400,
                fontSize: "0.78rem",
                color: "var(--muted)",
                textAlign: "right",
              }}
              style={step.highlight ? { borderColor: "rgba(74,232,160,0.3)", boxShadow: "0 0 0 1px rgba(74,232,160,0.1)" } : undefined}
            />
          ))}
        </LedgerCard>
      </section>

      {/* "Why the Manifest is Step 1" callout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "3px solid #4AE8A0",
          borderRadius: 8,
          padding: "20px 24px",
        }}>
          <SectionLabel style={{ color: "var(--accent)", marginBottom: 8 }}>
            Why the Manifest is Step 1
          </SectionLabel>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.7 }}>
            Without a declared manifest, Zetta cannot attribute any transaction to your agent. No manifest = no books, no revenue, no treasury profile, no inclusion in Luca&apos;s reports or Agent GDP. The manifest is the identity declaration that makes everything downstream possible.
          </p>
        </div>
      </div>

      {/* Three-column "What each layer does" grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>What each layer does</h2>
        <LedgerCard>
          {LAYERS.map((layer, i) => (
            <LedgerRow
              key={layer.title}
              first={i === 0}
              last={i === LAYERS.length - 1}
              label={layer.title}
              value={layer.desc}
              valueStyle={{
                fontFamily: "inherit",
                fontWeight: 400,
                fontSize: "0.78rem",
                color: "var(--muted)",
                textAlign: "right",
                maxWidth: 480,
              }}
            />
          ))}
        </LedgerCard>
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
