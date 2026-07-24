import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { DOCS_URL } from "@/lib/docs-url";

export const metadata: Metadata = {
  title: "About — Zetta",
  description:
    "Zetta is the financial visibility layer for autonomous agents: wallet attribution, auditable Agent Books, and Luca — the analyst that reads them.",
};

const PRINCIPLES = [
  {
    title: "No manifest, no books",
    desc: "Official financial statements only exist for wallets an agent's team has declared in .agent/wallets.json. Discovered wallets are labeled as discovered — they never feed the numbers.",
  },
  {
    title: "Missing data is never zero",
    desc: "If we haven't measured something, we show a dash and say why. A $0.00 only appears when the chain was scanned and the answer really was zero.",
  },
  {
    title: "Gross inflow is not revenue",
    desc: "Capital injections, grants, bridge receipts, and token transfers are classified and quarantined — not folded into operating revenue to make an agent look better.",
  },
  {
    title: "Every number carries its source",
    desc: "Period, attribution source, confidence level, and an as-of timestamp travel with every figure — on profiles, in the API, and in every answer Luca gives.",
  },
  {
    title: "Unknown stays unknown",
    desc: "Activity we can't classify with confidence is reported as unknown. We'd rather show a smaller, defensible number than a larger, invented one.",
  },
  {
    title: "Luca never fills gaps",
    desc: "Luca reads attributed books and says so when data is missing, stale, or low-confidence. It refuses to estimate what it cannot measure.",
  },
];

const LAYERS = [
  { name: "Identity", desc: "Agents are indexed with verified metadata, ecosystem tags, and wallet manifests that declare which addresses belong to whom — and in what role." },
  { name: "Books", desc: "Attributed wallet activity is classified into operating revenue, expenses, treasury movement, and net income — reproducible, per agent, per period." },
  { name: "Intelligence", desc: "Luca, the AI financial analyst, reads the books and produces reports, treasury monitoring, and verdicts — always citing source and confidence." },
];

export default function AboutPage() {
  return (
    <div className="lp-root">
      <SiteNav />

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "48px 40px 0" }}>
        {/* ── Mission ── */}
        <p className="lp-eyebrow">About Zetta</p>
        <h1 className="lp-h1" style={{ fontSize: "clamp(1.6rem, 3vw, 2.5rem)", maxWidth: 720 }}>
          Autonomous agents move real money.{" "}
          <em style={{ fontStyle: "italic", color: "#4AE8A0" }}>Someone has to keep the books.</em>
        </h1>
        <p className="lp-hero-sub" style={{ maxWidth: 680 }}>
          Thousands of AI agents now earn, spend, and hold capital on-chain — but their finances are
          scattered across anonymous wallets that nobody can read. Zetta is the financial visibility
          layer that changes that: we index agents, attribute their wallets through a public manifest
          standard, and turn raw on-chain activity into auditable financial statements. Not another
          agent. Not a token dashboard. Infrastructure.
        </p>

        {/* ── The three layers ── */}
        <section style={{ marginTop: 48 }}>
          <p className="zetta-stack-eyebrow">What we build</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 16 }}>
            {LAYERS.map((l, i) => (
              <div key={l.name} className="zetta-bottom-panel" style={{ margin: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#4AE8A0" }}>{String(i + 1).padStart(2, "0")}</span>
                <h3 style={{ margin: "6px 0 8px", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>{l.name}</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>{l.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Principles ── */}
        <section style={{ marginTop: 48 }}>
          <p className="zetta-stack-eyebrow">What we refuse to fake</p>
          <p style={{ margin: "10px 0 20px", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.65, maxWidth: 640 }}>
            Financial infrastructure is only worth anything if the numbers can be trusted. These rules
            are enforced in code — in our classifiers, our database constraints, and Luca&apos;s own
            instructions — not just written on this page.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            {PRINCIPLES.map((p) => (
              <div key={p.title} style={{ padding: "14px 16px", border: "1px solid var(--line)", borderLeft: "3px solid #4AE8A0", borderRadius: 8, background: "var(--surface)" }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.84rem", fontWeight: 700, color: "var(--ink)" }}>{p.title}</p>
                <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bankr-first ── */}
        <section style={{ marginTop: 48 }}>
          <p className="zetta-stack-eyebrow">Why Bankr first</p>
          <p style={{ margin: "10px 0 0", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 680 }}>
            Trust compounds slowly, so we build brick by brick. Instead of shallow coverage of every
            ecosystem, Zetta starts by making one ecosystem — Bankr agents on Base — fully financially
            readable: accurate identity, declared wallets, live books, and reliable API access. When an
            agent&apos;s profile here is accurate enough that its own team shares it, we&apos;ve earned
            the right to index the next ecosystem.
          </p>
        </section>

        {/* ── CTA ── */}
        <section style={{ margin: "48px 0 64px", padding: "24px 28px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)" }}>Run an agent? Make it readable.</h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
              Declare your wallets in <code style={{ fontFamily: "var(--font-mono)" }}>.agent/wallets.json</code> and your books generate automatically.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className="lp-btn-ghost">Read the docs ↗</a>
            <Link href="/registry#verify" className="lp-btn-primary">Submit Manifest →</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
