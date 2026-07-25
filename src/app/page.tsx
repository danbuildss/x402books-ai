"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type PageData = {
  totalAgents: number;
  attributed: number;
  coveragePct: number;
  manifestFiled: number;
  topAgents: { name: string; slug: string; revenue_usd: number; ecosystem: string }[];
  gdp: number | null;
  expenses: number | null;
  netIncome: number | null;
  statusBreakdown: { manifest: number; inferred: number; none: number };
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ── Count-up hook ──────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900, delay = 700) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      function tick(now: number) {
        const p = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return val;
}

// ── Terminal Card ──────────────────────────────────────────────────────────────
function TerminalCard({ data }: { data: PageData }) {
  const agents = useCountUp(data.totalAgents, 900, 700);
  const attributed = useCountUp(data.attributed, 400, 900);
  const manifests = useCountUp(data.manifestFiled, 300, 950);
  const coverage = useCountUp(data.coveragePct, 500, 850);

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line-hi)",
      borderRadius: 8, overflow: "hidden", fontFamily: "var(--font-mono)",
      animation: "terminalFadeIn 0.65s 0.25s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      {/* Titlebar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface-hi)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
        <span style={{ marginLeft: 4, fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>ZETTA SYSTEM STATUS</span>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {/* Registry section */}
        <p style={{ fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>Registry</p>
        {[
          { label: "Indexed Agents", value: String(agents), color: "var(--ink-hi)" },
          { label: "Attributed",     value: String(attributed), color: "var(--accent)" },
          { label: "Coverage",       value: `${coverage}%`, color: "var(--amber)" },
          { label: "Manifests Filed", value: String(manifests), color: "var(--ink-hi)" },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--ink-mid)" }}>{row.label}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: row.color }}>{row.value}</span>
          </div>
        ))}

        {/* Economy section */}
        <p style={{ fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "16px 0 8px", paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>Economy (30d)</p>
        {[
          { label: "Agent GDP",      value: data.gdp != null ? fmtUSD(data.gdp) : "—" },
          { label: "Total Revenue",  value: data.gdp != null ? fmtUSD(data.gdp) : "—" },
          { label: "Net Income",     value: data.netIncome != null ? fmtUSD(data.netIncome) : "—" },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--ink-mid)" }}>{row.label}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)" }}>{row.value}</span>
          </div>
        ))}

        {/* Luca note */}
        <div style={{
          background: "var(--accent-dim)", borderLeft: "2px solid var(--accent)",
          padding: "8px 10px", borderRadius: "0 4px 4px 0", marginTop: 12,
          animation: "lucaPulse 3.5s 1s ease-in-out infinite",
        }}>
          <p style={{ fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>Luca Note</p>
          <p style={{ fontSize: "0.68rem", color: "var(--ink-mid)", lineHeight: 1.55, fontFamily: "var(--font-sans)" }}>
            Coverage is thin. Most agents have no declared wallets. Submit a manifest to generate official books.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid var(--line)", background: "var(--surface-hi)" }}>
        {[["BOOKS", "LIVE"], ["LUCA", "ACTIVE"], ["UPDATED", "LIVE"]].map(([k, v]) => (
          <span key={k} style={{ fontSize: "0.56rem", color: "var(--muted)", letterSpacing: "0.04em" }}>
            {k} <span style={{ color: "var(--accent)" }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sign-in Modal ──────────────────────────────────────────────────────────────
function SignInModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", border: "1px solid var(--line-hi)",
          borderRadius: 10, padding: 28, width: 318,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 5 }}>Sign in to Zetta</p>
        <p style={{ fontSize: "0.73rem", color: "var(--ink-mid)", marginBottom: 22, lineHeight: 1.55 }}>
          Access your dashboard, submit manifests, and track agent financial data.
        </p>
        <Link
          href="/access"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "9px 14px", borderRadius: 6,
            fontSize: "0.8rem", fontWeight: 600,
            background: "var(--ink-em)", color: "var(--bg)",
            border: "1px solid transparent", textDecoration: "none", marginBottom: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          Sign in with X
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--line-hi)" }} />
          <span style={{ fontSize: "0.62rem", color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--line-hi)" }} />
        </div>
        <Link
          href="/access"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "9px 14px", borderRadius: 6,
            fontSize: "0.8rem", fontWeight: 600,
            background: "transparent", color: "var(--ink-hi)",
            border: "1px solid var(--line-hi)", textDecoration: "none", marginBottom: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          Continue with Email
        </Link>
        <button
          onClick={onClose}
          style={{ display: "block", width: "100%", marginTop: 12, fontSize: "0.7rem", color: "var(--muted)", textAlign: "center", cursor: "pointer", background: "none", border: "none" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Nav Dropdown ───────────────────────────────────────────────────────────────
function NavDropdown({ label, items }: { label: string; items: { title: string; desc: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: "0.78rem", color: open ? "var(--ink-hi)" : "var(--ink-mid)",
          background: open ? "var(--line)" : "none", border: "none",
          padding: "6px 10px", cursor: "pointer", borderRadius: 4,
          transition: "color 0.15s, background 0.15s",
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          minWidth: 240, background: "var(--surface)",
          border: "1px solid var(--line-hi)", borderRadius: 8,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          padding: 8, zIndex: 300,
        }}>
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "9px 12px", borderRadius: 4, textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hi)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <p style={{ margin: "0 0 2px", fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-hi)" }}>{item.title}</p>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--ink-mid)", lineHeight: 1.4 }}>{item.desc}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function Nav({ onSignIn }: { onSignIn: () => void }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", height: 48,
      background: "var(--nav-bg)",
      borderBottom: "1px solid var(--line)",
      backdropFilter: "blur(16px)",
    }}>
      {/* Brand */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 120 126" aria-hidden="true">
          <g transform="matrix(0.985,-0.174,-0.423,0.906,53,12)">
            <rect x="0" y="0"   width="68" height="14" rx="4" fill="var(--ink-hi)" />
            <rect x="0" y="37"  width="68" height="14" rx="4" fill="var(--accent)" />
            <rect x="0" y="74"  width="68" height="14" rx="4" fill="var(--ink-hi)" />
            <rect x="0" y="111" width="68" height="14" rx="4" fill="var(--ink-hi)" />
          </g>
        </svg>
        <span style={{ fontSize: "0.88rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink-em)" }}>zetta</span>
      </Link>

      {/* Nav dropdowns */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <NavDropdown label="Product" items={[
          { title: "Registry",     desc: "143 indexed agents with attribution and books status.", href: "/registry" },
          { title: "Agent Books",  desc: "Attributed wallet activity turned into readable financials.", href: "/registry" },
          { title: "Leaderboard",  desc: "Revenue and attribution rankings across all agents.", href: "/leaderboard" },
          { title: "Luca",         desc: "AI financial analyst. Reads books, cites sources, never invents data.", href: "/luca" },
        ]} />
        <NavDropdown label="Solutions" items={[
          { title: "For Agent Teams",  desc: "Submit a manifest, get attributed books, share your financial profile.", href: "/registry#verify" },
          { title: "For Developers",   desc: "API access to agent books, registry, revenue, and badge endpoints.", href: "/api" },
          { title: "For Researchers",  desc: "Analyst-grade reports on agent finance and ecosystem attribution.", href: "/research" },
        ]} />
        <NavDropdown label="About Us" items={[
          { title: "What is Zetta",  desc: "Financial intelligence infrastructure for autonomous agents.", href: "/about" },
          { title: "Methodology",    desc: "How we classify wallets, revenue, and attribution confidence.", href: "/research" },
          { title: "Contact",        desc: "Get in touch with the Zetta team.", href: "/about" },
        ]} />
      </div>

      {/* Right: theme toggle + sign in */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <button
          onClick={() => setDark(!dark)}
          title="Toggle theme"
          style={{
            width: 28, height: 28, borderRadius: 4,
            border: "1px solid var(--line-hi)", background: "transparent",
            color: "var(--ink-mid)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {dark ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </button>
        <button
          onClick={onSignIn}
          style={{
            fontSize: "0.74rem", fontWeight: 600, padding: "5px 14px", borderRadius: 6,
            border: "1px solid var(--line-hi)", color: "var(--ink-hi)", background: "var(--surface-hi)",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          Sign In
        </button>
      </div>
    </nav>
  );
}

// ── Page Shell (client) ────────────────────────────────────────────────────────
function LandingPage({ data }: { data: PageData }) {
  const [showSignIn, setShowSignIn] = useState(false);

  // Force dark on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const attrPct = data.coveragePct;
  const inferredPct = data.statusBreakdown.inferred > 0
    ? Math.round((data.statusBreakdown.inferred / data.totalAgents) * 100) : 0;
  const unattrPct = 100 - attrPct - inferredPct;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lucaPulse {
          0%, 100% { border-left-color: var(--accent); }
          50%       { border-left-color: rgba(61,207,136,0.22); }
        }
        @keyframes terminalFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { opacity:0; animation: fadeUp 0.55s 0.08s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-2 { opacity:0; animation: fadeUp 0.55s 0.18s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-3 { opacity:0; animation: fadeUp 0.55s 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-4 { opacity:0; animation: fadeUp 0.55s 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-5 { opacity:0; animation: fadeUp 0.55s 0.48s cubic-bezier(0.22,1,0.36,1) forwards; }

        :root[data-theme="light"], .lp-root[data-theme="light"] {
          --bg:           #F3F4F7;
          --surface:      #FFFFFF;
          --surface-hi:   #EAECF0;
          --line:         rgba(0,0,0,0.07);
          --line-hi:      rgba(0,0,0,0.12);
          --ink:          #3C4152;
          --ink-hi:       #1A1E2A;
          --ink-em:       #0D1018;
          --ink-mid:      #6B7387;
          --muted:        #A0A8B8;
          --accent:       #1A9E62;
          --accent-dim:   rgba(26,158,98,0.07);
          --accent-line:  rgba(26,158,98,0.18);
          --amber:        #A86D10;
          --red:          #B83838;
          --blue:         #2462B0;
          --nav-bg:       rgba(243,244,247,0.94);
        }

        .lp-routing-card:hover { background: var(--surface-hi) !important; }

        @media (max-width: 768px) {
          .lp-hero-grid { grid-template-columns: 1fr !important; }
          .lp-intel-grid { grid-template-columns: 1fr !important; }
          .lp-pipeline { grid-template-columns: 1fr !important; }
          .lp-proof-strip { grid-template-columns: repeat(3, 1fr) !important; }
          .lp-routing-grid { grid-template-columns: 1fr 1fr !important; }
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <Nav onSignIn={() => setShowSignIn(true)} />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 40px 48px" }}>
        <div className="lp-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            <p className="anim-1" style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 16 }}>
              Financial Intelligence Platform
            </p>
            <h1 className="anim-2" style={{ fontSize: "clamp(1.75rem, 3vw, 2.4rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.025em", color: "var(--ink-em)", marginBottom: 16 }}>
              The financial layer<br />for autonomous agents.
            </h1>
            <p className="anim-3" style={{ fontSize: "0.875rem", color: "var(--ink-mid)", lineHeight: 1.75, maxWidth: 400, marginBottom: 28 }}>
              Zetta turns attributed agent wallet activity into Agent Books — revenue, expenses, treasury, and net income. Powered by Luca.
            </p>
            <div className="anim-4" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <Link href="/registry" style={{
                fontSize: "0.8rem", fontWeight: 600, padding: "9px 20px", borderRadius: 6,
                background: "var(--accent)", color: "#0A0B0D", border: "1px solid var(--accent)", textDecoration: "none",
              }}>Explore Registry →</Link>
              <Link href="/registry#verify" style={{
                fontSize: "0.8rem", padding: "9px 20px", borderRadius: 6,
                background: "transparent", color: "var(--ink-mid)", border: "1px solid var(--line-hi)", textDecoration: "none",
              }}>Register Agent</Link>
            </div>
            <p className="anim-5" style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
              Attribution-first. Accuracy over breadth. No manifest, no official books.
            </p>
          </div>

          <TerminalCard data={data} />
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="lp-proof-strip" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
          {[
            { value: String(data.totalAgents), label: "Agents Indexed",  color: "var(--ink-hi)" },
            { value: String(data.attributed),   label: "Attributed",      color: "var(--accent)" },
            { value: `${data.coveragePct}%`,    label: "Coverage",        color: "var(--amber)" },
            { value: "1",                        label: "Ecosystem",       color: "var(--ink-hi)" },
            { value: "Live",                     label: "Books Status",    color: "var(--accent)" },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: "18px 0 18px", paddingLeft: i === 0 ? 0 : 24, borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 700, color: s.color, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PIPELINE ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>How Zetta Works</p>
        <div className="lp-pipeline" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
          {[
            { num: "01", name: "Attribution", desc: "Agents declare official wallets via .agent/wallets.json. No declaration, no official books.", color: "var(--accent)" },
            { num: "02", name: "Books",        desc: "Attributed transactions classified into revenue, expenses, treasury, and net income.", color: "var(--blue)" },
            { num: "03", name: "History",      desc: "Books snapshotted across reporting periods to track trends and operational health.", color: "#8B7CF6" },
            { num: "04", name: "Economy",      desc: "Attributed agents aggregate into Agent GDP — the financial pulse of the autonomous economy.", color: "var(--amber)" },
            { num: "05", name: "Intelligence", desc: "Luca reads attributed books and produces financial verdicts, signals, and confidence levels.", color: "var(--accent)" },
          ].map((step, i, arr) => (
            <div key={step.num} style={{ padding: "20px 16px", borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "none", background: "var(--surface)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", color: step.color, marginBottom: 8 }}>{step.num}</p>
              <p style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--ink-hi)", marginBottom: 6 }}>{step.name}</p>
              <p style={{ fontSize: "0.66rem", color: "var(--muted)", lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTELLIGENCE PANELS ── */}
      <div className="lp-intel-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Left: Agents */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-hi)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Top Revenue Agents</span>
            <Link href="/leaderboard" style={{ fontSize: "0.66rem", color: "var(--accent)", textDecoration: "none" }}>Leaderboard →</Link>
          </div>
          <div style={{ padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["#", "Agent", "Ecosystem", "30d Rev"].map((h) => (
                    <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", textAlign: h === "30d Rev" ? "right" : "left", padding: "0 8px 8px", borderBottom: "1px solid var(--line)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topAgents.length > 0 ? data.topAgents.slice(0, 4).map((a, i) => (
                  <tr key={a.slug}>
                    <td style={{ padding: "7px 8px", fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>{i + 1}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid var(--line)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />
                      <Link href={`/registry/${a.slug}`} style={{ fontSize: "0.73rem", fontWeight: 600, color: "var(--ink-hi)", textDecoration: "none" }}>{a.name}</Link>
                    </td>
                    <td style={{ padding: "7px 8px", fontSize: "0.64rem", color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>{a.ecosystem}</td>
                    <td style={{ padding: "7px 8px", fontFamily: "var(--font-mono)", fontSize: "0.71rem", color: "var(--accent)", textAlign: "right", borderBottom: "1px solid var(--line)" }}>{fmtUSD(a.revenue_usd)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ padding: "14px 8px", fontSize: "0.66rem", color: "var(--muted)" }}>Financial data populates as agents submit wallet manifests.</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              {[
                { label: "Agent GDP (30d)", val: data.gdp != null ? fmtUSD(data.gdp) : "—" },
                { label: "Total Expenses",  val: data.expenses != null ? fmtUSD(data.expenses) : "—" },
                { label: "Net Income",      val: data.netIncome != null ? fmtUSD(data.netIncome) : "—" },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: "var(--muted)" }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Attribution */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-hi)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Attribution Status</span>
            <Link href="/registry" style={{ fontSize: "0.66rem", color: "var(--accent)", textDecoration: "none" }}>Full Report →</Link>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.65rem", fontWeight: 700, color: "var(--amber)" }}>{data.coveragePct}%</span>
              <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>of agents attributed</span>
            </div>
            {/* Bar */}
            <div style={{ height: 3, background: "var(--line)", borderRadius: 2, margin: "10px 0 4px", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${attrPct}%`, background: "var(--accent)" }} />
              <div style={{ width: `${inferredPct}%`, background: "var(--amber)" }} />
              <div style={{ width: `${Math.max(0, unattrPct)}%`, background: "var(--line)" }} />
            </div>
            {[
              { label: "Manifest",     val: data.statusBreakdown.manifest,  color: "var(--accent)" },
              { label: "Inferred",     val: data.statusBreakdown.inferred,  color: "var(--amber)" },
              { label: "Unattributed", val: data.statusBreakdown.none,      color: "var(--muted)" },
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderTop: "1px solid var(--line)", fontSize: "0.7rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-mid)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: r.color, display: "inline-block" }} />
                  {r.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink-hi)" }}>{r.val}</span>
              </div>
            ))}
            {/* Luca note */}
            <div style={{
              marginTop: 14, padding: "10px 12px",
              background: "var(--accent-dim)", border: "1px solid var(--accent-line)",
              borderLeft: "2px solid var(--accent)", borderRadius: "0 4px 4px 0",
              animation: "lucaPulse 3.5s 1s ease-in-out infinite",
            }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 5 }}>Luca · Registry Note</p>
              <p style={{ fontSize: "0.71rem", color: "var(--ink-mid)", lineHeight: 1.55 }}>
                {data.totalAgents} agents indexed. {data.manifestFiled} manifest filed. Attribution coverage is {data.coveragePct}%. Most agents require a wallet manifest before books can be generated.
              </p>
            </div>
            <div style={{ marginTop: 14 }}>
              <Link href="/registry#verify" style={{
                fontSize: "0.72rem", fontWeight: 600, padding: "7px 16px", borderRadius: 6,
                background: "var(--accent)", color: "#0A0B0D", border: "1px solid var(--accent)", textDecoration: "none",
              }}>Submit Manifest →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE DATA BANNER ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 32px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "2px solid var(--accent)", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, animation: "lucaPulse 2s ease-in-out infinite" }} />
          <p style={{ fontSize: "0.72rem", color: "var(--ink-mid)", lineHeight: 1.5, margin: 0 }}>
            <strong style={{ color: "var(--ink-hi)" }}>All data on this page is live.</strong> Agent count, attribution status, books state, and economic metrics update in real time from the Zetta registry. Financial values show <strong style={{ color: "var(--ink-hi)" }}>—</strong> until a wallet manifest is submitted and books are generated — we never show $0.00 for missing data.
          </p>
        </div>
      </div>

      {/* ── PRODUCT ROUTING ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 64px" }}>
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>The Product</p>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-hi)", letterSpacing: "-0.01em" }}>One system. Six surfaces.</h2>
        </div>
        <div className="lp-routing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
          {[
            { label: "Public · Live",        title: "Registry",    desc: `${data.totalAgents} agents indexed with verification status, wallet attribution, books state, and financial profiles.`, href: "/registry",   link: "Browse Registry →" },
            { label: "Public · Rankings",    title: "Leaderboard", desc: "Revenue, treasury, net income, and attribution rankings across all indexed agents.", href: "/leaderboard", link: "View Leaderboard →" },
            { label: "AI Analyst",           title: "Luca",        desc: "Reads attributed books, cites sources, and refuses to invent missing data. Ask about any agent.", href: "/luca",       link: "Ask Luca →" },
            { label: "Public · Intelligence",title: "Research",    desc: "Analyst-grade reports on agent finance, treasury concentration, and ecosystem attribution.", href: "/research",   link: "Read Research →" },
            { label: "Developer",            title: "API",         desc: "Machine-readable books, registry, revenue, truth, and badge endpoints with scoped keys.", href: "/api",        link: "View API →" },
            { label: "Reference",            title: "Docs",        desc: "Wallet manifest schema, verification flows, API references, and developer quickstart.", href: "/docs",       link: "Read Docs →" },
          ].map((card) => (
            <div key={card.title} className="lp-routing-card" style={{ background: "var(--surface)", padding: 20, transition: "background 0.15s" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{card.label}</p>
              <p style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--ink-hi)", marginBottom: 6 }}>{card.title}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>{card.desc}</p>
              <Link href={card.href} style={{ fontSize: "0.66rem", color: "var(--accent)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>{card.link}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div className="lp-footer-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }}>
          <div>
            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink-em)", marginBottom: 8 }}>zetta</p>
            <p style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>Financial intelligence for autonomous agents. Attribution-first. Accuracy over breadth.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { href: "https://x.com/zettaaidotco", label: "X", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                { href: "https://github.com/danbuildss/zetta", label: "GitHub", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg> },
                { href: "https://t.me/asklucaai", label: "Telegram", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg> },
              ].map((s) => (
                <a key={s.label} href={s.href} title={s.label} style={{ width: 30, height: 30, borderRadius: 4, border: "1px solid var(--line-hi)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mid)", textDecoration: "none" }}>{s.icon}</a>
              ))}
            </div>
          </div>
          {[
            { title: "Products",   links: [{ l: "Registry", h: "/registry" }, { l: "Leaderboard", h: "/leaderboard" }, { l: "Luca", h: "/luca" }, { l: "Research", h: "/research" }, { l: "API", h: "/api" }] },
            { title: "Resources",  links: [{ l: "How It Works", h: "/about" }, { l: "Methodology", h: "/research" }, { l: "Submit Agent", h: "/registry#verify" }, { l: "Manifest Guide", h: "/register" }, { l: "Docs", h: "https://docs.zettaai.co/quickstart" }] },
            { title: "Company",    links: [{ l: "About", h: "/about" }, { l: "Solutions", h: "/about" }, { l: "Contact", h: "/about" }] },
          ].map((col) => (
            <div key={col.title}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>{col.title}</p>
              {col.links.map((lk) => (
                <Link key={lk.l} href={lk.h} style={{ display: "block", fontSize: "0.71rem", color: "var(--ink-mid)", marginBottom: 6, textDecoration: "none" }}>{lk.l}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--line)", maxWidth: 1200, margin: "0 auto", padding: "14px 40px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>© 2026 Zetta. All rights reserved.</span>
          <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Financial analysis generated by Luca.</span>
        </div>
      </footer>
    </>
  );
}

// ── Data fetcher + root export ─────────────────────────────────────────────────
export default function HomePage() {
  const [data, setData] = useState<PageData>({
    totalAgents: 143,
    attributed: 1,
    coveragePct: 1,
    manifestFiled: 1,
    topAgents: [],
    gdp: null,
    expenses: null,
    netIncome: null,
    statusBreakdown: { manifest: 1, inferred: 7, none: 135 },
  });

  useEffect(() => {
    fetch("/api/v1/homepage-data")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json) setData(json); })
      .catch(() => {});
  }, []);

  return <LandingPage data={data} />;
}
