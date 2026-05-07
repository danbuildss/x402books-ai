"use client";

import { useEffect, useState } from "react";
import { StitchHeader, StitchIcon, StitchShell, saveTheme } from "@/components/stitch-app";

const THEME_KEY = "x402books_theme";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [format, setFormat] = useState("CSV");
  const [raw, setRaw] = useState(true);
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

  return (
    <StitchShell>
      <StitchHeader title="Settings" description="Manage your preferences and account." />

      <section className="stitch-settings-stack">

        {/* ---- General ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>General</h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Theme</strong>
              <p>Choose how x402Books AI appears. Changes apply immediately.</p>
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

          <div className="stitch-setting-row">
            <div>
              <strong>Timezone</strong>
              <p>Used for reports and transaction timestamps.</p>
            </div>
            <select defaultValue="UTC">
              <option value="UTC">(UTC) Coordinated Universal Time</option>
              <option value="WAT">(UTC+1) West Africa Time</option>
              <option value="EST">(UTC-5) Eastern Standard Time</option>
              <option value="PST">(UTC-8) Pacific Standard Time</option>
              <option value="CET">(UTC+1) Central European Time</option>
            </select>
          </div>
        </div>

        {/* ---- Export ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>Export Preferences</h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Default Export Format</strong>
              <p>Preferred file type for one-click report downloads.</p>
            </div>
            <div className="stitch-segmented" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {(["CSV", "PDF"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={format === f ? "active" : ""}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Include Raw Metadata</strong>
              <p>Append block hashes and raw JSON to export files.</p>
            </div>
            <label className="stitch-toggle">
              <input checked={raw} type="checkbox" onChange={(e) => setRaw(e.target.checked)} />
              <span />
            </label>
          </div>
        </div>

        {/* ---- Account ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>Account</h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Workspace</strong>
              <p>Private beta workspace · Stage 1</p>
            </div>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Plan</strong>
              <p>Private Beta — full feature access during the test period.</p>
            </div>
            <button
              type="button"
              className="stitch-button"
              style={{ fontSize: "12px", minHeight: "30px" }}
              onClick={() => alert("Billing management opens in Stage 2.")}
            >
              Manage Billing
            </button>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Session</strong>
              <p>Signed in via beta access code. Session lasts 14 days.</p>
            </div>
            <button
              type="button"
              className="stitch-button"
              style={{ fontSize: "12px", minHeight: "30px", color: "var(--st-red)", borderColor: "var(--st-red)" }}
              onClick={async () => {
                await fetch("/api/access", { method: "DELETE" });
                window.location.assign("/");
              }}
            >
              <StitchIcon name="logout" /> Sign out
            </button>
          </div>
        </div>

      </section>

      {/* ---- Save / Reset bar ---- */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
        <button
          type="button"
          className="stitch-button"
          onClick={() => { handleTheme("dark"); setFormat("CSV"); setRaw(true); }}
        >
          Reset to Defaults
        </button>
        <button
          type="button"
          className="stitch-primary"
          style={{ minWidth: "120px" }}
          onClick={handleSave}
        >
          {saved ? <><StitchIcon name="check" /> Saved!</> : "Save Changes"}
        </button>
      </div>
    </StitchShell>
  );
}
