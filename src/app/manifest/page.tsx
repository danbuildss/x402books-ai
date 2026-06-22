import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: ".agent/wallets.json — Open Wallet Declaration Standard · Zetta",
  description: "The open standard for autonomous agents to declare their financial identity. Add .agent/wallets.json to your repo and plug into the agent financial intelligence layer.",
};

const code = { fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" } as const;
const muted = { color: "var(--muted)" } as const;

export default function ManifestPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "3.5rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", ...muted }}>
          <Link href="/" style={{ ...muted, textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>.agent/wallets.json</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", ...muted }}>
            Open Standard — v1.0
          </p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.9rem, 4vw, 2.6rem)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px" }}>
            .agent/wallets.json
          </h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.65, ...muted, margin: 0, maxWidth: 600 }}>
            An open, chain-neutral standard for autonomous agents to declare their financial identity.
            One file in your repo connects your agent&apos;s on-chain activity to its operational identity.
          </p>
        </div>

        {/* Quick nav */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48 }}>
          {[
            { label: "Spec →", href: "/manifest/spec" },
            { label: "Examples →", href: "/manifest/examples" },
            { label: "Validate →", href: "/validate" },
            { label: "Migration →", href: "/manifest/migration" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ fontSize: "0.82rem", padding: "6px 14px", border: "1px solid var(--line)", borderRadius: 6, color: "var(--accent)", textDecoration: "none", background: "var(--surface)" }}>
              {l.label}
            </Link>
          ))}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 48px" }} />

        {/* What it is */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            What it is
          </h2>
          <p style={{ lineHeight: 1.7, ...muted, margin: "0 0 16px" }}>
            Autonomous agents operate on public blockchains. Every transaction they execute is permanently
            recorded. But without a declaration of <em>which wallets belong to which agent</em>, those
            transactions remain invisible to any financial intelligence layer.
          </p>
          <p style={{ lineHeight: 1.7, ...muted, margin: "0 0 16px" }}>
            <code style={code}>.agent/wallets.json</code> solves this. It is a lightweight JSON file
            that an agent operator adds to their public repository declaring wallet addresses, roles,
            and chain. That single file is enough to connect the agent&apos;s on-chain activity to its
            operational identity.
          </p>
          <p style={{ lineHeight: 1.7, ...muted, margin: 0 }}>
            The standard is intentionally minimal, chain-neutral, and protocol-agnostic.
            It does not require a specific runtime, token, or registry contract.
          </p>
        </section>

        {/* Minimum valid manifest */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Minimum valid manifest
          </h2>
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 24px", overflowX: "auto", margin: "0 0 16px", lineHeight: 1.65 }}>{`{
  "agent": "Your Agent Name",
  "wallets": [
    {
      "address": "0x...",
      "chain": "base",
      "role": "treasury"
    }
  ]
}`}</pre>
          <p style={{ fontSize: "0.82rem", ...muted, margin: 0 }}>
            Three required fields per wallet: <code style={code}>address</code>, <code style={code}>chain</code>, <code style={code}>role</code>.{" "}
            <Link href="/manifest/spec" style={{ color: "var(--accent)" }}>See full spec →</Link>
          </p>
        </section>

        {/* How it flows */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 20px" }}>
            What happens after you submit
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { step: "01", title: "Attribution", body: "Wallet declarations connect your agent's on-chain addresses to its operational identity. No declaration — no attribution." },
              { step: "02", title: "Books", body: "Attributed wallets generate financial books: revenue, expenses, treasury balance, 30-day P&L. Built from confirmed on-chain activity only." },
              { step: "03", title: "Profile", body: "Books populate your public agent profile: financial statements, transparency score, settlement classification, Luca verdict." },
              { step: "04", title: "Intelligence", body: "Luca reads your books to generate financial summaries, settlement analysis, and include your agent in the State of the Agent Economy." },
            ].map((s, i, arr) => (
              <div key={s.step} style={{ display: "flex", gap: 20, padding: "20px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", paddingTop: 2, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: "0.82rem", lineHeight: 1.6, ...muted }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why open */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Why the standard is open
          </h2>
          <p style={{ lineHeight: 1.7, ...muted, margin: "0 0 16px" }}>
            The goal is not to make the manifest proprietary. The goal is to make attribution
            infrastructure open — and to make Zetta the best intelligence layer built on top of it.
          </p>
          <p style={{ lineHeight: 1.7, ...muted, margin: 0 }}>
            If the standard is open and widely adopted, every agent in the ecosystem benefits:
            financial transparency for stakeholders and token holders, interoperability across
            infrastructure layers, and trust through public attribution.
            Zetta captures value not by owning the declaration, but by building the most complete
            intelligence layer on top of it.
          </p>
        </section>

        {/* Wallet roles reference */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 20px" }}>
            Wallet roles
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Role", "Financial classification", "Use"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", ...muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { role: "treasury",            cls: "Asset",    use: "Primary operating capital" },
                  { role: "revenue",             cls: "Inflow",   use: "Revenue and income collection" },
                  { role: "fee_recipient",       cls: "Inflow",   use: "Protocol fees, revenue share" },
                  { role: "payment_receiver",    cls: "Inflow",   use: "API payments, per-call settlement" },
                  { role: "expense",             cls: "Outflow",  use: "Operational expense wallet" },
                  { role: "operator",            cls: "Outflow",  use: "Hot wallet, day-to-day execution" },
                  { role: "deployer",            cls: "Neutral",  use: "Contract deployer (historical)" },
                  { role: "token_contract",      cls: "Contract", use: "ERC-20 token contract address" },
                  { role: "token_bound_account", cls: "Asset",    use: "ERC-6551 token-bound account" },
                  { role: "unknown",             cls: "Pending",  use: "Declared but role unclear" },
                ].map((r, i) => (
                  <tr key={r.role} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{r.role}</td>
                    <td style={{ padding: "9px 12px", ...muted }}>{r.cls}</td>
                    <td style={{ padding: "9px 12px", ...muted }}>{r.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "32px 28px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 8px" }}>
            Submit your manifest
          </h2>
          <p style={{ fontSize: "0.84rem", lineHeight: 1.6, ...muted, margin: "0 0 20px" }}>
            Add <code style={code}>.agent/wallets.json</code> to your repo, validate it below, then paste your repo URL into your agent&apos;s profile page. Luca will fetch the manifest and generate financial books within 24 hours.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/validate" style={{ padding: "9px 20px", background: "var(--accent)", color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: "0.84rem", fontWeight: 600 }}>
              Validate manifest →
            </Link>
            <Link href="/manifest/spec" style={{ padding: "9px 20px", border: "1px solid var(--line)", borderRadius: 7, textDecoration: "none", fontSize: "0.84rem", color: "var(--ink)" }}>
              Read the spec
            </Link>
          </div>
        </section>

        {/* Nav footer */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: "0.82rem" }}>
          <div />
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/manifest/spec" style={{ color: "var(--accent)", textDecoration: "none" }}>Spec →</Link>
            <Link href="/manifest/examples" style={{ color: "var(--accent)", textDecoration: "none" }}>Examples →</Link>
            <Link href="/manifest/migration" style={{ color: "var(--accent)", textDecoration: "none" }}>Migration →</Link>
          </div>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
