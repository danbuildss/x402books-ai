"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LedgerCard, LedgerRow } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletInput, setWalletInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    fetch("/api/user/wallet")
      .then((r) => r.json())
      .then((d: { wallet: string | null }) => {
        setWallet(d.wallet ?? null);
        setWalletInput(d.wallet ?? "");
      })
      .catch(() => {});
  }, []);

  async function saveWallet() {
    const addr = walletInput.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setSaveMsg("Invalid address — must be 0x + 40 hex characters.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/user/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        setWallet(addr);
        setSaveMsg("Wallet linked successfully.");
      } else {
        setSaveMsg(data.error ?? "Failed to save wallet.");
      }
    } catch {
      setSaveMsg("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function unlinkWallet() {
    setUnlinking(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/user/wallet", { method: "DELETE" });
      if (res.ok) {
        setWallet(null);
        setWalletInput("");
        setSaveMsg("Wallet unlinked.");
      } else {
        setSaveMsg("Failed to unlink wallet.");
      }
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setUnlinking(false);
    }
  }

  async function signOut() {
    await fetch("/api/access", { method: "DELETE" }).catch(() => {});
    window.location.href = "/";
  }

  const SECTIONS = [
    { id: "wallet", label: "Wallet & Identity" },
    { id: "account", label: "Account" },
    { id: "keys", label: "API Keys", href: "/dashboard/keys" },
    { id: "agent", label: "My Agent", href: "/dashboard/attribution" },
  ];

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Settings</h1>
        <p className="op-page-sub">Manage your workspace preferences.</p>
      </div>

      <div className="op-settings-cols">
        {/* Section nav */}
        <nav className="op-settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) =>
            s.href ? (
              <Link key={s.id} href={s.href} className="op-settings-nav-item">{s.label} →</Link>
            ) : (
              <a key={s.id} href={`#${s.id}`} className="op-settings-nav-item">{s.label}</a>
            ),
          )}
        </nav>

        <div style={{ minWidth: 0, flex: 1 }}>
      {/* Linked Wallet */}
      <div id="wallet" />
      <LedgerCard eyebrow="Identity" title="Linked Wallet">
        <LedgerRow
          first
          label="Status"
          badge={
            wallet
              ? <StatusBadge variant="green">Linked</StatusBadge>
              : <StatusBadge variant="neutral">Not linked</StatusBadge>
          }
          value={wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—"}
          valueStyle={{ color: wallet ? "var(--ink)" : "var(--muted)" }}
        />
        <LedgerRow
          last
          label="Purpose"
          value="Agent attribution + API tier detection"
          valueStyle={{ color: "var(--muted)", fontFamily: "inherit", fontWeight: 400, fontSize: "0.75rem" }}
        />
        <div style={{ padding: "14px", borderTop: "1px solid var(--line)" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
            Your linked wallet is used to match agents in the registry and determine your API tier based on $LUCA balance.
          </p>
          {wallet && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "var(--surface-soft)", borderRadius: 7, border: "1px solid var(--line)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--ink)", flex: 1 }}>{wallet}</span>
              <button
                className="op-btn op-btn-danger"
                style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                onClick={unlinkWallet}
                disabled={unlinking}
              >
                {unlinking ? "Unlinking…" : "Unlink"}
              </button>
            </div>
          )}
          <div className="op-field">
            <label className="op-label">{wallet ? "Update wallet address" : "Wallet address"}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="op-input"
                placeholder="0x..."
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveWallet()}
              />
              <button
                className="op-btn op-btn-primary"
                onClick={saveWallet}
                disabled={saving || !walletInput.trim() || walletInput.trim() === wallet}
              >
                {saving ? "Saving…" : wallet ? "Update" : "Link"}
              </button>
            </div>
          </div>
          {saveMsg && (
            <p style={{ fontSize: "0.78rem", color: saveMsg.includes("success") || saveMsg.includes("Wallet linked") ? "var(--accent)" : "var(--negative)", marginTop: 8 }}>
              {saveMsg}
            </p>
          )}
        </div>
      </LedgerCard>

      {/* Account */}
      <div id="account" />
      <LedgerCard eyebrow="Account" title="Account">
        <LedgerRow
          first
          label="Session"
          detail="Access code flow — session token"
          value={
            <button className="op-btn op-btn-ghost" style={{ fontSize: "0.76rem" }} onClick={signOut}>
              Sign Out
            </button>
          }
        />
        <LedgerRow
          last
          label="Access code"
          value="Managed by Zetta team"
          valueStyle={{ color: "var(--muted)", fontFamily: "inherit", fontWeight: 400 }}
          detail="Contact us to rotate"
        />
      </LedgerCard>
        </div>
      </div>
    </div>
  );
}
