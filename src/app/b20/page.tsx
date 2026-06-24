import { getB20Tokens, getB20Stats } from "@/lib/b20-db";
import type { B20TokenRow } from "@/lib/b20-db";
import Link from "next/link";
import { HomeHeader } from "@/app/home-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 120;

const STATUS_META: Record<string, { label: string; color: string }> = {
  attributed: { label: "Attributed",      color: "#22c55e" },
  candidate:  { label: "Candidate",       color: "#f59e0b" },
  none:       { label: "Awaiting Manifest", color: "#6b7280" },
};

const LINK_META: Record<string, { label: string }> = {
  known_token: { label: "Registry Token" },
  manifest:    { label: "Manifest"       },
  erc8004:     { label: "ERC-8004"       },
  admin:       { label: "Admin"          },
  none:        { label: "Unlinked"       },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default async function B20Page() {
  const [tokensResult, statsResult] = await Promise.allSettled([
    getB20Tokens(),
    getB20Stats(),
  ]);

  const tokens: B20TokenRow[] = tokensResult.status === "fulfilled" ? tokensResult.value : [];
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <HomeHeader />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Zetta Intelligence
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 6 }}>B20 Token Intelligence</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 600 }}>
            Zetta indexes B20 tokens, connects them to agents and issuers, monitors activity, and checks financial readiness.
            Token transfers are not revenue. Token contracts are not operator wallets.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* Coming soon — testnet only */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderLeft: "3px solid #6DB874", borderRadius: 10,
          padding: "32px 28px", marginBottom: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6DB874", marginBottom: 10 }}>
            Coming Soon · Mainnet
          </div>
          <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
            B20 launches on Base mainnet soon.
          </h2>
          <p style={{ margin: "0 auto 20px", fontSize: 13, color: "var(--muted)", maxWidth: 500, lineHeight: 1.65 }}>
            Zetta is ready to index B20 tokens, link issuers to agents, monitor mint and burn activity,
            and check financial readiness at launch. Testnet activity is tracked but not yet displayed.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "Token identity", note: "Name, symbol, deployer, issuer wallet" },
              { label: "Agent linking",  note: "Issuer → registry agent → manifest status" },
              { label: "Activity scan",  note: "Mint and burn events from Base" },
              { label: "Attribution",    note: "Financial readiness and books eligibility" },
            ].map((item) => (
              <div key={item.label} style={{
                background: "var(--bg)", border: "1px solid var(--line)",
                borderRadius: 7, padding: "10px 14px", textAlign: "left", minWidth: 160,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data integrity callout */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "12px 16px", marginBottom: 24,
          display: "flex", gap: 24, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>Data Integrity: </span>
            Token contracts are never books-eligible ·
            Token transfers are not operating revenue ·
            Issuer wallets require manifest declaration for attribution ·
            B20 activity is excluded from Agent GDP
          </div>
        </div>

        {/* Positioning footer */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--ink)" }}>Zetta B20 Intelligence</strong> will track token issuers, treasury activity,
          and financial readiness for B20 assets on Base at mainnet launch.
          Analyse a token via the{" "}
          <Link href="/luca#skills" style={{ color: "var(--accent)", textDecoration: "none" }}>
            b20-token-analysis
          </Link>{" "}
          Luca Skill.
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
