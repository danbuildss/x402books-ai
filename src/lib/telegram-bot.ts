import { buildLedgerScan } from "@/lib/ledger-service";
import { isValidWalletAddress, type TimeRange } from "@/lib/ledger";

const APP_URL = "https://x402books.xyz";
const VALID_RANGES = new Set(["7d", "14d", "30d", "90d"]);

// ── Telegram API helpers ──────────────────────────────────────────────────────

async function tg(method: string, params: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<{ ok: boolean; result?: { message_id: number; id?: string } }>;
}

async function send(chatId: number, text: string, extra?: Record<string, unknown>) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function edit(chatId: number, msgId: number, text: string, extra?: Record<string, unknown>) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: msgId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

// ── ENS resolution ────────────────────────────────────────────────────────────

async function resolveEns(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`,
    );
    if (!res.ok) return null;
    const data = await res.json() as { address?: string };
    return isValidWalletAddress(data?.address ?? "") ? data.address! : null;
  } catch {
    return null;
  }
}

async function parseWallet(
  raw: string,
): Promise<{ address: string } | { error: string }> {
  const input = raw.trim();
  if (!input) {
    return {
      error: [
        "Please provide a wallet address or ENS name.",
        "",
        "Examples:",
        "<code>/scan 0x7d3f…42f1</code>",
        "<code>/scan vitalik.eth</code>",
        "<code>/scan 0x7d3f…42f1 7d</code>",
      ].join("\n"),
    };
  }
  if (isValidWalletAddress(input)) return { address: input };
  if (/\.eth$/i.test(input)) {
    const resolved = await resolveEns(input);
    if (resolved) return { address: resolved };
    return { error: `❌ Could not resolve <code>${input}</code>.\nTry pasting the 0x address directly.` };
  }
  return {
    error: [
      "❌ Invalid address. Provide a Base wallet address or ENS name.",
      "",
      "Examples:",
      "<code>/scan 0x7d3f…42f1</code>",
      "<code>/scan vitalik.eth</code>",
    ].join("\n"),
  };
}

// Parse wallet + optional range from args string
// e.g. "0x... 7d" or "vitalik.eth 90d" or just "0x..."
function splitArgs(arg: string): { walletRaw: string; range: TimeRange } {
  const parts = arg.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.toLowerCase();
  if (parts.length > 1 && VALID_RANGES.has(last)) {
    return {
      walletRaw: parts.slice(0, -1).join(" "),
      range: last as TimeRange,
    };
  }
  return { walletRaw: arg.trim(), range: "30d" };
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function sign(n: number) {
  return n >= 0 ? "+" : "−";
}

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(2)}`;
}

function budgetIcon(netFlow: number, totalSpend: number, totalIncome: number) {
  if (netFlow >= 0) return "✅";
  if (totalSpend > totalIncome * 1.25) return "🔴";
  return "⚠️";
}

