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
  "What's my agent's net position this month?",
  "Is my agent profitable?",
  "What's my treasury health?",
  "Why were some of my inflows quarantined?",
  "How good is my data quality and confidence?",
  "Generate my 30d books report.",
];

function LucaChat() {
  const searchParams = useSearchParams();
  const agentParam = searchParams.get("agent");
  const promptParam = searchParams.get("q");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(agentParam ?? "");
  const [wallet, setWallet] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Prefill from ?q= (e.g. Reports quick-generate cards) — user still hits Send.
  useEffect(() => {
    if (promptParam) setInput(promptParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptParam]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    const userMsg: Message = { role: "user", content: msg };
    const lucaPlaceholder: Message = { role: "luca", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, lucaPlaceholder]);
    setSending(true);

    try {
      const body: Record<string, string> = { query: msg };
      if (selectedSlug) body.agent_id = selectedSlug;
      else if (wallet) body.wallet = wallet;

      const res = await fetch("/api/luca/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error ?? "Luca is unavailable.");
      }

      // Stream SSE chunks
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      // Replace loading placeholder with streaming content
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "luca", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              accumulated = `Unable to complete analysis: ${parsed.error}`;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "luca", content: accumulated },
              ]);
            } else if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "luca", content: accumulated },
              ]);
            }
          } catch { /* malformed chunk — skip */ }
        }
      }

      if (!accumulated) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "luca", content: "No financial data available for this agent yet." },
        ]);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Luca is unavailable right now.";
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "luca", content: `Unable to complete analysis: ${errMsg}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "40px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  const showPrompts = messages.length === 0;
  const isReady = Boolean(selectedSlug || wallet);

  return (
    <div className="op-chat-root">
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
          <div style={{ textAlign: "center", paddingTop: 48, color: "var(--muted)" }}>
            <div style={{
              width: 52, height: 52, margin: "0 auto 16px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "color-mix(in srgb, #4AE8A0 12%, transparent)",
              border: "1px solid color-mix(in srgb, #4AE8A0 30%, transparent)",
              color: "#4AE8A0", fontSize: "1.4rem",
            }}>◎</div>
            <p style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1.15rem", margin: "0 0 4px" }}>
              {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })()}
              {selectedSlug ? `, ${selectedSlug}` : ""}
            </p>
            <p style={{ fontWeight: 700, color: "#4AE8A0", fontSize: "1rem", margin: "0 0 10px" }}>
              What should I read for you today?
            </p>
            <p style={{ fontSize: "0.8rem", maxWidth: 420, margin: "0 auto", lineHeight: 1.55 }}>
              Luca answers from your agent&apos;s attributed books only — every figure carries its period and confidence, and missing data is called missing.
              {!isReady && " Link your wallet or select an agent to get started."}
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
      {showPrompts && isReady && (
        <div className="op-chat-prompts">
          {PROMPTS.map((p) => (
            <button key={p} className="op-chat-prompt-btn" onClick={() => send(p)}>{p}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="op-chat-input-row">
        <textarea
          ref={textareaRef}
          className="op-chat-input"
          placeholder={isReady ? "Ask Luca about your agent's finances…" : "Link your wallet or select an agent to start"}
          disabled={!isReady || sending}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          style={{ minHeight: 40, maxHeight: 120, resize: "none", flex: 1 }}
        />
        <button
          className="op-btn op-btn-primary"
          disabled={!isReady || sending || !input.trim()}
          onClick={() => send()}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default function LucaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--muted)", fontSize: "0.82rem" }}>Loading…</div>}>
      <LucaChat />
    </Suspense>
  );
}
