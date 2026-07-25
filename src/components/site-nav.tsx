"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/effects";
import { LogoMark } from "@/components/logo";

type DropdownItem = { title: string; desc: string; href: string };

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
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

export function SiteNav() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", height: 48,
      background: "var(--nav-bg, rgba(12,13,16,0.92))",
      borderBottom: "1px solid var(--line)",
      backdropFilter: "blur(16px)",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
        <LogoMark size={20} />
        <span style={{ fontSize: "0.88rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink-em)" }}>zetta</span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <NavDropdown label="Product" items={[
          { title: "Registry",    desc: "143 indexed agents with attribution and books status.", href: "/registry" },
          { title: "Agent Books", desc: "Attributed wallet activity turned into readable financials.", href: "/registry" },
          { title: "Leaderboard", desc: "Revenue and attribution rankings across all agents.", href: "/leaderboard" },
          { title: "Luca",        desc: "AI financial analyst. Reads books, cites sources, never invents data.", href: "/luca" },
        ]} />
        <NavDropdown label="Solutions" items={[
          { title: "For Agent Teams",    desc: "Submit a manifest, get attributed books, share your financial profile.", href: "/registry#verify" },
          { title: "Surplus × Zetta",    desc: "Financial visibility for agents routing inference through Surplus.", href: "/surplus" },
          { title: "For Developers",     desc: "API access to agent books, registry, revenue, and badge endpoints.", href: "/api" },
          { title: "For Researchers",    desc: "Analyst-grade reports on agent finance and ecosystem attribution.", href: "/research" },
        ]} />
        <NavDropdown label="About Us" items={[
          { title: "What is Zetta", desc: "Financial intelligence infrastructure for autonomous agents.", href: "/about" },
          { title: "Methodology",   desc: "How we classify wallets, revenue, and attribution confidence.", href: "/research" },
          { title: "Contact",       desc: "Get in touch with the Zetta team.", href: "/about" },
        ]} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <ThemeToggle />
        <Link
          href="/access"
          style={{
            fontSize: "0.74rem", fontWeight: 600, padding: "5px 14px", borderRadius: 6,
            border: "1px solid var(--line-hi)", color: "var(--ink-hi)", background: "var(--surface-hi)",
            textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          Sign In
        </Link>
      </div>
    </nav>
  );
}
