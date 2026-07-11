"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResearchReport } from "@/lib/research-db";

const TABS = ["Latest", "Reports", "Briefs", "Analyses"] as const;
type Tab = typeof TABS[number];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function typeBadgeColor(type: string): string {
  if (type === "weekly") return "#4AE8A0";
  if (type === "monthly") return "#5B8FA8";
  if (type === "quarterly") return "#8B7CF6";
  return "var(--muted)";
}

export function ResearchFilter({ reports }: { reports: ResearchReport[] }) {
  const [tab, setTab] = useState<Tab>("Latest");

  const filtered = reports.filter((r) => {
    if (tab === "Latest") return true;
    if (tab === "Reports") return r.type === "weekly" || r.type === "monthly";
    if (tab === "Briefs") return r.type === "weekly";
    if (tab === "Analyses") return r.type === "quarterly";
    return true;
  });

  const featured = reports[0] ?? null;
  const rest = tab === "Latest" ? filtered.slice(1) : filtered;

  return (
    <>
      {/* Featured article (latest report, always shown) */}
      {featured && tab === "Latest" && (
        <Link
          href={`/research/${featured.slug}`}
          className="rf-featured"
        >
          <div className="rf-featured-meta">
            <span className="rf-type-badge" style={{ color: typeBadgeColor(featured.type), borderColor: `color-mix(in srgb, ${typeBadgeColor(featured.type)} 35%, transparent)`, background: `color-mix(in srgb, ${typeBadgeColor(featured.type)} 10%, transparent)` }}>
              {featured.type}
            </span>
            <span className="rf-featured-date">By Luca · {fmtDate(featured.published_at)}</span>
          </div>
          <h2 className="rf-featured-title">{featured.title}</h2>
          <p className="rf-featured-summary">{featured.summary}</p>
          <span className="rf-featured-cta">Read report →</span>
        </Link>
      )}

      {/* Tab switcher */}
      <div className="rf-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`rf-tab${tab === t ? " rf-tab-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Report list */}
      {rest.length > 0 ? (
        <div className="rf-list">
          {rest.map((r) => (
            <Link key={r.id} href={`/research/${r.slug}`} className="rf-item">
              <div className="rf-item-left">
                <span
                  className="rf-type-badge"
                  style={{
                    color: typeBadgeColor(r.type),
                    borderColor: `color-mix(in srgb, ${typeBadgeColor(r.type)} 35%, transparent)`,
                    background: `color-mix(in srgb, ${typeBadgeColor(r.type)} 10%, transparent)`,
                  }}
                >
                  {r.type}
                </span>
                <h3 className="rf-item-title">{r.title}</h3>
                <p className="rf-item-summary">{r.summary.slice(0, 120)}{r.summary.length > 120 ? "…" : ""}</p>
              </div>
              <div className="rf-item-right">
                <span className="rf-item-date">{fmtDate(r.published_at)}</span>
                <span className="rf-item-cta">Read →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rf-empty">
          <p>No {tab.toLowerCase()} available yet.</p>
          <Link href="/research" onClick={() => setTab("Latest")} className="lp-btn-ghost" style={{ fontSize: "0.82rem", marginTop: 12 }}>View all</Link>
        </div>
      )}
    </>
  );
}
