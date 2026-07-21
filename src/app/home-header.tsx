"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import { CardNav } from "@/components/card-nav";
import { DOCS_URL } from "@/lib/docs-url";

type NavChild = { href: string; label: string; external?: boolean };
type NavGroup = { label: string; href?: string; children?: NavChild[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Products",
    children: [
      { href: "/registry", label: "Registry" },
      { href: "/luca", label: "Luca" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/api", label: "API" },
      { href: DOCS_URL, label: "Docs", external: true },
    ],
  },
  {
    label: "Solutions",
    children: [
      { href: "/registry#verify", label: "For agent teams" },
      { href: "/developer", label: "For developers" },
      { href: "/research", label: "Research" },
    ],
  },
  { label: "About", href: "/about" },
];

function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  if (!group.children) {
    return <Link href={group.href ?? "/"}>{group.label}</Link>;
  }
  return (
    <span
      className="lp-nav-dd"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        {group.label}
        <span aria-hidden="true" style={{ fontSize: "0.6rem", opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <span
          style={{
            position: "absolute", top: "100%", left: -12, paddingTop: 8, zIndex: 60,
          }}
        >
          <span style={{
            display: "flex", flexDirection: "column", minWidth: 168,
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8,
            padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}>
            {group.children.map((c) =>
              c.external ? (
                <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="lp-nav-dd-item">{c.label} ↗</a>
              ) : (
                <Link key={c.label} href={c.href} className="lp-nav-dd-item">{c.label}</Link>
              ),
            )}
          </span>
        </span>
      )}
    </span>
  );
}

export function HomeHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="lp-header">
        <a href="/" className="lp-brand"><Logo /></a>
        <nav className="lp-nav" aria-label="Main navigation">
          {NAV_GROUPS.map((g) => <NavDropdown key={g.label} group={g} />)}
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/registry" className="lp-btn-ghost lp-signin-desktop">Explore Registry</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
          <button type="button" className="lp-hamburger" aria-label="Open menu" onClick={() => setOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      <CardNav open={open} onClose={() => setOpen(false)} />
    </>
  );
}
