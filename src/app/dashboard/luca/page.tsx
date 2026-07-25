"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Message = { role: "user" | "luca"; content: string; loading?: boolean };
type Agent = { name: string; slug?: string; wallets: { address: string }[] };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const CAPABILITIES = [
  { label: "Treasury", prompt: "What's my agent's net position this month?" },
  { label: "P&L",      prompt: "Is my agent profitable this period?" },
  { label: "Health",   prompt: "What's my treasury health score?" },
  { label: "Quarantine", prompt: "Why were some of my inflows quarantined?" },
  { label: "Confidence", prompt: "How good is my data quality and confidence?" },
  { label: "Report",   prompt: "Generate my 30d books report." },
];

const PROMPT_CHIPS = [
  "What's my net position this month?",
  "Is my agent profitable?",
  "What's my treasury health?",
  "Why were some inflows quarantined?",
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

  useEffect(() => {
    if (promptParam) setInput(promptParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptParam]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "42px";
    }

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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      setMessages((prev) => [...prev.slice(0, -1), { role: "luca", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              accumulated = `Unable to complete analysis: ${parsed.error}`;
              setMessages((prev) => [...prev.slice(0, -1), { role: "luca", content: accumulated }]);
            } else if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) => [...prev.slice(0, -1), { role: "luca", content: accumulated }]);
            }
          } catch { /* malformed chunk */ }
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
    e.target.style.height = "42px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  const showEmpty = messages.length === 0;
  const isReady = true;
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="op-chat-root">
      {/* ── Topbar ── */}
      <div className="op-chat-topbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live dot + identity */}
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 6px rgba(74,232,160,0.5)",
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>Luca</span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            Financial intelligence
          </span>

          {/* Agent chip — replaces native <select> */}
          {myAgents.length > 0 && (
            <>
              <span style={{ width: 1, height: 18, background: "var(--line)", flexShrink: 0 }} />
              <div style={{ position: "relative" }}>
                <select
                  value={selectedSlug}
                  onChange={(e) => { setSelectedSlug(e.target.value); setMessages([]); }}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    background: "var(--surface-soft)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--ink)",
                    fontSize: "0.76rem",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    padding: "4px 28px 4px 10px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {myAgents.map((a) => {
                    const slug = toSlug(a.name);
                    return <option key={slug} value={slug}>{a.name}</option>;
                  })}
                </select>
                {/* Chevron overlay */}
                <span style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none", color: "var(--muted)", fontSize: "0.6rem",
                }}>▾</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Telegram link + freshness */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="https://t.me/AskLucaBot"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--font-mono)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.8 13.333l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.834.947z" />
            </svg>
            @AskLucaBot
          </a>
          {selectedSlug && (
            <span style={{ fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              books · 30d
            </span>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {showEmpty && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          textAlign: "center",
          overflowY: "auto",
          gap: 0,
        }}>
          {/* Orb */}
          <div style={{
            width: 56, height: 56,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
            boxShadow: "0 0 0 6px color-mix(in srgb, var(--accent) 5%, transparent)",
          }}>
            <span style={{ fontSize: "1.4rem", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>◎</span>
          </div>

          <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink)", margin: "0 0 4px" }}>
            {greeting}{selectedSlug ? `, ${selectedSlug}` : ""}
          </p>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent)", margin: "0 0 10px" }}>
            What should I read for you today?
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", maxWidth: 400, lineHeight: 1.6, margin: "0 0 32px" }}>
            Luca answers from attributed books only — every figure carries its period and confidence, and missing data is called missing.
          </p>

          {/* Capability grid — 3-col, 6px radius (no pills) */}
          {isReady && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              width: "100%",
              maxWidth: 580,
            }}>
              {CAPABILITIES.map((cap) => (
                <button
                  key={cap.label}
                  onClick={() => send(cap.prompt)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-card)",
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border-color 0.12s, background 0.12s",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in srgb, var(--accent) 40%, transparent)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-soft)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                  }}
                >
                  <div style={{
                    fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.09em", color: "var(--accent)",
                    marginBottom: 5, fontFamily: "var(--font-mono)",
                  }}>
                    {cap.label}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--ink)", lineHeight: 1.4 }}>
                    {cap.prompt}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Message list ── */}
      {!showEmpty && (
        <div className="op-chat-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxWidth: 700,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: msg.role === "user" ? "var(--accent)" : "var(--muted)",
                padding: "0 4px",
              }}>
                {msg.role === "user" ? "You" : "Luca"}
              </div>
              <div style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-card)",
                fontSize: "0.84rem",
                lineHeight: 1.7,
                background: msg.role === "user"
                  ? "color-mix(in srgb, var(--accent) 10%, var(--surface))"
                  : "var(--surface)",
                border: msg.role === "user"
                  ? "1px solid rgba(74,232,160,0.2)"
                  : "1px solid var(--line)",
                borderLeft: msg.role === "luca" ? "2px solid var(--accent)" : undefined,
                color: "var(--ink)",
              }}>
                {msg.loading ? (
                  <span style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                    {[0, 200, 400].map((delay) => (
                      <span key={delay} style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: "var(--muted)",
                        display: "inline-block",
                        animation: `luca-pulse 1.2s ease-in-out ${delay}ms infinite`,
                      }} />
                    ))}
                  </span>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Prompt chips — square 6px radius, shown after first response ── */}
      {!showEmpty && !sending && messages[messages.length - 1]?.role === "luca" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 24px 14px" }}>
          {PROMPT_CHIPS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)", /* 6px — NOT pill */
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--muted)",
                fontSize: "0.74rem",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "background 0.12s, color 0.12s, border-color 0.12s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "var(--surface-soft)";
                el.style.color = "var(--ink)";
                el.style.borderColor = "color-mix(in srgb, var(--accent) 30%, transparent)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "var(--surface)";
                el.style.color = "var(--muted)";
                el.style.borderColor = "var(--line)";
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Input dock ── */}
      <div className="op-chat-input-row" style={{ flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            className="op-chat-input"
            placeholder={selectedSlug ? `Ask Luca about ${selectedSlug}'s finances…` : "Ask Luca anything about agent finance…"}
            disabled={!isReady || sending}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{ minHeight: 42, maxHeight: 120, resize: "none", flex: 1 }}
          />
          <button
            className="op-btn op-btn-primary"
            disabled={!isReady || sending || !input.trim()}
            onClick={() => send()}
            style={{ height: 42, padding: "0 18px", whiteSpace: "nowrap" }}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
        <div style={{
          fontSize: "0.62rem", color: "var(--muted)",
          fontFamily: "var(--font-mono)", paddingLeft: 2,
        }}>
          Shift + Enter for new line · Enter to send
        </div>
      </div>

      {/* Typing dot animation */}
      <style>{`
        @keyframes luca-pulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
