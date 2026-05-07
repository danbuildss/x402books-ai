"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" },
  { href: "/transactions", label: "Transactions", icon: "M7 3v18M17 3v18M4 7h16M4 17h16" },
  { href: "/categories", label: "Categories", icon: "M7 7h10v10H7zM4 4h4v4H4zM16 16h4v4h-4z" },
  { href: "/reports", label: "Reports", icon: "M6 3h9l3 3v15H6V3Zm8 0v4h4" },
  { href: "/wallets", label: "Wallets", icon: "M4 7h16v12H4V7Zm12 5h4" },
  { href: "/api", label: "API", icon: "M8 9 4 12l4 3M16 9l4 3-4 3M13 6l-2 12" },
  { href: "/settings", label: "Settings", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/transactions": "Transactions",
  "/categories": "Categories",
  "/reports": "Reports",
  "/wallets": "Wallets",
  "/api": "API",
  "/settings": "Settings",
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
  const currentPage = pageTitles[pathname] || "Overview";

  return (
    <div className="product-shell" data-theme="dark">
      <aside className="product-sidebar">
        <div>
          <Logo />
          <p>Onchain books for Base USDC activity.</p>
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
          <span>Stage 1</span>
          <p>Wallet scanner, categorized ledger, exports, and reports.</p>
          <Link href="/dashboard">Scan Wallet</Link>
        </div>

        <div className="sidebar-account">
          <span>xB</span>
          <div>
            <strong>Private beta</strong>
            <p>x402Books workspace</p>
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
          <Link href="/dashboard">Scan</Link>
          <Link href="/api">API</Link>
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
