"use client";

import { useState } from "react";
import { StitchHeader, StitchIcon, StitchShell } from "@/components/stitch-app";

type Theme  = "Dark" | "Light" | "System";
type Format = "CSV" | "PDF" | "JSON";

export default function SettingsPage() {
  const [theme,     setTheme]     = useState<Theme>("Dark");
  const [timezone,  setTimezone]  = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [format,    setFormat]    = useState<Format>("CSV");
  const [rawMeta,   setRawMeta]   = useState(true);
  const [saved,     setSaved]     = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <StitchShell>
      <StitchHeader title="Settings" description="Manage your preferences and account." />

      <section className="stitch-settings-stack">
        {/* ---- Account ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>
            <StitchIcon name="person" /> Account Information
          </h3>

          <div className="stitch-setting-row">
            <div>
              <strong>User Email</strong>
              <p>dev.ops@x402books.io</p>
            </div>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "100px",
              background: "rgba(71,199,139,0.1)",
              color: "var(--s-primary)",
            }}>
              Verified
            </span>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Plan Type</strong>
              <p>Private Beta</p>
            </div>
            <button className="stitch-button" type="button" style={{ fontSize: "12px", padding: "5px 12px" }}>
              <StitchIcon name="open_in_new" /> Manage Billing
            </button>
          </div>
        </div>

        {/* ---- Upgrade card ---- */}
        <div className="stitch-card" style={{ background: "rgba(71,199,139,0.04)", border: "1px solid rgba(71,199,139,0.15)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-primary)", margin: "0 0 4px" }}>
                <StitchIcon name="workspace_premium" /> Enterprise
              </p>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--s-ink)", margin: "0 0 4px" }}>
                Upgrade to Enterprise
              </h3>
              <p style={{ fontSize: "12px", color: "var(--s-muted)", margin: 0 }}>
                Unlock team ledgers, custom API limits, and priority support.
              </p>
            </div>
            <button className="stitch-button" type="button" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              View Plans
            </button>
          </div>
        </div>

        {/* ---- General ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>
            <StitchIcon name="tune" /> General Settings
          </h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Theme Preference</strong>
              <p>Choose how x402Books AI appears.</p>
            </div>
            <div className="stitch-segmented">
              {(["Dark", "Light", "System"] as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={theme === t ? "active" : ""}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>System Timezone</strong>
              <p>Used for reports and transaction timestamps.</p>
            </div>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="UTC">GMT+0 — Coordinated Universal Time</option>
              <option value="EST">GMT-5 — Eastern Standard Time</option>
              <option value="PST">GMT-8 — Pacific Standard Time</option>
              <option value="WAT">GMT+1 — West Africa Time</option>
              <option value="CET">GMT+1 — Central European Time</option>
            </select>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Date Format</strong>
              <p>Displayed in reports and the ledger.</p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {["YYYY-MM-DD", "DD/MM/YYYY"].map((f) => (
                <label
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 12px",
                    background: dateFormat === f ? "rgba(71,199,139,0.07)" : "var(--s-surface-hover)",
                    border: `1px solid ${dateFormat === f ? "rgba(71,199,139,0.35)" : "var(--s-border)"}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: dateFormat === f ? "var(--s-primary)" : "var(--s-muted)",
                  }}
                >
                  <input
                    type="radio"
                    name="dateFormat"
                    checked={dateFormat === f}
                    onChange={() => setDateFormat(f)}
                    style={{ accentColor: "var(--s-primary)", width: "13px", height: "13px", margin: 0 }}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Export ---- */}
        <div className="stitch-card stitch-settings-card">
          <h3>
            <StitchIcon name="ios_share" /> Export Preferences
          </h3>

          <div className="stitch-setting-row">
            <div>
              <strong>Default Format</strong>
              <p>Set your primary file format for one-click ledger exports.</p>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["CSV", "PDF", "JSON"] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: format === f ? "rgba(71,199,139,0.1)" : "var(--s-surface-hover)",
                    color: format === f ? "var(--s-primary)" : "var(--s-muted)",
                    border: `1px solid ${format === f ? "rgba(71,199,139,0.3)" : "var(--s-border)"}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="stitch-setting-row">
            <div>
              <strong>Include Raw Metadata</strong>
              <p>Append machine-readable block hashes and original raw JSON to export files.</p>
            </div>
            <label className="stitch-toggle">
              <input
                type="checkbox"
                checked={rawMeta}
                onChange={(e) => setRawMeta(e.target.checked)}
              />
              <span />
            </label>
          </div>
        </div>
      </section>

      {/* ---- Save / Reset ---- */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <button className="stitch-button" type="button" onClick={() => {
          setTheme("Dark");
          setTimezone("UTC");
          setDateFormat("YYYY-MM-DD");
          setFormat("CSV");
          setRawMeta(true);
        }}>
          Reset to Defaults
        </button>
        <button
          className="stitch-primary"
          type="button"
          onClick={handleSave}
          style={{ minWidth: "120px", justifyContent: "center" }}
        >
          {saved ? <><StitchIcon name="check" /> Saved!</> : "Save Changes"}
        </button>
      </div>
    </StitchShell>
  );
}
