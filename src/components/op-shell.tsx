"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/logo";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="6" height="6" rx="1.2" /><rect x="9" y="1" width="6" height="6" rx="1.2" />
            <rect x="1" y="9" width="6" height="6" rx="1.2" /><rect x="9" y="9" width="6" height="6" rx="1.2" />
          </svg>
        ),
      },
      {
        label: "My Agents",
        href: "/dashboard/agents",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
        ),
      },
      {
        label: "Attribution",
        href: "/dashboard/attribution",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1v14M1 8h14" /><circle cx="8" cy="8" r="3" />
          </svg>
        ),
      },
      {
        label: "Luca",
        href: "/dashboard/luca",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V4a1 1 0 011-1z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Build",
    items: [
      {
        label: "Developer",
        href: "/dashboard/developer",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4,5 1,8 4,11" /><polyline points="12,5 15,8 12,11" /><line x1="9" y1="3" x2="7" y2="13" />
          </svg>
        ),
      },
      {
        label: "API Keys",
        href: "/dashboard/keys",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5.5" cy="8" r="3.5" /><path d="M9 8h6M13 6v4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Treasury",
        href: "/dashboard/treasury",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="5" width="14" height="9" rx="1.5" /><path d="M4 5V3.5A1.5 1.5 0 015.5 2h5A1.5 1.5 0 0112 3.5V5" /><circle cx="8" cy="9.5" r="1.5" />
          </svg>
        ),
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="1" width="10" height="14" rx="1.5" /><path d="M6 5h4M6 8h4M6 11h2" />
          </svg>
        ),
      },
      {
        label: "Billing",
        href: "/dashboard/billing",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="14" height="10" rx="1.5" /><path d="M1 7h14" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: (
          <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
          </svg>
        ),
      },
    ],
  },
];

export function OpShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function handleSignOut() {
    await fetch("/api/access", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="op-root">
      <aside className="op-sidebar">
        {/* Logo */}
        <div className="op-sidebar-logo">
          <LogoMark size={22} />
          <span className="op-sidebar-wordmark">Zetta</span>
        </div>
        <div className="op-sidebar-ws">Operator Workspace</div>

        {/* Nav groups */}
        <nav style={{ display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.10em",
                textTransform: "uppercase", color: "var(--faint)",
                padding: "10px 16px 3px",
              }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const exact = item.href === "/dashboard";
                const active = exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`op-nav-item${active ? " op-active" : ""}`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="op-sidebar-footer">
          <Link href="/" className="op-nav-item" style={{ fontSize: "0.74rem" }}>
            <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2H2v12h12V9M9 1h6v6M15 1L7 9" />
            </svg>
            View Public Site
          </Link>
          <button className="op-nav-item op-btn-ghost" onClick={handleSignOut} style={{ fontSize: "0.74rem" }}>
            <svg className="op-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H2v12h4M11 11l3-3-3-3M14 8H7" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="op-content">
        {children}
      </main>
    </div>
  );
}
