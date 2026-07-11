"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Settings</h1>
        <p className="op-page-sub">Manage your workspace preferences.</p>
      </div>

      <div className="op-card">
        <h2 className="op-card-title" style={{ marginBottom: 4 }}>Linked Wallet</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
          Your linked wallet is used to match agents in the registry and determine your API tier based on $LUCA balance.
        </p>

        {wallet && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "var(--surface-soft)", borderRadius: 7, border: "1px solid var(--line)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4AE8A0", flexShrink: 0 }} />
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
          <p style={{ fontSize: "0.78rem", color: saveMsg.includes("success") || saveMsg.includes("Wallet linked") ? "#4AE8A0" : "#c0392b", marginTop: 8 }}>
            {saveMsg}
          </p>
        )}
      </div>

      <div className="op-card">
        <h2 className="op-card-title" style={{ marginBottom: 12 }}>Account</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 600, color: "var(--ink)" }}>Session</p>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)" }}>Your access is tied to a session token via the access code flow.</p>
            </div>
            <button className="op-btn op-btn-ghost" style={{ fontSize: "0.76rem" }} onClick={signOut}>
              Sign Out
            </button>
          </div>
          <div style={{ padding: "10px 0" }}>
            <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 600, color: "var(--ink)" }}>Access code</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.74rem", color: "var(--muted)" }}>
              Access codes are managed by the Zetta team. Contact us if you need to rotate your code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
