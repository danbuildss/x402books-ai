"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";

function ReportRedirect() {
  const params = useSearchParams();
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    const w = params.get("wallet");
    const r = params.get("range") || "30d";
    if (w) {
      window.location.replace(`/report/${encodeURIComponent(w)}?range=${r}`);
    }
  }, [params]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const w = wallet.trim();
    if (w) window.location.assign(`/report/${encodeURIComponent(w)}`);
  }

  return (
    <main className="pub-report-page">
      <header className="pub-report-header">
        <a href="/" className="pub-report-brand">
          <Logo />
          <span>x402Books AI</span>
        </a>
      </header>
      <div className="pub-report-body">
        <div className="pub-report-hero" style={{ maxWidth: "520px" }}>
          <div>
            <p className="pub-report-label">Shareable Report</p>
            <h1>View any Base wallet report.</h1>
            <p className="pub-report-narrative">
              Enter a Base wallet address to generate a public, shareable financial report.
            </p>
          </div>
          <form onSubmit={onSubmit} style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
              style={{
                flex: "1 1 280px",
                height: "40px",
                padding: "0 12px",
                border: "1px solid rgba(109,184,116,0.25)",
                borderRadius: "8px",
                background: "rgba(21,23,22,0.8)",
                color: "#E8E6E1",
                fontFamily: "monospace",
                fontSize: "13px",
              }}
            />
            <button className="pub-report-btn primary" type="submit">View Report</button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportRedirect />
    </Suspense>
  );
}
