"use client";

import Link from "next/link";
import { DOCS_URL } from "@/lib/docs-url";
import { LogoMark } from "@/components/logo";

type NavLink = { label: string; href: string };
type NavItem = { label: string; links: NavLink[] };

const ITEMS: NavItem[] = [
  {
    label: "Products",
    links: [
      { label: "Registry", href: "/registry" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Research", href: "/research" },
      { label: "Luca", href: "/luca" },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Methodology", href: "/methodology" },
      { label: "Submit Agent", href: "/registry#verify" },
      { label: "Validate Manifest", href: "/validate" },
      { label: "Documentation", href: DOCS_URL },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "X / Twitter", href: "https://x.com/zettaaidotco" },
      { label: "Telegram", href: "https://t.me/asklucaai" },
      { label: "Contact", href: "mailto:contact@zettaai.co" },
    ],
  },
];

export function CardNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isExternal = (href: string) => href.startsWith("http") || href.startsWith("mailto:");

  return (
    <div className={`cn-overlay${open ? " cn-open" : ""}`} onClick={onClose} role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="cn-panel" onClick={(e) => e.stopPropagation()}>

        <div className="cn-head">
          <Link href="/" onClick={onClose} className="cn-brand">
            <LogoMark size={22} />
            <span>zetta</span>
          </Link>
          <button type="button" className="cn-close" onClick={onClose} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cn-cards">
          {ITEMS.map((item, i) => (
            <div
              key={item.label}
              className="cn-card"
              style={{ transitionDelay: open ? `${i * 55}ms` : `${(ITEMS.length - 1 - i) * 35}ms` }}
            >
              <p className="cn-card-label">{item.label}</p>
              <div className="cn-card-links">
                {item.links.map((link) =>
                  isExternal(link.href) ? (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="cn-card-link" onClick={onClose}>
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.href} href={link.href} className="cn-card-link" onClick={onClose}>
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="cn-foot">
          <Link href="/access" className="lp-btn-ghost" onClick={onClose}>Sign In</Link>
          <Link href="/registry#verify" className="lp-btn-primary" onClick={onClose}>Submit Agent</Link>
        </div>
      </div>
    </div>
  );
}
