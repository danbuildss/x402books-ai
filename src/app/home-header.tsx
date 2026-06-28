"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import { CardNav } from "@/components/card-nav";

const SOCIAL = [
  {
    href: "https://x.com/zettaaidotco",
    label: "X (Twitter)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.255 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    href: "https://t.me/asklucaai",
    label: "Telegram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

const NAV_LINKS = [
  { href: "/registry",    label: "Registry"    },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/adopt",       label: "Adopt"       },
  { href: "/research",    label: "Research"    },
  { href: "/api",          label: "API"         },
  { href: "/docs",        label: "Docs"        },
  { href: "/luca",        label: "Luca"        },
];

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
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href}>{l.label}</Link>
          ))}
        </nav>
        <div className="lp-header-right">
          <div className="lp-social-icons lp-social-icons-desktop">
            {SOCIAL.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="lp-social-icon">{s.icon}</a>
            ))}
          </div>
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/registry" className="lp-btn-primary">Explore Registry</Link>
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
