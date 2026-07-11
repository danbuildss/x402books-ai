import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Manifest Migration Guide · Zetta",
  description: "Migrate from .x402books/wallets.json to .agent/wallets.json. Both paths are accepted — migration is a rename with no schema changes.",
};

const code = { fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" } as const;
const muted = { color: "var(--muted)" } as const;

export default function ManifestMigrationPage() {
  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "3.5rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: "0.78rem", ...muted }}>
          <Link href="/" style={{ ...muted, textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/manifest" style={{ ...muted, textDecoration: "none" }}>.agent/wallets.json</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Migration</span>
        </nav>

        <div style={{ marginBottom: 40 }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", ...muted }}>
            Migration Guide
          </p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px" }}>
            Migrating to .agent/wallets.json
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.65, ...muted, margin: 0 }}>
            If your agent currently declares wallets at <code style={code}>.x402books/wallets.json</code>,
            this guide covers the migration to the canonical path.
          </p>
        </div>

        {/* TL;DR */}
        <div style={{ padding: "16px 20px", background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 8, marginBottom: 48 }}>
          <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6 }}>
            <strong>TL;DR:</strong> Rename the file. Both paths are fetched — no schema changes required,
            no re-submission needed. The old path continues to work indefinitely as a fallback.
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 48px" }} />

        {/* What changed */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            What changed
          </h2>
          <p style={{ lineHeight: 1.7, ...muted, margin: "0 0 16px" }}>
            The manifest is now part of an open, ecosystem-neutral standard — not a Zetta-specific format.
            The canonical path has moved from <code style={code}>.x402books/wallets.json</code> to
            <code style={code}>.agent/wallets.json</code> to reflect this.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
            <div style={{ padding: "16px 18px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#c0392b", marginBottom: 10 }}>Before</div>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.83rem", ...muted }}>
                .x402books/wallets.json
              </code>
            </div>
            <div style={{ padding: "16px 18px", background: "var(--surface)", border: "1px solid color-mix(in srgb, #4AE8A0 40%, var(--line))", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#4AE8A0", marginBottom: 10 }}>After</div>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.83rem", color: "var(--ink)" }}>
                .agent/wallets.json
              </code>
            </div>
          </div>
        </section>

        {/* Step by step */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 20px" }}>
            Migration steps
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              {
                step: "01",
                title: "Rename the directory",
                body: "Rename .x402books/ to .agent/ in your repository root. The wallets.json filename stays the same.",
                code: `# In your repo root
mv .x402books .agent

# Or create fresh
mkdir .agent
cp .x402books/wallets.json .agent/wallets.json`,
              },
              {
                step: "02",
                title: "Optionally add the version field",
                body: "Add \"version\": \"1.0\" to your manifest root. This signals to all tooling that you're on the current spec.",
                code: `{
  "version": "1.0",
  "agent": "Your Agent",
  "wallets": [...]
}`,
              },
              {
                step: "03",
                title: "Update your GitHub Action (if applicable)",
                body: "If you have a CI workflow that validates your manifest, update the path.",
                code: `# .github/workflows/validate-manifest.yml
- name: Validate manifest
  run: |
    curl -s -X POST https://zetta.xyz/api/validate-manifest \\
      -H "Content-Type: application/json" \\
      -d @.agent/wallets.json | jq -e '.ok == true'`,
              },
              {
                step: "04",
                title: "No re-submission needed",
                body: "Your existing registry record is not affected. Zetta fetches both paths on every manifest check — your attribution status, books, and profile remain unchanged.",
                code: null,
              },
            ].map((s, i, arr) => (
              <div key={s.step} style={{ padding: "24px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: s.code ? 16 : 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", paddingTop: 2, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: "0.82rem", lineHeight: 1.6, ...muted }}>{s.body}</div>
                  </div>
                </div>
                {s.code && (
                  <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 7, padding: "14px 18px", overflowX: "auto", margin: 0, lineHeight: 1.65, ...muted }}>
                    {s.code}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Backward compat guarantee */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Backward compatibility
          </h2>
          <p style={{ lineHeight: 1.7, ...muted, margin: "0 0 16px" }}>
            The fetch pipeline checks both paths in order. <code style={code}>.agent/wallets.json</code> is
            tried first; <code style={code}>.x402books/wallets.json</code> is tried as a fallback.
            The legacy path will continue to work indefinitely.
          </p>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--line)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", ...muted }}>Fetch order</div>
            {[
              { path: ".agent/wallets.json (main)", label: "Primary", color: "var(--accent)" },
              { path: ".agent/wallets.json (master)", label: "Primary fallback", color: "var(--accent)" },
              { path: ".x402books/wallets.json (main)", label: "Legacy fallback", color: "var(--muted)" },
              { path: ".x402books/wallets.json (master)", label: "Legacy fallback", color: "var(--muted)" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderBottom: i < 3 ? "1px solid var(--line)" : "none" }}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", ...muted }}>{row.path}</code>
                <span style={{ fontSize: "0.72rem", color: row.color }}>{row.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Role migrations */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 16px" }}>
            Role changes in v1.0
          </h2>
          <p style={{ fontSize: "0.84rem", ...muted, margin: "0 0 16px", lineHeight: 1.6 }}>
            The role vocabulary expanded in v1.0. Old roles continue to work — they are normalized to their v1.0 equivalents:
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Old role", "Maps to", "Action required"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.06em", ...muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { old: "fee",      to: "fee_recipient",    action: "Optional update — same classification" },
                  { old: "treasury", to: "treasury",         action: "No change" },
                  { old: "deployer", to: "deployer",         action: "No change" },
                  { old: "operator", to: "operator",         action: "No change" },
                  { old: "unknown",  to: "unknown",          action: "No change" },
                ].map((r, i) => (
                  <tr key={r.old} style={{ borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem", ...muted, textDecoration: "line-through" }}>{r.old}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{r.to}</td>
                    <td style={{ padding: "10px 12px", ...muted, fontSize: "0.79rem" }}>{r.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.78rem", ...muted, marginTop: 12 }}>
            New roles available in v1.0: <code style={code}>revenue</code>, <code style={code}>expense</code>,{" "}
            <code style={code}>payment_receiver</code>, <code style={code}>token_contract</code>,{" "}
            <code style={code}>token_bound_account</code>.{" "}
            <Link href="/manifest/spec#roles" style={{ color: "var(--accent)" }}>See full role reference →</Link>
          </p>
        </section>

        {/* Questions */}
        <section style={{ padding: "24px 24px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 48 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px" }}>
            Questions?
          </h2>
          <p style={{ fontSize: "0.84rem", lineHeight: 1.6, ...muted, margin: "0 0 14px" }}>
            If your manifest is not being picked up after migration, verify the file exists at{" "}
            <code style={code}>.agent/wallets.json</code> on the <code style={code}>main</code> or{" "}
            <code style={code}>master</code> branch of a public GitHub or Gitlawb repo.
            Use the validator to confirm the format is correct.
          </p>
          <Link href="/validate" style={{ fontSize: "0.82rem", color: "var(--accent)", textDecoration: "none" }}>
            Validate your manifest →
          </Link>
        </section>

        {/* Nav footer */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: "0.82rem" }}>
          <Link href="/manifest/examples" style={{ color: "var(--accent)", textDecoration: "none" }}>← Examples</Link>
          <Link href="/manifest/spec" style={{ color: "var(--accent)", textDecoration: "none" }}>Back to Spec →</Link>
        </div>

      </article>

      <SiteFooter />
    </div>
  );
}
