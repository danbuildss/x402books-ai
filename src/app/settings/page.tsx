"use client";

import { useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";

export default function SettingsPage() {
  const [theme, setTheme] = useState("Dark");
  const [exportFormat, setExportFormat] = useState("CSV");
  const [includeRawData, setIncludeRawData] = useState(true);

  return (
    <AppShell>
      <PageHeader title="Settings" description="Manage your preferences and account." />

      <section className="settings-stack">
        <div className="content-card settings-card">
          <h2>General</h2>
          <div className="setting-row">
            <div><strong>Theme</strong><p>Choose how x402Books appears.</p></div>
            <div className="segmented-control">
              {["Dark", "Light", "System"].map((value) => (
                <button
                  className={theme === value ? "active" : ""}
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Timezone</strong><p>Used for reports and transaction timestamps.</p></div>
            <select defaultValue="UTC">
              <option value="UTC">(UTC) Coordinated Universal Time</option>
              <option value="WAT">(WAT) West Africa Time</option>
            </select>
          </div>
          <div className="setting-row">
            <div><strong>Date Format</strong><p>Used across dashboard tables and reports.</p></div>
            <select defaultValue="MMM D, YYYY">
              <option value="MMM D, YYYY">May 18, 2026</option>
              <option value="YYYY-MM-DD">2026-05-18</option>
            </select>
          </div>
        </div>

        <div className="content-card settings-card">
          <h2>Export Preferences</h2>
          <div className="setting-row">
            <div><strong>Default Export Format</strong><p>Preferred file type for reports.</p></div>
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
              <option>CSV</option>
              <option>PDF</option>
            </select>
          </div>
          <div className="setting-row">
            <div><strong>Include Raw Data</strong><p>Include raw transaction data in exports.</p></div>
            <label className="toggle-switch">
              <input
                checked={includeRawData}
                type="checkbox"
                onChange={(event) => setIncludeRawData(event.target.checked)}
              />
              <span />
            </label>
          </div>
        </div>

        <div className="content-card settings-card">
          <h2>Account</h2>
          <div className="setting-row">
            <div><strong>Email</strong><p>builder@x402.dev</p></div>
          </div>
          <div className="setting-row">
            <div><strong>Plan</strong><p>Private beta</p></div>
            <button type="button" onClick={() => window.alert("Billing comes in Stage 2.")}>
              Manage Billing
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