function budgetLabel(netFlow: number, totalSpend: number, totalIncome: number) {
  if (netFlow >= 0) return "✅ Healthy";
  if (totalSpend > totalIncome * 1.25) return "🔴 Overspending";
  return "⚠️ Watch";
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function cmdStart(chatId: number) {
  await send(
    chatId,
    [
      `👋 Welcome to <b>x402Books AI</b>`,
      ``,
      `The financial intelligence layer for Base wallets and AI agents.`,
      ``,
      `Paste any Base wallet address and I'll return a full breakdown of USDC activity — spend, income, categories, x402 agent payments, and more.`,
      ``,
      `<b>Commands</b>`,
      `/scan <code>&lt;wallet&gt; [range]</code> — full wallet scan with AI categories`,
      `/summary <code>&lt;wallet&gt; [range]</code> — quick stats`,
      `/report <code>&lt;wallet&gt;</code> — public report link`,
      `/help — command list`,
      ``,
      `<b>Range options:</b> 7d · 14d · 30d · 90d (default: 30d)`,
      `<b>Example:</b> <code>/scan vitalik.eth 7d</code>`,
      ``,
      `Powered by <a href="${APP_URL}">x402Books AI</a>`,
    ].join("\n"),
  );
}

async function cmdHelp(chatId: number) {
  await send(
    chatId,
    [
      `<b>x402Books AI — Commands</b>`,
      ``,
      `/scan <code>&lt;wallet&gt; [range]</code>`,
      `Full wallet scan — AI-categorized spend, income, net flow, x402 count, top categories, and report link.`,
      ``,
      `/summary <code>&lt;wallet&gt; [range]</code>`,
      `Quick financial snapshot — income, spend, net flow, budget status.`,
      ``,
      `/report <code>&lt;wallet&gt;</code>`,
      `Returns the public shareable report URL. No login required to view.`,
      ``,
      `/help — this message`,
      `/start — welcome and intro`,
      ``,
      `<b>Range options:</b> <code>7d</code> · <code>14d</code> · <code>30d</code> · <code>90d</code>`,
      `<b>ENS names supported:</b> <code>/scan sweetman.eth 30d</code>`,
      ``,
      `<a href="${APP_URL}">Open full dashboard →</a>`,
    ].join("\n"),
  );
}

async function cmdScan(chatId: number, arg: string) {
  const { walletRaw, range } = splitArgs(arg);
  const parsed = await parseWallet(walletRaw);
  if ("error" in parsed) return send(chatId, parsed.error);

  const { address } = parsed;
  const placeholder = await send(
    chatId,
    `🔍 Scanning <code>${short(address)}</code> · ${range}…`,
  );
  const msgId = placeholder.result?.message_id;

  try {
    const scan = await buildLedgerScan({ wallet: address, range, persist: true });

    const s = scan.summary;
    const top = scan.categories.slice(0, 3);

    const catBlock = top.length
      ? top.map((c) => `  • ${c.label.padEnd(16)} <b>${fmt(c.totalUsdc)}</b>  ${c.count} tx`).join("\n")
      : "  No categories yet";

    const text = [
      `🔍 <b>Wallet Scan · ${range}</b>`,
      `<code>${address}</code>`,
      ``,
      `💰 Income     <b>${sign(s.totalIncome)}${fmt(s.totalIncome)} USDC</b>`,
      `💸 Spend      <b>−${fmt(s.totalSpend)} USDC</b>`,
      `📈 Net Flow   <b>${sign(s.netFlow)}${fmt(s.netFlow)} USDC</b>  ${budgetIcon(s.netFlow, s.totalSpend, s.totalIncome)}`,
      `📊 Txns       <b>${s.transactionCount}</b>  ·  <b>${s.likelyX402Count}</b> x402 payments`,
      ``,
      `<b>Top categories</b>`,
      catBlock,
      ``,
      `📄 <a href="${APP_URL}/dashboard">Full report →</a>`,
    ].join("\n");

    if (msgId) await edit(chatId, msgId, text);
    else await send(chatId, text);
  } catch {
    const errText = "❌ Could not scan this wallet right now. Please try again.";
    if (msgId) await edit(chatId, msgId, errText);
    else await send(chatId, errText);
  }
}

async function cmdSummary(chatId: number, arg: string) {
  const { walletRaw, range } = splitArgs(arg);
  const parsed = await parseWallet(walletRaw);
  if ("error" in parsed) return send(chatId, parsed.error);

  const { address } = parsed;
  const placeholder = await send(chatId, `📊 Fetching summary…`);
  const msgId = placeholder.result?.message_id;

  try {
    const scan = await buildLedgerScan({ wallet: address, range, persist: false });
    const s = scan.summary;

    const text = [
      `📊 <b>Quick Summary · ${range}</b>`,
      `<code>${short(address)}</code>`,
      ``,
      `Income    <b>${sign(s.totalIncome)}${fmt(s.totalIncome)} USDC</b>`,
      `Spend     <b>−${fmt(s.totalSpend)} USDC</b>`,
      `Net       <b>${sign(s.netFlow)}${fmt(s.netFlow)} USDC</b>`,
      `Status    ${budgetLabel(s.netFlow, s.totalSpend, s.totalIncome)}`,
      `Txns      <b>${s.transactionCount}</b>  ·  <b>${s.likelyX402Count}</b> x402`,
      ``,
      `<a href="${APP_URL}/dashboard">Full report →</a>`,
    ].join("\n");

    if (msgId) await edit(chatId, msgId, text);
    else await send(chatId, text);
  } catch {
    const errText = "❌ Could not fetch summary. Please try again.";
    if (msgId) await edit(chatId, msgId, errText);
    else await send(chatId, errText);
  }
}

async function cmdReport(chatId: number, walletArg: string) {
  const parsed = await parseWallet(walletArg);
  if ("error" in parsed) return send(chatId, parsed.error);

  const { address } = parsed;
  const reportUrl = `${APP_URL}/dashboard`;

  await send(
    chatId,
    [
      `📄 <b>Public Report</b>`,
      `<code>${short(address)}</code>`,
      ``,
      `<a href="${reportUrl}">${reportUrl}</a>`,
      ``,
      `No login required to view.`,
    ].join("\n"),
  );
}

// ── Inline mode ───────────────────────────────────────────────────────────────
// Users type @x402BooksBot 0x... in any chat to get a shareable result card

type InlineQuery = {
  id: string;
  query: string;
};

async function handleInlineQuery(inlineQuery: InlineQuery) {
  const { id, query } = inlineQuery;
  const { walletRaw, range } = splitArgs(query.trim());

  // Only respond when there's something that looks like a wallet/ENS
  if (!walletRaw || walletRaw.length < 5) {
    return tg("answerInlineQuery", {
      inline_query_id: id,
      results: [],
      cache_time: 0,
      switch_pm_text: "Paste a wallet address or ENS name",
      switch_pm_parameter: "help",
    });
  }

  const parsed = await parseWallet(walletRaw);
  if ("error" in parsed) {
    return tg("answerInlineQuery", {
      inline_query_id: id,
      results: [],
      cache_time: 0,
      switch_pm_text: "Invalid address — tap here for help",
      switch_pm_parameter: "help",
    });
  }

  const { address } = parsed;

  try {
    const scan = await buildLedgerScan({ wallet: address, range, persist: false });
    const s = scan.summary;
    const top = scan.categories.slice(0, 3);

    const catBlock = top.length
      ? top.map((c) => `  • ${c.label.padEnd(16)} ${fmt(c.totalUsdc)}  ${c.count} tx`).join("\n")
      : "  No categories yet";

    const text = [
      `🔍 <b>Wallet Report · ${range}</b>`,
      `<code>${short(address)}</code>`,
      ``,
      `💰 Income     <b>${sign(s.totalIncome)}${fmt(s.totalIncome)} USDC</b>`,
      `💸 Spend      <b>−${fmt(s.totalSpend)} USDC</b>`,
      `📈 Net Flow   <b>${sign(s.netFlow)}${fmt(s.netFlow)} USDC</b>  ${budgetIcon(s.netFlow, s.totalSpend, s.totalIncome)}`,
      `📊 Txns       <b>${s.transactionCount}</b>  ·  <b>${s.likelyX402Count}</b> x402`,
      ``,
      `<b>Top categories</b>`,
      catBlock,
      ``,
      `📄 <a href="${APP_URL}/dashboard">Full report →</a>`,
    ].join("\n");

    await tg("answerInlineQuery", {
      inline_query_id: id,
      cache_time: 30,
      results: [
        {
          type: "article",
          id: address,
          title: `Wallet Report — ${short(address)}`,
          description: `Income: ${fmt(s.totalIncome)} · Spend: ${fmt(s.totalSpend)} · Net: ${sign(s.netFlow)}${fmt(s.netFlow)} · ${s.transactionCount} txns`,
          input_message_content: {
            message_text: text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          },
          reply_markup: {
            inline_keyboard: [[
              { text: "📄 Full Report", url: `${APP_URL}/dashboard` },
              { text: "🌐 x402Books AI", url: APP_URL },
            ]],
          },
        },
      ],
    });
  } catch {
    await tg("answerInlineQuery", {
      inline_query_id: id,
      results: [],
      cache_time: 0,
      switch_pm_text: "Could not scan — try again",
      switch_pm_parameter: "help",
    });
  }
}

// ── Update dispatcher ─────────────────────────────────────────────────────────

type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: { id: number; type: "private" | "group" | "supergroup" | "channel" };
    from?: { id: number };
    text?: string;
  };
  inline_query?: InlineQuery;
};

export async function handleUpdate(update: TelegramUpdate) {
  // Handle inline queries (@x402BooksBot in any chat)
  if (update.inline_query) {
    return handleInlineQuery(update.inline_query);
  }

  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  const text = msg.text.trim();

  // Strip bot username suffix from commands (e.g. /scan@x402BooksBot → /scan)
  const [rawCmd, ...args] = text.split(/\s+/);
  const cmdPart = rawCmd.split("@");
  const cmd = cmdPart[0].toLowerCase();
  const hasBotMention = cmdPart.length > 1;
  const arg = args.join(" ").trim();

  // In groups: only respond if the bot is explicitly mentioned (@botname)
  // or if it's a DM (private chat)
  if (isGroup && !hasBotMention) return;

  switch (cmd) {
    case "/start":   return cmdStart(chatId);
    case "/help":    return cmdHelp(chatId);
    case "/scan":    return cmdScan(chatId, arg);
    case "/summary": return cmdSummary(chatId, arg);
    case "/report":  return cmdReport(chatId, arg);
    default:
      break;
  }
}
