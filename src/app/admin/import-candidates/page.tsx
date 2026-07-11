"use client";

import { useEffect, useState, useCallback } from "react";

interface Candidate {
  id: string;
  ca: string;
  ticker: string | null;
  name: string | null;
  source: string | null;
  dune_data: Record<string, unknown> | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

type Filter = "pending" | "approved" | "rejected";

export default function ImportCandidatesPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async (status: Filter) => {
    setLoading(true);
    const res = await fetch(`/api/admin/import-candidates?status=${status}`, {
      headers: {
        authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY ?? ""}`,
      },
    });
    const json = await res.json();
    setCandidates(json.candidates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  async function act(id: string, status: "approved" | "rejected") {
    setActing(id);
    await fetch("/api/admin/import-candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setActing(null);
  }

  const fmt = (v: unknown) =>
    v == null ? "—" : typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(v);

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Import Candidates</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
        Tokens from Dune query 6900376 not matched to an existing registry agent.
        Approve to add to registry as Candidate. Reject to dismiss.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["pending", "approved", "rejected"] as Filter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "0.3rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #333",
              background: filter === s ? "#fff" : "transparent",
              color: filter === s ? "#000" : "#888",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>Loading…</p>
      ) : candidates.length === 0 ? (
        <p style={{ color: "#888" }}>No {filter} candidates.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #333", color: "#888" }}>
              <th style={{ textAlign: "left", padding: "0.4rem 0.6rem" }}>Name</th>
              <th style={{ textAlign: "left", padding: "0.4rem 0.6rem" }}>Ticker</th>
              <th style={{ textAlign: "left", padding: "0.4rem 0.6rem" }}>Contract</th>
              <th style={{ textAlign: "right", padding: "0.4rem 0.6rem" }}>Price</th>
              <th style={{ textAlign: "right", padding: "0.4rem 0.6rem" }}>Vol 24h</th>
              <th style={{ textAlign: "right", padding: "0.4rem 0.6rem" }}>MCap</th>
              {filter === "pending" && <th style={{ padding: "0.4rem 0.6rem" }} />}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const d = c.dune_data ?? {};
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "0.5rem 0.6rem" }}>{c.name ?? "—"}</td>
                  <td style={{ padding: "0.5rem 0.6rem", color: "#aaa" }}>
                    {c.ticker ? `$${c.ticker}` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.6rem" }}>
                    <a
                      href={`https://basescan.org/token/${c.ca}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#5B9EF4", textDecoration: "none" }}
                    >
                      {c.ca.slice(0, 6)}…{c.ca.slice(-4)}
                    </a>
                  </td>
                  <td style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>
                    ${fmt(d.current_price)}
                  </td>
                  <td style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>
                    ${fmt(d.volume_24h)}
                  </td>
                  <td style={{ padding: "0.5rem 0.6rem", textAlign: "right" }}>
                    ${fmt(d.market_cap)}
                  </td>
                  {filter === "pending" && (
                    <td style={{ padding: "0.5rem 0.6rem", whiteSpace: "nowrap" }}>
                      <button
                        disabled={acting === c.id}
                        onClick={() => act(c.id, "approved")}
                        style={{
                          marginRight: "0.4rem",
                          padding: "0.2rem 0.6rem",
                          background: "#4AE8A0",
                          color: "#fff",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          opacity: acting === c.id ? 0.5 : 1,
                        }}
                      >
                        Approve
                      </button>
                      <button
                        disabled={acting === c.id}
                        onClick={() => act(c.id, "rejected")}
                        style={{
                          padding: "0.2rem 0.6rem",
                          background: "rgba(244,96,96,0.30)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          opacity: acting === c.id ? 0.5 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
