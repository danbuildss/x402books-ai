"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { PendingUpdate } from "@/lib/registry-db";

// ── Constants ─────────────────────────────────────────────────────────────────

const UPDATE_TYPE_LABELS: Record<string, string> = {
  new_agent: "New Agent",
  score_update: "Score Update",
  wallet_update: "Wallet Update",
  status_change: "Status Change",
};

const UPDATE_TYPE_COLORS: Record<string, string> = {
  new_agent: "#22c55e",
  score_update: "#3b82f6",
  wallet_update: "#f59e0b",
  status_change: "#a855f7",
};

const GROUP_ORDER = ["new_agent", "score_update", "wallet_update", "status_change"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Proposed Data Card ────────────────────────────────────────────────────────

function ProposedDataCard({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  if (entries.length === 0) {
    return <p style={{ color: "#888", fontSize: 13 }}>No data provided.</p>;
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: "6px 12px",
      marginTop: 8,
    }}>
      {entries.map(([key, val]) => {
        const isMonospace =
          key.toLowerCase().includes("address") ||
          key.toLowerCase().includes("token");
        const displayVal = Array.isArray(val)
          ? val.join(", ")
          : typeof val === "object"
            ? JSON.stringify(val)
            : String(val);

        return (
          <div key={key} style={{ fontSize: 13 }}>
            <span style={{ color: "#888", display: "block", fontSize: 11 }}>{key}</span>
            <span style={{ wordBreak: "break-all", fontFamily: isMonospace ? "monospace" : "inherit" }}>
              {displayVal || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Update Card ───────────────────────────────────────────────────────────────

function UpdateCard({
  update,
  onDone,
  secret,
}: {
  update: PendingUpdate;
  onDone: (id: string) => void;
  secret: string;
}) {
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function act(action: "approve" | "reject") {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/registry/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ id: update.id, action, notes: notes || undefined }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        onDone(update.id);
      } else {
        setState("error");
        setErrorMsg(data.error ?? "Unknown error");
      }
    } catch {
      setState("error");
      setErrorMsg("Network error");
    }
  }

  const typeColor = UPDATE_TYPE_COLORS[update.update_type] ?? "#888";

  return (
    <article style={{
      background: "var(--card-bg, #111)",
      border: "1px solid var(--border, #222)",
      borderRadius: 10,
      padding: "16px 18px",
      marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>{update.agent_name}</strong>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 99,
          background: `${typeColor}22`,
          color: typeColor,
          letterSpacing: 0.3,
        }}>
          {UPDATE_TYPE_LABELS[update.update_type] ?? update.update_type}
        </span>
        <span style={{ fontSize: 12, color: "#888", marginLeft: "auto" }}>
          {formatDate(update.created_at)}
        </span>
      </div>

      {/* Diff summary */}
      {update.diff_summary && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Diff summary</p>
          <p style={{ fontSize: 13 }}>{update.diff_summary}</p>
        </div>
      )}

      {/* Luca notes */}
      {update.luca_notes && (
        <div style={{
          background: "var(--card-bg-2, #181818)",
          border: "1px solid var(--border, #222)",
          borderRadius: 7,
          padding: "8px 12px",
          marginBottom: 10,
        }}>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Luca&apos;s notes</p>
          <p style={{ fontSize: 13 }}>{update.luca_notes}</p>
        </div>
      )}

      {/* Proposed data */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Proposed data</p>
        <ProposedDataCard data={update.proposed_data} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Reviewer notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={state === "loading"}
          style={{
            flex: 1,
            minWidth: 180,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border, #333)",
            background: "var(--input-bg, #0a0a0a)",
            color: "inherit",
            fontSize: 13,
          }}
        />
        <button
          type="button"
          onClick={() => act("approve")}
          disabled={state === "loading"}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: "#22c55e",
            color: "#000",
            fontWeight: 600,
            fontSize: 13,
            cursor: state === "loading" ? "not-allowed" : "pointer",
            opacity: state === "loading" ? 0.6 : 1,
          }}
        >
          {state === "loading" ? "…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={state === "loading"}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: "#ef4444",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: state === "loading" ? "not-allowed" : "pointer",
            opacity: state === "loading" ? 0.6 : 1,
          }}
        >
          Reject
        </button>
      </div>

      {state === "error" && (
        <p style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{errorMsg}</p>
      )}
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegistryUpdatesPage() {
  const [secret, setSecret] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPendingUpdates = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/registry/pending", {
        headers: { Authorization: `Bearer ${s}` },
      });
      if (res.status === 401) {
        setAuthError("Wrong secret.");
        setAuthed(false);
        setLoading(false);
        return;
      }
      const data = await res.json() as { ok: boolean; updates?: PendingUpdate[] };
      if (data.ok) {
        setUpdates(data.updates ?? []);
        setAuthed(true);
        setAuthError("");
      }
    } catch {
      setAuthError("Network error.");
    }
    setLoading(false);
  }, []);

  function handleDone(id: string) {
    setUpdates((prev) => prev.filter((u) => u.id !== id));
  }

  // Group by update_type
  const grouped: Record<string, PendingUpdate[]> = {};
  for (const u of updates) {
    if (!grouped[u.update_type]) grouped[u.update_type] = [];
    grouped[u.update_type].push(u);
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{ maxWidth: 380, width: "100%" }}>
          <Link href="/luca-admin" style={{ fontSize: 13, color: "#888", textDecoration: "none", display: "block", marginBottom: 16 }}>
            ← Luca Admin
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Registry Updates</h1>
          <p style={{ color: "#888", marginBottom: 20, fontSize: 14 }}>
            Enter your internal secret to review pending updates from Luca.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); loadPendingUpdates(secret); }}>
            <input
              type="password"
              placeholder="X402BOOKS_INTERNAL_SECRET"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 7,
                border: "1px solid #333",
                background: "#0a0a0a",
                color: "inherit",
                fontSize: 14,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            {authError && (
              <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{authError}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 7,
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <Link href="/luca-admin" style={{ fontSize: 13, color: "#888", textDecoration: "none" }}>
          ← Luca Admin
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Registry Updates</h1>
        <span style={{
          marginLeft: "auto",
          fontSize: 13,
          padding: "3px 10px",
          borderRadius: 99,
          background: updates.length > 0 ? "#f59e0b22" : "#22222222",
          color: updates.length > 0 ? "#f59e0b" : "#888",
        }}>
          {updates.length} pending
        </span>
        <button
          type="button"
          onClick={() => loadPendingUpdates(secret)}
          disabled={loading}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #333",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {/* Empty state */}
      {!loading && updates.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          border: "1px dashed #333",
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>✓</p>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No pending updates</p>
          <p style={{ color: "#888", fontSize: 14 }}>
            Luca has no queued changes waiting for review.
          </p>
        </div>
      )}

      {/* Grouped updates */}
      {GROUP_ORDER.map((type) => {
        const group = grouped[type];
        if (!group || group.length === 0) return null;
        return (
          <section key={type} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: UPDATE_TYPE_COLORS[type] ?? "#888",
              marginBottom: 14,
            }}>
              {UPDATE_TYPE_LABELS[type]} ({group.length})
            </h2>
            {group.map((u) => (
              <UpdateCard key={u.id} update={u} onDone={handleDone} secret={secret} />
            ))}
          </section>
        );
      })}
    </main>
  );
}
