"use client";

import { useState } from "react";
import Link from "next/link";
import { LedgerCard, LedgerRow, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

const WALLETS_JSON_EXAMPLE = `{
  "agent": "Your Agent Name",
  "xHandle": "@yourhandle",
  "ecosystem": "Base",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "notes": "Main protocol treasury"
    },
    {
      "address": "0x...",
      "role": "fee_recipient",
      "chain": "base",
      "notes": "Fee recipient"
    },
    {
      "address": "0x...",
      "role": "deployer",
      "chain": "base",
      "notes": "Contract deployer"
    },
    {
      "address": "0x...",
      "role": "operator",
      "chain": "base",
      "notes": "Hot wallet / operational spend"
    }
  ]
}`;

type FetchedWallet = { address: string; role: string; label: string; chain: string; notes: string | null };

export function RegisterClient() {
  const [tab, setTab] = useState<"manifest" | "manual">("manifest");
  const [copied, setCopied]     = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  // Manifest (repo) tab
  const [repoUrl, setRepoUrl]     = useState("");
  const [repoState, setRepoState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [repoMsg, setRepoMsg]     = useState("");
  const [fetchedWallets, setFetchedWallets] = useState<FetchedWallet[] | null>(null);
  const [fetchedAgent, setFetchedAgent]     = useState("");
  const [fetchedRef, setFetchedRef]         = useState("");

  // Manual tab
  const [form, setForm] = useState({
    agent_name: "", wallet_address: "", x_handle: "", notes: "", gitlawb_repo: "",
  });
  const [surplusPilot, setSurplusPilot] = useState(false);
  const [manualState, setManualState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [manualMsg, setManualMsg]     = useState("");
  const [submittedSlug, setSubmittedSlug] = useState("");
  const [submittedRef, setSubmittedRef]   = useState("");

  function copySchema() {
    navigator.clipboard.writeText(WALLETS_JSON_EXAMPLE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function submitRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setRepoState("loading");
    setFetchedWallets(null);
    setFetchedAgent("");
    try {
      const res = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string; agent?: string;
        wallets?: FetchedWallet[]; message?: string; ref_id?: string;
      };
      if (data.ok) {
        setRepoState("done");
        setRepoMsg(data.message ?? "Manifest submitted successfully.");
        setFetchedWallets(data.wallets ?? null);
        setFetchedAgent(data.agent ?? "");
        setFetchedRef(data.ref_id ?? "");
      } else {
        setRepoState("error");
        setRepoMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setRepoState("error");
      setRepoMsg("Network error. Please try again.");
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setManualState("loading");
    try {
      const res = await fetch("/api/registry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          notes: [form.notes, surplusPilot ? "[surplus_pilot_candidate]" : ""].filter(Boolean).join(" ").trim(),
        }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string; duplicate?: boolean; slug?: string; ref_id?: string;
      };
      if (data.ok) {
        setManualState("done");
        setSubmittedSlug(data.slug ?? "");
        setSubmittedRef(data.ref_id ?? "");
        setManualMsg(data.duplicate ? "Already submitted — we'll review it soon." : "Submitted! We'll verify and add your agent.");
      } else {
        setManualState("error");
        setManualMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setManualState("error");
      setManualMsg("Network error. Please try again.");
    }
  }

  return (
    <>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel style={{ marginBottom: 10, color: "var(--accent)" }}>For Agent Teams</SectionLabel>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            Register your agent.
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--muted)", maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
            Submit a wallet manifest to get attributed books, a Luca-verified profile, and a Verified badge in the registry.
          </p>
        </div>

        {/* Trust ladder */}
        <LedgerCard eyebrow="Verification path" style={{ marginBottom: 36 }}>
          <div style={{ padding: "14px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge variant="candidate">Candidate</StatusBadge>
            <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>→</span>
            <StatusBadge variant="wallets-declared">Wallets Declared</StatusBadge>
            <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>→</span>
            <StatusBadge variant="verified">Verified</StatusBadge>
            <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted)" }}>
              Submit a manifest to advance from Candidate → Verified
            </span>
          </div>
        </LedgerCard>

        {/* Form tabs */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 28, gap: 0,
        }}>
          {(["manifest", "manual"] as const).map((t) => {
            const labels: Record<typeof t, string> = { manifest: "Submit via repo manifest", manual: "Manual submission" };
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.82rem", fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? "var(--fg)" : "var(--muted)",
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1, transition: "color 0.1s",
                }}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Manifest tab */}
        {tab === "manifest" && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 20, lineHeight: 1.7 }}>
              Add a <code style={{ background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 4, fontSize: "0.8rem" }}>.agent/wallets.json</code> file to your GitHub or Gitlawb repo, then paste the repo URL below. Luca reads the manifest directly and queues your wallets for verification.
            </p>

            {/* Schema preview */}
            <LedgerCard
              eyebrow="Schema template"
              action={
                <button
                  type="button"
                  onClick={copySchema}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                    background: "none", border: "1px solid var(--line)", borderRadius: 5,
                    color: "var(--muted)", cursor: "pointer", fontSize: "0.7rem",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied" : "Copy"}
                </button>
              }
              style={{ marginBottom: 24 }}
            >
              <pre style={{
                margin: 0, padding: "14px 16px", fontSize: "0.72rem", lineHeight: 1.6,
                color: "var(--fg)", overflowX: "auto", fontFamily: "monospace",
                background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8,
              }}>
                {WALLETS_JSON_EXAMPLE}
              </pre>
            </LedgerCard>

            {repoState === "done" && fetchedAgent ? (
              <div style={{
                padding: "20px", background: "rgba(74,232,160,0.06)",
                border: "1px solid rgba(74,232,160,0.3)", borderRadius: 10, marginBottom: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--accent)" }}>check_circle</span>
                  <p style={{ margin: 0, fontWeight: 700 }}>Manifest queued for verification</p>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "var(--muted)" }}>{repoMsg}</p>
                {fetchedRef && (
                  <div style={{
                    padding: "10px 14px", background: "var(--surface-soft)",
                    border: "1px solid var(--line)", borderRadius: 7,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 12,
                  }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reference ID</p>
                      <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)" }}>{fetchedRef}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(fetchedRef); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                      style={{ padding: "6px 10px", border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{refCopied ? "check" : "content_copy"}</span>
                      {refCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
                {fetchedWallets && fetchedWallets.length > 0 && (
                  <div>
                    <SectionLabel style={{ marginBottom: 8 }}>
                      {fetchedWallets.length} wallet{fetchedWallets.length !== 1 ? "s" : ""} found for {fetchedAgent}
                    </SectionLabel>
                    <LedgerCard>
                      {fetchedWallets.map((w, i) => (
                        <LedgerRow
                          key={i}
                          first={i === 0}
                          last={i === fetchedWallets.length - 1}
                          label={
                            <code style={{ fontFamily: "monospace", color: "var(--muted)", fontSize: "0.72rem" }}>
                              {w.address.slice(0, 8)}…{w.address.slice(-6)}
                            </code>
                          }
                          value={w.chain}
                          valueStyle={{ fontFamily: "inherit", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}
                          badge={<StatusBadge variant="green">{w.role}</StatusBadge>}
                        />
                      ))}
                    </LedgerCard>
                  </div>
                )}
                <p style={{ margin: "14px 0 0", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  Verification typically completes within 24–48 hours. Once approved, books are generated automatically.
                </p>
              </div>
            ) : (
              <form onSubmit={submitRepo}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
                    Repo URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/org/agent-repo"
                    required
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem",
                      border: "1px solid var(--line)", background: "var(--surface-soft)",
                      color: "var(--fg)", outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <p style={{ margin: "5px 0 0", fontSize: "0.7rem", color: "var(--muted)" }}>
                    GitHub and Gitlawb repos are supported. The file must be at <code style={{ fontSize: "0.68rem" }}>.agent/wallets.json</code> on main or master.
                  </p>
                </div>
                {repoState === "error" && (
                  <p style={{ color: "#F46060", fontSize: "0.78rem", marginBottom: 12 }}>{repoMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={repoState === "loading" || !repoUrl.trim()}
                  style={{
                    padding: "10px 22px", background: "var(--accent)", color: "#fff",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem",
                    cursor: repoState === "loading" ? "not-allowed" : "pointer",
                    opacity: repoState === "loading" ? 0.7 : 1,
                  }}
                >
                  {repoState === "loading" ? "Fetching manifest…" : "Submit manifest →"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Manual tab */}
        {tab === "manual" && (
          <div>
            {manualState === "done" ? (
              <div style={{
                padding: "24px", background: "rgba(74,232,160,0.06)",
                border: "1px solid rgba(74,232,160,0.3)", borderRadius: 10,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--accent)", display: "block", marginBottom: 10 }}>check_circle</span>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>{manualMsg}</p>
                {submittedRef && (
                  <div style={{
                    padding: "10px 14px", background: "var(--surface-soft)",
                    border: "1px solid var(--line)", borderRadius: 7,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    margin: "12px 0",
                  }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reference ID</p>
                      <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)" }}>{submittedRef}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(submittedRef); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                      style={{ padding: "6px 10px", border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{refCopied ? "check" : "content_copy"}</span>
                      {refCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
                {submittedSlug && (
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "8px 0 0" }}>
                    Profile: <Link href={`/registry/${submittedSlug}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>/registry/{submittedSlug}</Link>
                  </p>
                )}
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
                  Verification typically completes within 24–48 hours.{submittedRef && " Keep your reference ID to track this submission."}
                </p>
              </div>
            ) : (
              <form onSubmit={submitManual} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
                  Don&apos;t have a repo? Submit your agent name and a primary wallet address manually. Our team will review and contact you for verification.
                </p>

                {[
                  { key: "agent_name",     label: "Agent name",            placeholder: "AEON", required: true, type: "text" },
                  { key: "wallet_address", label: "Primary wallet address", placeholder: "0x…", required: true, type: "text" },
                  { key: "x_handle",       label: "X / Twitter handle",     placeholder: "@agentname", required: false, type: "text" },
                  { key: "gitlawb_repo",   label: "Gitlawb or GitHub repo (optional)", placeholder: "https://github.com/org/repo", required: false, type: "url" },
                  { key: "notes",          label: "Notes (optional)",       placeholder: "Any context about this agent…", required: false, type: "text" },
                ].map(({ key, label, placeholder, required, type }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--fg)", marginBottom: 5 }}>
                      {label}
                      {required
                        ? <StatusBadge variant="red" style={{ marginLeft: 6, fontSize: "0.6rem" }}>required</StatusBadge>
                        : <StatusBadge variant="neutral" style={{ marginLeft: 6, fontSize: "0.6rem" }}>optional</StatusBadge>
                      }
                    </label>
                    <input
                      type={type}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required={required}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem",
                        border: "1px solid var(--line)", background: "var(--surface-soft)",
                        color: "var(--fg)", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}

                {/* Surplus pilot opt-in */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={surplusPilot}
                    onChange={(e) => setSurplusPilot(e.target.checked)}
                    style={{ marginTop: 3, accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.55 }}>
                    My agent uses{" "}
                    <a href="https://surplusintelligence.ai" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Surplus</a>
                    {" "}for inference — I&apos;m interested in the{" "}
                    <Link href="/surplus" style={{ color: "var(--accent)", textDecoration: "none" }}>Surplus × Zetta pilot</Link>.
                  </span>
                </label>

                {manualState === "error" && (
                  <p style={{ color: "#F46060", fontSize: "0.78rem", margin: 0 }}>{manualMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={manualState === "loading"}
                  style={{
                    padding: "10px 22px", background: "var(--accent)", color: "#fff",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem",
                    cursor: manualState === "loading" ? "not-allowed" : "pointer",
                    opacity: manualState === "loading" ? 0.7 : 1, alignSelf: "flex-start",
                  }}
                >
                  {manualState === "loading" ? "Submitting…" : "Submit →"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--line)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 20 }}>How it works</h2>
          <LedgerCard>
            {[
              {
                step: "1",
                title: "Add .agent/wallets.json to your repo",
                body: "Declare your agent's wallets — treasury, fee recipient, operator, deployer. This is your financial identity manifest (ERC-8004).",
              },
              {
                step: "2",
                title: "Submit your repo URL above",
                body: "Luca fetches your manifest and queues it for verification. You get a reference ID immediately.",
              },
              {
                step: "3",
                title: "Verification (24–48h)",
                body: "Our team reviews the declaration, runs Alchemy scans on declared wallets, and assigns your verification status.",
              },
              {
                step: "4",
                title: "Books generated automatically",
                body: "Once verified, Luca builds attributed books for your agent — revenue, expenses, runway, classification — refreshed every 4 hours.",
              },
            ].map(({ step, title, body }, i, arr) => (
              <LedgerRow
                key={step}
                first={i === 0}
                last={i === arr.length - 1}
                label={
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>{title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400, marginTop: 2, lineHeight: 1.5 }}>{body}</div>
                  </div>
                }
                value=""
                badge={
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: "rgba(74,232,160,0.12)",
                    border: "1px solid rgba(74,232,160,0.3)", color: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.72rem", fontWeight: 800, flexShrink: 0,
                  }}>{step}</div>
                }
                style={{ padding: "14px" }}
              />
            ))}
          </LedgerCard>
        </div>

        <LedgerCard style={{ marginTop: 32 }}>
          <div style={{ padding: "4px 0" }}>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Questions? Message <a href="https://x.com/zettatracker" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>@zettatracker</a> on X. Already registered?{" "}
              <Link href="/registry" style={{ color: "var(--accent)", textDecoration: "none" }}>Browse the registry →</Link>
            </p>
          </div>
        </LedgerCard>
      </main>
    </>
  );
}
