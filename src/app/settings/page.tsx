"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { StitchHeader, StitchIcon, StitchShell, saveTheme } from "@/components/stitch-app";
import { useLedgerState } from "@/lib/use-ledger-state";

const THEME_KEY = "x402books_theme";

export default function SettingsPage() {
  const { user, logout: privyLogout } = usePrivy();
  const ledger = useLedgerState();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "dark" | "light" | null;
    if (stored) setTheme(stored);
  }, []);

  function handleTheme(next: "dark" | "light") {
    setTheme(next);
    saveTheme(next);
  }

  function handleSave() {
    saveTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    try { await privyLogout(); } catch { /* ignore */ }
    await fetch("/api/access", { method: "DELETE" });
    window.location.assign("/");
  }

  const email =
    user?.email?.address ||
    (user?.linkedAccounts?.find((a) => a.type === "email") as { address?: string } | undefined)?.address;

  const xHandle = (
    user?.linkedAccounts?.find((a) => a.type === "twitter_oauth") as { username?: string } | undefined
  )?.username;

  return (
    <StitchShell>
      <StitchHeader title="Settings" description="Manage your preferences and account." />

      <section className="stitch-settings-stack">

        {/* ---- Account ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>Account</h3>

          {(email || xHandle) && (
            <div className="stitch-setting-row">
              <div>
                <strong>Signed in as</strong>
                <p style={{ fontFamily: email ? "inherit" : "var(--st-mono)" }}>
                  {email ?? (xHandle ? `@${xHandle}` : "—")}
                  {xHandle && email && <span style={{ color: "var(--st-muted)", marginLeft: "8px" }}>· @{xHandle}</span>}
                </p>
              </div>
            </div>
          )}

          {ledger.wallet && (
            <div className="stitch-setting-row">
              <div>
                <strong>Linked Wallet</strong>
                <p style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}>{ledger.wallet}</p>
              </div>
            </div>
          )}

          <div className="stitch-setting-row">
            <div>
              <strong>Plan</strong>
              <p>Open access — full feature access.</p>
            </div>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Session</strong>
              <p>Authenticated via Privy. Sign out to switch accounts.</p>
            </div>
            <button
              type="button"
              className="stitch-button"
              style={{ fontSize: "12px", minHeight: "30px", color: "var(--st-red)", borderColor: "var(--st-red)", whiteSpace: "nowrap" }}
              onClick={handleSignOut}
            >
              <StitchIcon name="logout" /> Sign out
            </button>
          </div>
        </div>

        {/* ---- General ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>Appearance</h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Theme</strong>
              <p>Choose how Zetta appears. Changes apply immediately.</p>
            </div>
            <div className="stitch-segmented" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={theme === t ? "active" : ""}
                  onClick={() => handleTheme(t)}
                >
                  <StitchIcon name={t === "dark" ? "dark_mode" : "light_mode"} />
                  {t === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Data ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>Data &amp; Privacy</h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Local Storage</strong>
              <p>Ledger data, notes, and theme are stored in your browser only.</p>
            </div>
            <button
              type="button"
              className="stitch-button"
              style={{ fontSize: "12px", minHeight: "30px", whiteSpace: "nowrap" }}
              onClick={() => {
                ["x402books_active_ledger", "x402books_recent_wallets", "x402books_notes"].forEach((k) =>
                  localStorage.removeItem(k),
                );
                window.location.reload();
              }}
            >
              Clear Cache
            </button>
          </div>
        </div>

      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
        <button type="button" className="stitch-button" onClick={() => handleTheme("dark")}>
          Reset to Defaults
        </button>
        <button type="button" className="stitch-primary" style={{ minWidth: "120px" }} onClick={handleSave}>
          {saved ? <><StitchIcon name="check" /> Saved!</> : "Save Changes"}
        </button>
      </div>
    </StitchShell>
  );
}
