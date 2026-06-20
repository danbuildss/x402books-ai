"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "My Agent",  icon: "M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2Zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4Z" },
  { href: "/registry",  label: "Registry",  icon: "M4 6h16M4 10h16M4 14h10" },
  { href: "/developer", label: "Developer", icon: "M8 9 4 12l4 3M16 9l4 3-4 3M13 6l-2 12" },
  { href: "/settings",  label: "Settings",  icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "My Agent",
  "/registry":  "Registry",
  "/developer": "Developer",
  "/settings":  "Settings",
};

function Icon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentPage = pageTitles[pathname] || "My Agent";

  return (
    <div className="product-shell" data-theme="dark">
      <aside className="product-sidebar">
        <div>
          <Logo />
          <p>Financial identity for autonomous agents.</p>
        </div>

        <nav className="product-nav" aria-label="Product navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link className={isActive ? "active" : ""} href={item.href} key={item.href}>
                <Icon path={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span>Agent Registry</span>
          <p>84+ agents indexed. Declare wallets, get verified, go live.</p>
          <Link href="/registry">Browse Registry</Link>
        </div>

        <div className="sidebar-account">
          <span>xB</span>
          <div>
            <strong>Zetta</strong>
            <p>Financial identity layer</p>
          </div>
          <small>⌄</small>
        </div>
      </aside>

      <header className="product-topbar">
        <div>
          <span>Workspace</span>
          <strong>{currentPage}</strong>
        </div>
        <div className="topbar-actions">
          <Link href="/registry">Registry</Link>
          <Link href="/developer">API</Link>
        </div>
      </header>

      <section className="product-main">{children}</section>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="product-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function WalletSelect({
  wallet,
  onCopy,
}: {
  wallet?: string;
  onCopy?: () => void;
}) {
  const display = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "No wallet";

  return (
    <div className="control-pill">
      <span>Wallet</span>
      <strong>{display}</strong>
      <button type="button" aria-label="Copy wallet address" onClick={onCopy}>
        ⧉
      </button>
    </div>
  );
}

export function DateFilter({
  range = "30d",
  onChange,
}: {
  range?: "7d" | "30d";
  onChange?: (range: "7d" | "30d") => void;
}) {
  return (
    <div className="range-tabs" aria-label="Date range">
      {(["7d", "30d"] as const).map((value) => (
        <button
          className={range === value ? "active" : ""}
          key={value}
          type="button"
          onClick={() => onChange?.(value)}
        >
          {value === "7d" ? "Last 7 days" : "Last 30 days"}
        </button>
      ))}
    </div>
  );
}
