import { DOCS_URL } from "@/lib/docs-url";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)" }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "32px 40px",
        display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32,
      }}>
        {/* Brand */}
        <div>
          <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 8 }}>zetta</p>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
            Financial intelligence for autonomous agents. Attribution-first. Accuracy over breadth.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://x.com/zettaaidotco" target="_blank" rel="noreferrer" aria-label="X (Twitter)"
              style={{ width: 30, height: 30, borderRadius: 4, border: "1px solid var(--line-hi)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mid)", textDecoration: "none" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.255 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
            </a>
            <a href="https://github.com/danbuildss/zetta" target="_blank" rel="noreferrer" aria-label="GitHub"
              style={{ width: 30, height: 30, borderRadius: 4, border: "1px solid var(--line-hi)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mid)", textDecoration: "none" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a href="https://t.me/asklucaai" target="_blank" rel="noreferrer" aria-label="Telegram"
              style={{ width: 30, height: 30, borderRadius: 4, border: "1px solid var(--line-hi)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mid)", textDecoration: "none" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Products */}
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Products</p>
          {[
            { l: "Registry",    h: "/registry" },
            { l: "Leaderboard", h: "/leaderboard" },
            { l: "Research",    h: "/research" },
            { l: "API",         h: "/api" },
          ].map((lk) => (
            <Link key={lk.l} href={lk.h} style={{ display: "block", fontSize: "0.71rem", color: "var(--ink-mid)", marginBottom: 6, textDecoration: "none" }}>{lk.l}</Link>
          ))}
        </div>

        {/* Resources */}
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Resources</p>
          {[
            { l: "How It Works",    h: "/about" },
            { l: "Methodology",     h: "/methodology" },
            { l: "Submit Agent",    h: "/registry#verify" },
            { l: "Manifest Guide",  h: "/manifest" },
            { l: "Docs",            h: DOCS_URL, external: true },
          ].map((lk) => (
            lk.external
              ? <a key={lk.l} href={lk.h} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: "0.71rem", color: "var(--ink-mid)", marginBottom: 6, textDecoration: "none" }}>{lk.l} ↗</a>
              : <Link key={lk.l} href={lk.h} style={{ display: "block", fontSize: "0.71rem", color: "var(--ink-mid)", marginBottom: 6, textDecoration: "none" }}>{lk.l}</Link>
          ))}
        </div>

        {/* Company */}
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Company</p>
          {[
            { l: "About",       h: "/about" },
            { l: "Solutions",   h: "/about" },
            { l: "Contact",     h: "/about" },
          ].map((lk) => (
            <Link key={lk.l} href={lk.h} style={{ display: "block", fontSize: "0.71rem", color: "var(--ink-mid)", marginBottom: 6, textDecoration: "none" }}>{lk.l}</Link>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", maxWidth: 1200, margin: "0 auto", padding: "14px 40px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>© 2026 Zetta. All rights reserved.</span>
        <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>On-chain financial intelligence for autonomous agents.</span>
      </div>
    </footer>
  );
}
