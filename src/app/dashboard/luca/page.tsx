"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Message = { role: "user" | "luca"; content: string; loading?: boolean };
type Agent = { name: string; slug?: string; wallets: { address: string }[] };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const PROMPTS = [
  "What is my agent's revenue this month?",
  "Is my agent profitable?",
  "What does Luca say about my treasury health?",
  "Summarise my agent's financial activity.",
  "What patterns does Luca detect in my books?",
];

function LucaChat() {
  const searchParams = useSearchParams();
  const agentParam = searchParams.get("agent");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(agentParam ?? "");
  const [wallet, setWallet] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [walletRes, agentsRes] = await Promise.all([
          fetch("/api/user/wallet"),
          fetch("/api/registry/agents"),
        ]);
        const walletData = await walletRes.json() as { wallet: string | null };
        const agentsData = await agentsRes.json() as { agents: Agent[] };
        const linked = walletData.wallet?.toLowerCase() ?? null;
        setWallet(linked);
        if (linked) {
          const matched = agentsData.agents.filter((a) =>
            a.wallets?.some((w) => w.address.toLowerCase() === linked)
          );
          setMyAgents(matched);
          if (!selectedSlug && matched.length > 0) {
            setSelectedSlug(toSlug(matched[0].name));
          }
        }
      } catch { /* unavailable */ }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    const loadingMsg: Message = { role: "luca", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setSending(true);

    try {
      const body: Record<string, string> = {};
      if (selectedSlug) body.agent_id = selectedSlug;
      else if (wallet) body.wallet = wallet;
      else { throw new Error("No agent or wallet to analyze."); }

      const res = await fetch("/api/v1/luca/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error ?? "Luca analysis failed.");
      }

      const data = await res.json() as {
        verdict?: string;
        treasury?: { health: string; inflow: number | null; outflow: number | null; net: number | null };
        activity?: { pattern: string | null; signals: string[] };
        scores?: { attribution_confidence: number };
        data_quality?: { note: string };
      };

      const parts: string[] = [];
      if (data.verdict) parts.push(data.verdict);
      if (data.treasury?.inflow !== null && data.treasury?.inflow !== undefined) {
        parts.push(`Treasury — inflow: $${data.treasury.inflow.toFixed(2)}, outflow: $${data.treasury.outflow?.toFixed(2) ?? "—"}, net: ${(data.treasury.net ?? 0) >= 0 ? "+" : ""}$${data.treasury.net?.toFixed(2) ?? "—"}.`);
      }
      if (data.activity?.signals && data.activity.signals.length > 0) {
        parts.push(data.activity.signals.join(" "));
      }
      if (data.data_quality?.note) {
        parts.push(`\n_Data note: ${data.data_quality.note}_`);
      }

      const response = parts.join("\n\n") || "No financial data available for this agent yet.";

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "luca", content: response },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Luca is unavailable right now.";
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "luca", content: `Unable to complete analysis: ${msg}` },
      ]);
    } finally { setSending(false); }
  }

  const showPrompts = messages.length === 0;

  return (
    <div className="op-chat-root">
      {/* Coming soon banner */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--line)",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f59e0b", background: "#f59e0b18", padding: "2px 7px", borderRadius: 4 }}>
          Coming Soon
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Luca chat is in development. Use{" "}
          <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
            @AskLucaBot on Telegram
          </a>{" "}
          for live analysis.
        </span>
      </div>

      {/* Top bar */}
      <div className="op-chat-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>Luca</span>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Financial intelligence</span>
        </div>
        {myAgents.length > 0 && (
          <select
            className="op-input"
            style={{ maxWidth: 220, padding: "5px 10px", fontSize: "0.78rem" }}
            value={selectedSlug}
            onChange={(e) => { setSelectedSlug(e.target.value); setMessages([]); }}
          >
            {myAgents.map((a) => {
              const slug = toSlug(a.name);
              return <option key={slug} value={slug}>{a.name}</option>;
            })}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="op-chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40, color: "var(--muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>◎</div>
            <p style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.95rem", margin: "0 0 6px" }}>Ask Luca about your agent</p>
            <p style={{ fontSize: "0.8rem", maxWidth: 380, margin: "0 auto", lineHeight: 1.55 }}>
              Luca reads your agent&apos;s attributed books and answers financial questions. {!selectedSlug && "Select an agent above or link your wallet to get started."}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`op-chat-bubble ${msg.role === "user" ? "op-user" : "op-luca"}`}>
            <div className="op-chat-bubble-label" style={{ color: msg.role === "user" ? "var(--accent)" : "var(--muted)" }}>
              {msg.role === "user" ? "You" : "Luca"}
            </div>
            {msg.loading ? (
              <span style={{ color: "var(--muted)" }}>Analyzing…</span>
            ) : (
              <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {showPrompts && (
        <div className="op-chat-prompts">
          {PROMPTS.map((p) => (
            <button key={p} className="op-chat-prompt-btn" onClick={() => send(p)}>{p}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="op-chat-input-row">
        <textarea
          className="op-chat-input"
          placeholder="Coming soon — use @AskLucaBot on Telegram for live analysis"
          disabled
          rows={1}
          style={{ minHeight: 40, maxHeight: 120, resize: "none", flex: 1, padding: "9px 12px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--muted)", font: "inherit", fontSize: "0.83rem", outline: "none", cursor: "not-allowed" }}
        />
        <button className="op-btn op-btn-primary" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default function LucaPage() {
  return (
    <Suspense fallback={<div className="op-page" style={{ color: "var(--muted)" }}>Loading…</div>}>
      <LucaChat />
    </Suspense>
  );
}
