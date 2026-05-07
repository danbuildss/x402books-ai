"use client";

import { useState } from "react";
import { StitchHeader, StitchShell } from "@/components/stitch-app";

export default function SettingsPage() {
  const [theme, setTheme] = useState("Dark");
  const [format, setFormat] = useState("CSV");
  const [raw, setRaw] = useState(true);

  return (
    <StitchShell>
      <StitchHeader title="Settings" description="Manage your preferences and account." />

      <section className="stitch-settings-stack">
        <div className="stitch-card stitch-settings-card">
          <h3>General</h3>
          <div className="stitch-setting-row">
            <div><strong>Theme</strong><p>Choose how x402Books appears.</p></div>
            <div className="stitch-segmented">
              {["Dark", "Light", "System"].map((value) => (
                <button className={theme === value ? "active" : ""} key={value} type="button" onClick={() => setTheme(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="stitch-setting-row">
            <div><strong>Timezone</strong><p>Used for reports and transaction timestamps.</p></div>
            <select defaultValue="UTC">
              <option value="UTC">(UTC) Coordinated Universal Time</option>
              <option value="WAT">(WAT) West Africa Time</option>
            </select>
          </div>
        </div>

        <div className="stitch-card stitch-settings-card">
          <h3>Export Preferences</h3>
          <div className="stitch-setting-row">
            <div><strong>Default Export Format</strong><p>Preferred file type for reports.</p></div>
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              <option>CSV</option>
              <option>PDF</option>
            </select>
          </div>
          <div className="stitch-setting-row">
            <div><strong>Include Raw Data</strong><p>Include raw transaction data in exports.</p></div>
            <label className="stitch-toggle">
              <input checked={raw} type="checkbox" onChange={(event) => setRaw(event.target.checked)} />
              <span />
            </label>
          </div>
        </div>

        <div className="stitch-card stitch-settings-card">
          <h3>Account</h3>
          <div className="stitch-setting-row"><div><strong>Workspace</strong><p>Private beta workspace</p></div></div>
          <div className="stitch-setting-row"><div><strong>Plan</strong><p>Private beta</p></div><button type="button">Manage Billing</button></div>
        </div>
      </section>
    </StitchShell>
  );
}

