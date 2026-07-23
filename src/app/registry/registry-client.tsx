"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { toSlug } from "./[slug]/slug";
import { SiteNav } from "@/components/site-nav";
import type { PublicAgent, Ecosystem, VerificationStatus } from "./types";
import { BANKR_ONLY, FOCUS_ECOSYSTEM } from "@/lib/focus";
import type { AgentGDPEntry } from "@/lib/agent-gdp";
import type { AgentMomentum } from "@/lib/agent-momentum";
import { SiteFooter } from "@/components/site-footer";
import { scoreAgent } from "@/lib/verification-scorer";
import { relativeTime } from "@/lib/ledger";
import {
  BOOKS_STATUS_META,
  DATA_STATUS_COLOR,
  PROFILE_STATUS_META,
  REGISTRY_VIEWS,
  WALLET_STATUS_META,
  isRegistryView,
  matchesView,
  type RegistryView,
} from "./filters";

// ── Sort constants ────────────────────────────────────────────────────────────

const VSTATUS_ORDER: Record<VerificationStatus, number> = {
  "Luca Managed":       0,
  "Verified":           1,
  "Claimed":            2,
  "Wallets Declared":   3,
  "Needs Verification": 4,
  "Candidate":          5,
  "ERC-8004 Indexed":   6,
  "Awaiting Manifest":  7,
};

const PAGE_SIZE = 25;

// ── Stats ─────────────────────────────────────────────────────────────────────

const DECLARED_STATUSES: VerificationStatus[] = [
  "Wallets Declared", "Claimed", "Verified", "Luca Managed", "ERC-8004 Indexed",
];

function computeStats(agents: PublicAgent[], economics: Record<string, AgentGDPEntry>) {
  const manifestCount = agents.filter(
    (a) => DECLARED_STATUSES.includes(a.verificationStatus)
  ).length;
  const booksCount = Object.keys(economics).length;
  const ecosystemCount = new Set(agents.map((a) => a.ecosystem)).size;
  return [
    { label: "Agents Indexed",    value: String(agents.length) },
    { label: "Ecosystems",        value: String(ecosystemCount) },
    { label: "Manifests Filed",   value: String(manifestCount) },
    { label: "Live Books",        value: String(booksCount)    },
  ];
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 24 }: { agent: PublicAgent; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = agent.name.slice(0, 2).toUpperCase();
  if (failed || !agent.xHandle) {
    return (
      <div className="rg-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {initials}
      </div>
    );
  }
  const src = agent.pfp ?? `https://unavatar.io/x/${agent.xHandle.replace("@", "")}`;
  return (
    <Image
      src={src}
      alt={agent.name}
      width={size}
      height={size}
      className="rg-avatar rg-avatar-img"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

// ── Status badge mapper → artifact classes ────────────────────────────────────

function vstCls(vs: VerificationStatus): string {
  switch (vs) {
    case "Luca Managed":       return "st-luca";
    case "Verified":
    case "Claimed":
    case "Wallets Declared":
    case "ERC-8004 Indexed":   return "st-wallet";
    case "Needs Verification": return "st-needs";
    case "Awaiting Manifest":  return "st-await";
    case "Candidate":
    default:                   return "st-cand";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function MoneyCell({ value, signed, color }: { value: number | null | undefined; signed?: boolean; color?: string }) {
  if (value == null) return <span className="rg-dash">—</span>;
  const resolved = color ?? (signed ? (value >= 0 ? "var(--accent)" : "var(--red,#E05050)") : "var(--ink-hi)");
  return (
    <span className="rg-mono" style={{ color: resolved }}>
      {signed && value >= 0 ? "+" : ""}
      {fmtUSD(value)}
    </span>
  );
}

// ── Score chip ────────────────────────────────────────────────────────────────

function ScoreChip({ score }: { score: number }) {
  const cls = score >= 75 ? "sc-hi" : score >= 50 ? "sc-mid" : score >= 25 ? "sc-lo" : "sc-vlo";
  return <span className={`rg-score ${cls}`}>{score}</span>;
}

// ── Updated cell ──────────────────────────────────────────────────────────────

function UpdatedCell({ agent }: { agent: PublicAgent }) {
  if (!agent.lastChecked) return <span className="rg-dash">—</span>;
  const color = DATA_STATUS_COLOR[agent.dataStatus];
  const cls =
    color === "var(--muted)"   ? "u-ok"
    : color === "#F97316"      ? "u-stale"
    : color === "#ef4444"      ? "u-stale"
    : "u-ok";
  return <span className={`rg-updated ${cls}`}>{relativeTime(agent.lastChecked)}</span>;
}

// ── Table header ──────────────────────────────────────────────────────────────

const GRID_COLS = [
  "Agent", "Ecosystem", "Status", "Treasury", "30d Revenue", "30d Expenses",
  "Net Position", "Books", "Wallets", "Score", "Updated",
] as const;
const RIGHT_SET = new Set(["Treasury", "30d Revenue", "30d Expenses", "Net Position", "Score", "Updated"]);

function RegistryHeader() {
  return (
    <div className="rg-tgrid rg-tgrid-hd">
      {GRID_COLS.map((c) => (
        <div key={c} className={`rg-th${RIGHT_SET.has(c) ? " r" : ""}`}>{c}</div>
      ))}
    </div>
  );
}

// ── Agent row ─────────────────────────────────────────────────────────────────

function AgentRow({ agent, economics, momentum }: { agent: PublicAgent; economics?: AgentGDPEntry; momentum?: AgentMomentum }) {
  const vs = scoreAgent(agent, !!economics);
  const rev = momentum?.revenue;
  const momentumGlyph =
    rev && rev.direction !== "stable"
      ? { icon: rev.direction === "growing" ? "↑" : "↓", color: rev.direction === "growing" ? "var(--accent)" : "var(--red,#E05050)" }
      : null;

  const booksMeta = BOOKS_STATUS_META[agent.booksStatus];
  const walletMeta = WALLET_STATUS_META[agent.walletStatus];

  const booksCls =
    agent.booksStatus === "live"    ? "st-luca"
    : agent.booksStatus === "pending" ? "st-wallet"
    : agent.booksStatus === "stale"   ? "st-needs"
    : agent.booksStatus === "error"   ? "st-await"
    : "st-nodat";

  const walletCls =
    agent.walletStatus === "verified" ? "st-luca"
    : agent.walletStatus === "declared" ? "st-wallet"
    : agent.walletStatus === "rejected" ? "st-await"
    : agent.walletStatus === "candidate" ? "st-cand"
    : "st-nodat";

  return (
    <Link href={`/registry/${agent.slug}`} className="rg-trow">
      {/* Agent */}
      <div className="rg-tc">
        <div className="rg-a-wrap">
          <AgentAvatar agent={agent} size={24} />
          <div>
            <span className="rg-a-name">{agent.name}</span>
            {agent.symbol && agent.symbol !== "—" && <span className="rg-a-sym">{agent.symbol}</span>}
          </div>
        </div>
      </div>
      {/* Ecosystem */}
      <div className="rg-tc"><span className="rg-eco">{agent.ecosystem}</span></div>
      {/* Status */}
      <div className="rg-tc"><span className={`rg-st ${vstCls(agent.verificationStatus)}`}>{agent.verificationStatus}</span></div>
      {/* Treasury */}
      <div className="rg-tc r"><MoneyCell value={economics?.treasury_balance_usd} /></div>
      {/* 30d Revenue */}
      <div className="rg-tc r">
        <MoneyCell value={economics?.revenue_usd} color="var(--accent)" />
        {economics && momentumGlyph && (
          <span style={{ color: momentumGlyph.color, fontFamily: "var(--font-mono)", fontSize: "0.7rem", marginLeft: 3 }}>
            {momentumGlyph.icon}
          </span>
        )}
      </div>
      {/* 30d Expenses */}
      <div className="rg-tc r"><MoneyCell value={economics?.expenses_usd} color="var(--ink-mid)" /></div>
      {/* Net Position */}
      <div className="rg-tc r"><MoneyCell value={economics?.net_income_usd} signed /></div>
      {/* Books */}
      <div className="rg-tc"><span className={`rg-st ${booksCls}`}>{booksMeta.label}</span></div>
      {/* Wallets */}
      <div className="rg-tc"><span className={`rg-st ${walletCls}`}>{walletMeta.label}</span></div>
      {/* Score */}
      <div className="rg-tc r"><ScoreChip score={vs.total} /></div>
      {/* Updated */}
      <div className="rg-tc r"><UpdatedCell agent={agent} /></div>
    </Link>
  );
}

// ── Mobile agent card ─────────────────────────────────────────────────────────

function MobileAgentCard({ agent, economics }: { agent: PublicAgent; economics?: AgentGDPEntry }) {
  const booksMeta = BOOKS_STATUS_META[agent.booksStatus];
  return (
    <Link href={`/registry/${agent.slug}`} className="reg-mcard">
      <div className="reg-mcard-head">
        <AgentAvatar agent={agent} size={32} />
        <div className="reg-mcard-id">
          <span className="reg-mcard-name">
            {agent.name}
            {agent.symbol && agent.symbol !== "—" && <span className="rg-a-sym"> {agent.symbol}</span>}
          </span>
          {agent.bio
            ? <span className="reg-mcard-bio">{agent.bio.length > 90 ? `${agent.bio.slice(0, 90)}…` : agent.bio}</span>
            : <span className="reg-mcard-bio reg-mcard-bio-empty">{agent.ecosystem} agent · no bio yet</span>}
        </div>
        <span className={`rg-st ${vstCls(agent.verificationStatus)}`} style={{ flexShrink: 0 }}>{agent.verificationStatus}</span>
      </div>
      <div className="reg-mcard-metrics">
        <div className="reg-mcard-metric">
          <span className="reg-mcard-metric-label">Treasury</span>
          <MoneyCell value={economics?.treasury_balance_usd} />
        </div>
        <div className="reg-mcard-metric">
          <span className="reg-mcard-metric-label">30d Rev</span>
          <MoneyCell value={economics?.revenue_usd} color="var(--accent)" />
        </div>
        <div className="reg-mcard-metric">
          <span className="reg-mcard-metric-label">Books</span>
          <span className="rg-st st-nodat" style={{ fontSize: "0.63rem" }}>{booksMeta.label}</span>
        </div>
      </div>
      <div className="reg-mcard-foot">
        <UpdatedCell agent={agent} />
        <span className="reg-mcard-cta">View profile →</span>
      </div>
    </Link>
  );
}

// ── Verify CTA ────────────────────────────────────────────────────────────────

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
      "role": "fee",
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

function VerifyCTA() {
  const [tab, setTab] = useState<"manual" | "gitlawb">("gitlawb");
  const [form, setForm] = useState({ agent_name: "", wallet_address: "", x_handle: "", notes: "", gitlawb_repo: "", b20_token_address: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [submittedSlug, setSubmittedSlug] = useState("");
  const [submittedRef, setSubmittedRef] = useState("");
  const [refCopied, setRefCopied] = useState(false);
  const [copied, setCopied] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [repoState, setRepoState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [repoMsg, setRepoMsg] = useState("");
  const [fetchedWallets, setFetchedWallets] = useState<FetchedWallet[] | null>(null);
  const [fetchedAgent, setFetchedAgent] = useState("");
  const [fetchedRef, setFetchedRef] = useState("");

  async function submitRepo(e: React.FormEvent) {
    e.preventDefault();
    setRepoState("loading");
    setFetchedWallets(null);
    setFetchedAgent("");
    try {
      const res = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; agent?: string; wallets?: FetchedWallet[]; message?: string; ref_id?: string };
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/registry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string; duplicate?: boolean; slug?: string; ref_id?: string };
      if (data.ok) {
        setState("done");
        setSubmittedSlug(data.slug ?? "");
        setSubmittedRef(data.ref_id ?? "");
        setMsg(data.duplicate ? "Already submitted — we'll review it soon." : "Submitted! We'll verify and add your agent.");
      } else {
        setState("error");
        setMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMsg("Network error. Please try again.");
    }
  }

  function copySchema() {
    navigator.clipboard.writeText(WALLETS_JSON_EXAMPLE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="rg-verify-section" id="verify">
      <div className="rg-verify-inner">

        {/* Left: ladder */}
        <div>
          <p className="rg-v-label">&gt;_ For Agent Teams</p>
          <h2 className="rg-v-h2">No manifest, no official books.</h2>
          <p className="rg-v-body">
            The Agent Wallet Manifest is how agent teams declare their official wallets.
            Without a manifest, Zetta cannot produce attributed books — data remains in
            discovered state only.
          </p>
          <div className="rg-perks">
            {[
              "Verified badge on your registry listing",
              "Luca-generated Agent Books from attributed wallets",
              "Listed across Zetta platform and API",
            ].map((p) => (
              <div key={p} className="rg-perk">
                <div className="rg-perk-ico">✓</div>
                {p}
              </div>
            ))}
          </div>
          <div className="rg-ladder">
            <div className="rg-ladder-hd">Verification ladder</div>
            <div className="rg-ladder-row"><span className="rg-st st-cand">Candidate</span> Luca found wallets from public data</div>
            <div className="rg-ladder-arrow">↓</div>
            <div className="rg-ladder-row"><span className="rg-st st-wallet">Wallets Declared</span> Team submitted .agent/wallets.json</div>
            <div className="rg-ladder-arrow">↓</div>
            <div className="rg-ladder-row"><span className="rg-st st-luca">Luca Managed</span> DID-linked proof + active monitoring</div>
          </div>
        </div>

        {/* Right: form card */}
        <div>
          {state === "done" ? (
            <div className="rg-form-card">
              <div style={{ padding: "24px", textAlign: "center" }}>
                <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>✓ {msg}</p>
                {submittedRef && (
                  <div style={{ margin: "12px 0", padding: "12px 14px", background: "var(--surface-hi)", border: "1px solid var(--line-hi,var(--line))", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reference ID</p>
                      <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.05em" }}>{submittedRef}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(submittedRef); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                      style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem" }}
                    >
                      {refCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
                {submittedSlug && (
                  <Link href={`/registry/${submittedSlug}`} style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)" }}>
                    /registry/{submittedSlug}
                  </Link>
                )}
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
                  Verification typically completes within 24–48 hours.
                </p>
              </div>
            </div>
          ) : (
            <div className="rg-form-card">
              <div className="rg-form-tabs">
                <button type="button" className={`rg-f-tab${tab === "gitlawb" ? " active" : ""}`} onClick={() => setTab("gitlawb")}>
                  Verify via Gitlawb
                </button>
                <button type="button" className={`rg-f-tab${tab === "manual" ? " active" : ""}`} onClick={() => setTab("manual")}>
                  Manual Submit
                </button>
              </div>

              {tab === "gitlawb" ? (
                <div className="rg-form-body">
                  {repoState === "done" && fetchedWallets ? (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--accent)" }}>✓ {fetchedAgent} — manifest received</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10 }}>
                        {fetchedWallets.length} wallet{fetchedWallets.length !== 1 ? "s" : ""} queued for Luca verification.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                        {fetchedWallets.map((w) => (
                          <div key={w.address} style={{ display: "flex", gap: 8, fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--accent)", fontWeight: 600, minWidth: 72 }}>{w.role}</span>
                            <code style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{w.address.slice(0, 10)}…{w.address.slice(-6)}</code>
                          </div>
                        ))}
                      </div>
                      {fetchedRef && (
                        <div style={{ padding: "10px 14px", background: "var(--surface-hi)", border: "1px solid var(--line)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reference ID</p>
                            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.95rem" }}>{fetchedRef}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(fetchedRef); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                            style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem" }}
                          >
                            {refCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="rg-code-fname">.agent/wallets.json</p>
                      <div className="rg-code-block">
                        <span className="rg-ck">{"{"}</span>
                        {"\n"}{"  "}<span className="rg-cp">&quot;agent&quot;</span>: <span className="rg-cs">&quot;MyAgent&quot;</span>,
                        {"\n"}{"  "}<span className="rg-cp">&quot;ecosystem&quot;</span>: <span className="rg-cs">&quot;Bankr&quot;</span>,
                        {"\n"}{"  "}<span className="rg-cp">&quot;x&quot;</span>: <span className="rg-cs">&quot;@myagent&quot;</span>,
                        {"\n"}{"  "}<span className="rg-cp">&quot;wallets&quot;</span>: [{"\n"}{"    {"}{"\n"}{"      "}<span className="rg-cp">&quot;address&quot;</span>: <span className="rg-cs">&quot;0x...&quot;</span>,
                        {"\n"}{"      "}<span className="rg-cp">&quot;role&quot;</span>: <span className="rg-cs">&quot;treasury&quot;</span>
                        {"\n"}{"    }"}
                        {"\n"}{"  ]"}
                        {"\n"}<span className="rg-ck">{"}"}</span>
                      </div>
                      <button type="button" onClick={copySchema} style={{ fontSize: "0.72rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "0 0 12px", display: "block" }}>
                        {copied ? "✓ Copied" : "Copy schema"}
                      </button>
                      <form onSubmit={submitRepo}>
                        <div className="rg-field">
                          <label className="rg-field-label" htmlFor="rg-repo-url">GitHub / Gitlawb Repo URL</label>
                          <input
                            className="rg-field-input"
                            id="rg-repo-url"
                            type="url"
                            placeholder="https://github.com/yourorg/yourrepo"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            required
                          />
                        </div>
                        {repoState === "error" && <p style={{ color: "var(--red,#E05050)", fontSize: "0.75rem", marginBottom: 10 }}>{repoMsg}</p>}
                        <button type="submit" className="rg-submit-btn" disabled={repoState === "loading"}>
                          {repoState === "loading" ? "Fetching manifest…" : "Fetch & Submit Manifest"}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              ) : (
                <div className="rg-form-body">
                  <form onSubmit={submit}>
                    <div className="rg-field">
                      <label className="rg-field-label" htmlFor="rg-agent-name">Agent Name</label>
                      <input className="rg-field-input" id="rg-agent-name" type="text" placeholder="e.g. AEON"
                        value={form.agent_name} onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))} required />
                    </div>
                    <div className="rg-field">
                      <label className="rg-field-label" htmlFor="rg-wallet">Primary Wallet Address</label>
                      <input
                        className="rg-field-input"
                        id="rg-wallet"
                        type="text"
                        placeholder="0x…"
                        value={form.wallet_address}
                        onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
                        pattern="^0x[0-9a-fA-F]{40}$"
                        title="Enter a valid Base wallet address"
                        required
                      />
                    </div>
                    <div className="rg-field">
                      <label className="rg-field-label" htmlFor="rg-x-handle">X / Twitter Handle <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                      <input className="rg-field-input" id="rg-x-handle" type="text" placeholder="@handle"
                        value={form.x_handle} onChange={(e) => setForm((f) => ({ ...f, x_handle: e.target.value }))} />
                    </div>
                    <div className="rg-field">
                      <label className="rg-field-label" htmlFor="rg-notes">Notes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                      <textarea className="rg-field-input" id="rg-notes" placeholder="Wallet role, ecosystem, anything helpful…" rows={3}
                        value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ height: "auto", resize: "vertical" }} />
                    </div>
                    {state === "error" && <p style={{ color: "var(--red,#E05050)", fontSize: "0.75rem", marginBottom: 10 }}>{msg}</p>}
                    <button type="submit" className="rg-submit-btn" disabled={state === "loading"}>
                      {state === "loading" ? "Submitting…" : "Submit for Verification"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

// ── Luca section ──────────────────────────────────────────────────────────────

function LucaSection() {
  return (
    <section className="rg-luca-section" id="audit-example">
      <div className="rg-luca-inner">

        <div>
          <p className="rg-luca-label">&gt;_ Powered by Luca</p>
          <h2 className="rg-luca-h2">Every agent, read by an AI financial analyst.</h2>
          <p className="rg-luca-body">
            Luca reads each agent&apos;s wallet activity — inflows, outflows, settlements, inference spend —
            and interprets it in plain language. No hallucinated numbers. No invented revenue.
            Everything Luca writes is tied directly to on-chain evidence.
          </p>
          <div className="rg-luca-bullets">
            {[
              "Attribution-first: only attributed wallets generate books.",
              "Cites every transaction — raw blockchain, not estimates.",
              "Missing data shows as — never fabricated as $0.00.",
              "Updates automatically as new activity is indexed.",
            ].map((b) => (
              <div key={b} className="rg-luca-bullet">
                <div className="rg-luca-bullet-ico">✓</div>
                {b}
              </div>
            ))}
          </div>
          <Link href="/luca" className="rg-btn-ghost">Learn about Luca →</Link>
        </div>

        <div>
          <div className="rg-terminal">
            <div className="rg-terminal-bar">
              <div className="rg-terminal-dots">
                <span className="rg-terminal-dot rg-td-red" />
                <span className="rg-terminal-dot rg-td-amber" />
                <span className="rg-terminal-dot rg-td-green" />
              </div>
              <span className="rg-terminal-title">luca · financial audit · luca.bankr · live</span>
            </div>
            <div className="rg-terminal-body">
              <div><span className="t-prompt">luca@zetta</span><span className="t-dim">:~$</span> <span className="t-cmd">audit --agent luca --period 30d --chain base</span></div>
              <div>&nbsp;</div>
              <div><span className="t-comment"># Fetching attributed wallet activity...</span></div>
              <div><span className="t-key">agent</span>{"      "}<span className="t-val">Luca</span>{"  "}<span className="t-key">ecosystem</span>{"  "}<span className="t-val">Bankr</span></div>
              <div><span className="t-key">wallets</span>{"    "}<span className="t-val">1 declared</span>{"  "}<span className="t-key">status</span>{"  "}<span className="t-val">Luca Managed</span></div>
              <div>&nbsp;</div>
              <div><span className="t-sep">── income statement ──────────────────────────────</span></div>
              <div><span className="t-key">revenue</span>{"        "}<span className="t-warn">no attributed data</span>{"  "}<span className="t-dim">→ manifest required</span></div>
              <div><span className="t-key">expenses</span>{"       "}<span className="t-warn">no attributed data</span></div>
              <div><span className="t-key">net_position</span>{"   "}<span className="t-warn">no attributed data</span></div>
              <div>&nbsp;</div>
              <div><span className="t-sep">── luca verdict ─────────────────────────────────</span></div>
            </div>
            <div className="rg-terminal-verdict">
              <p className="rg-verdict-label">Luca · Financial Verdict</p>
              <p className="rg-verdict-text">
                Luca is indexed with 1 declared wallet but no attributed transaction data
                is yet available for this period. Wallet activity exists on-chain but cannot
                be attributed without a complete signed manifest. Score: 88 — based on
                verification tier and ecosystem standing.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SortKey = "activity" | "verification" | "name";

export function RegistryClient({
  initialAgents,
  initialEconomics,
}: {
  initialAgents: PublicAgent[];
  initialEconomics: Record<string, AgentGDPEntry>;
}) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const [agents]    = useState<PublicAgent[]>(initialAgents);
  const [economics] = useState<Record<string, AgentGDPEntry>>(initialEconomics);
  const [momentum, setMomentum] = useState<Record<string, AgentMomentum>>({});

  const search    = searchParams.get("q") ?? "";
  const ecoFilter = BANKR_ONLY ? "All" : ((searchParams.get("eco") ?? "All") as "All" | Ecosystem);
  const rawView   = searchParams.get("view") ?? "all";
  const view: RegistryView = isRegistryView(rawView) ? rawView : "all";
  const sortBy    = (searchParams.get("sort") ?? "activity") as SortKey;
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      const isDefault = !v || v === "All" || (k === "view" && v === "all") || (k === "sort" && v === "activity") || (k === "page" && v === "1") || (k === "q" && !v);
      if (isDefault) { params.delete(k); } else { params.set(k, v); }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  function setSearch(v: string)               { updateParams({ q: v, page: "1" }); }
  function setEcoFilter(v: "All" | Ecosystem) { updateParams({ eco: v, page: "1" }); }
  function setView(v: RegistryView)           { updateParams({ view: v, page: "1" }); }
  function setSortBy(v: SortKey)              { updateParams({ sort: v, page: "1" }); }
  function prevPage()                         { updateParams({ page: String(page - 1) }); }
  function nextPage()                         { updateParams({ page: String(page + 1) }); }

  useEffect(() => {
    fetch("/api/registry/momentum")
      .then((r) => r.json())
      .then((data: { ok?: boolean; momentum?: Record<string, AgentMomentum> }) => {
        if (data.ok && data.momentum) setMomentum(data.momentum);
      })
      .catch(() => {});
  }, []);

  const STATS = computeStats(agents, economics);

  const filtered = agents.filter((a) => {
    const matchEco    = ecoFilter === "All" || a.ecosystem === ecoFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      a.name.toLowerCase().includes(q) ||
      a.symbol.toLowerCase().includes(q) ||
      (a.xHandle && a.xHandle.toLowerCase().includes(q));
    return matchEco && matchesView(a, view) && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "activity": {
        const aEco = economics[toSlug(a.name)];
        const bEco = economics[toSlug(b.name)];
        if (aEco && !bEco) return -1;
        if (!aEco && bEco) return 1;
        if (aEco && bEco) return bEco.revenue_usd - aEco.revenue_usd;
        return VSTATUS_ORDER[a.verificationStatus] - VSTATUS_ORDER[b.verificationStatus];
      }
      case "verification":
        return VSTATUS_ORDER[a.verificationStatus] - VSTATUS_ORDER[b.verificationStatus];
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start      = (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, sorted.length);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink-hi,var(--ink))" }}>

      {/* ── Shared nav — matches landing page ── */}
      <SiteNav />

      {/* ── Hero ── */}
      <div className="rg-page">
        <div className="rg-hero">
          <p className="rg-eyebrow">
            <span className="rg-eyebrow-dot" />
            &gt;_ {BANKR_ONLY ? `${FOCUS_ECOSYSTEM} Registry` : "Agent Registry"} · Live
          </p>
          <h1 className="rg-hero-h1">Agent Books for the agent economy.</h1>
          <p className="rg-hero-sub">
            {BANKR_ONLY
              ? <>Revenue, expenses, net income, and treasury activity for indexed {FOCUS_ECOSYSTEM} agents. Attribution requires a declared wallet manifest — no manifest, no official books.</>
              : <>Revenue, expenses, net income, and treasury activity for indexed agents across BANKR, Virtuals, AEON, and Base. Attribution requires a declared wallet manifest.</>}
          </p>

          <div className="rg-hero-stats">
            {STATS.map((s) => (
              <div key={s.label} className="rg-hero-stat">
                <span className="rg-hero-stat-val">{s.value}</span>
                <span className="rg-hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="rg-hero-cta">
            <a href="#verify" className="rg-btn-primary">Submit Manifest →</a>
            <a href="#agents" className="rg-btn-ghost">Browse Agents</a>
          </div>
          <p className="rg-hero-trust">
            <span style={{ color: "var(--accent)" }}>{BANKR_ONLY ? `${FOCUS_ECOSYSTEM}-first.` : "Attribution-first."}</span>{" "}
            Accuracy over breadth. No manifest, no official books.
          </p>
        </div>
      </div>

      {/* ── Registry Table ── */}
      <div className="rg-page">
        <div className="rg-reg-section" id="agents">
          <hr className="rg-section-sep" />

          {/* Controls */}
          <div className="rg-controls">
            <div className="rg-search-wrap">
              <span className="rg-search-ico">⌕</span>
              <input
                className="rg-search"
                type="search"
                placeholder="Search agents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search agents"
              />
            </div>
            <div className="rg-chips">
              {REGISTRY_VIEWS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className={`rg-chip${view === v.value ? " active" : ""}`}
                  onClick={() => setView(v.value)}
                >
                  {v.value === "all" ? (BANKR_ONLY ? `All ${FOCUS_ECOSYSTEM}` : "All Agents") : v.label}
                </button>
              ))}
            </div>
            {!BANKR_ONLY && (
              <select
                className="rg-sort-sel"
                value={ecoFilter}
                onChange={(e) => setEcoFilter(e.target.value as "All" | Ecosystem)}
                aria-label="Ecosystem filter"
              >
                {(["All", "BANKR", "Virtuals", "Base", "AEON", "EigenCloud"] as const).map((o) => (
                  <option key={o} value={o}>{o === "All" ? "All Ecosystems" : o}</option>
                ))}
              </select>
            )}
            <select
              className="rg-sort-sel"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort order"
            >
              <option value="activity">Sort: Books First</option>
              <option value="verification">Sort: Verification</option>
              <option value="name">Sort: Name A–Z</option>
            </select>
          </div>

          {/* Result meta */}
          <div className="rg-result-meta">
            <span className="rg-live-dot" />
            {sorted.length === agents.length
              ? `${agents.length} agents indexed`
              : `${sorted.length} of ${agents.length} agents`}
            {STATS[2]?.value && ` · ${STATS[2].value} manifest${STATS[2].value !== "1" ? "s" : ""} filed`}
            {` · ${STATS[3]?.value ?? "0"} live books`}
          </div>

          {/* Mobile cards */}
          <div className="reg-mcards">
            {paginated.length === 0
              ? <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No agents match your filters.</div>
              : paginated.map((a) => <MobileAgentCard key={a.name} agent={a} economics={economics[toSlug(a.name)]} />)}
          </div>

          {/* Desktop table */}
          <div className="reg-table-wrap">
            <div className="rg-table-shell">
              <div className="rg-tscroll">
                <RegistryHeader />
                {paginated.length === 0
                  ? <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No agents match your filters.</div>
                  : paginated.map((a) => <AgentRow key={a.name} agent={a} economics={economics[toSlug(a.name)]} momentum={momentum[toSlug(a.name)]} />)}

                {/* Pagination inside table shell */}
                <div className="rg-pg">
                  <button className="rg-pg-btn" disabled={page <= 1} onClick={prevPage}>← Prev</button>
                  <span className="rg-pg-info">{start}–{end} of {sorted.length} agents</span>
                  <button className="rg-pg-btn" disabled={page >= totalPages} onClick={nextPage}>Next →</button>
                </div>
              </div>
            </div>
          </div>

          <p className="rg-table-note">
            All wallet addresses are candidate addresses sourced by Luca from public data.
            Nothing is verified until an agent team submits proof via a declared wallet manifest.{" "}
            <a href="#verify">Submit your manifest →</a>
          </p>
        </div>
      </div>

      {/* ── Powered by Luca ── */}
      <LucaSection />

      {/* ── Verify CTA ── */}
      <VerifyCTA />

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}
