import { buildLedgerScan } from "@/lib/ledger-service";
import { isValidWalletAddress } from "@/lib/ledger";

const APP_URL = "https://www.x402books.xyz";

// ── Telegram API helpers ──────────────────────────────────────────────────────

async function tg(method: string, params: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<{ ok: boolean; result?: { message_id: number } }>;
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

async function edit(chatId: number, msgId: number, text: string) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: msgId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
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
    return { error: "Please provide a wallet address or ENS name.\n\nExample: <code>/scan 0x7d3f…42f1</code>" };
  }
  if (isValidWalletAddress(input)) return { address: input };
  if (/\.eth$/i.test(input)) {
    const resolved = await resolveEns(input);
    if (resolved) return { address: resolved };
    return { error: `❌ Could not resolve <code>${input}</code>.\nTry pasting the 0x address directly.` };
  }
  return { error: "❌ Invalid address. Provide a Base wallet address or ENS name.\n\nExample: <code>/scan 0x7d3f…42f1</code>" };
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
      `/scan <code>&lt;wallet&gt;</code> — full wallet analysis`,
      `/summary <code>&lt;wallet&gt;</code> — quick stats`,
      `/report <code>&lt;wallet&gt;</code> — public report link`,
      `/help — command list`,
      ``,
      `ENS names work too: <code>/scan vitalik.eth</code>`,
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
      `/scan <code>&lt;wallet&gt;</code>`,
      `Full wallet scan — spend, income, net flow, top categories, x402 count, and report link.`,
      ``,
      `/summary <code>&lt;wallet&gt;</code>`,
      `Quick 3-line financial snapshot.`,
      ``,
      `/report <code>&lt;wallet&gt;</code>`,
      `Returns the public shareable report URL. No login required to view.`,
      ``,
      `/help — this message`,
      `/start — welcome and intro`,
      ``,
      `<b>Supports ENS names</b> — <code>/scan sweetman.eth</code>`,
      ``,
      `<a href="${APP_URL}">Open full dashboard →</a>`,
    ].join("\n"),
  );
}

async function cmdScan(chatId: number, walletArg: string) {
  const parsed = await parseWallet(walletArg);
  if ("error" in parsed) return send(chatId, parsed.error);

  const { address } = parsed;
  const placeholder = await send(chatId, `🔍 Scanning <code>${short(address)}</code>…`);
  const msgId = placeholder.result?.message_id;

  try {
    const scan = await buildLedgerScan({ wallet: address, range: "30d", persist: true });
    const s = scan.summary;
    const top = scan.categories.slice(0, 3);

    const catBlock = top.length
      ? top
          .map((c) => `  • ${c.label.padEnd(16)} <b>${fmt(c.totalUsdc)}</b>  ${c.count} tx`)
          .join("\n")
      : "  No categories yet";

    const budgetIcon =
      s.netFlow >= 0 ? "✅" : s.totalSpend > s.totalIncome * 1.25 ? "🔴" : "⚠️";

    const text = [
      `🔍 <b>Wallet Scan · 30d</b>`,
      `<code>${address}</code>`,
      ``,
      `💰 Income     <b>${sign(s.totalIncome)}${fmt(s.totalIncome)} USDC</b>`,
      `💸 Spend      <b>${sign(-s.totalSpend)}${fmt(s.totalSpend)} USDC</b>`,
      `📈 Net Flow   <b>${sign(s.netFlow)}${fmt(s.netFlow)} USDC</b>  ${budgetIcon}`,
      `📊 Txns       <b>${s.transactionCount}</b>  ·  <b>${s.likelyX402Count}</b> x402 payments`,
      ``,
      `<b>Top categories</b>`,
      catBlock,
      ``,
      `📄 <a href="${APP_URL}/report/${address}">Full report →</a>`,
    ].join("\n");

    if (msgId) await edit(chatId, msgId, text);
    else await send(chatId, text);
  } catch {
    const errText = "❌ Could not scan this wallet right now. Please try again.";
    if (msgId) await edit(chatId, msgId, errText);
    else await send(chatId, errText);
  }
}

async function cmdSummary(chatId: number, walletArg: string) {
  const parsed = await parseWallet(walletArg);
  if ("error" in parsed) return send(chatId, parsed.error);

  const { address } = parsed;
  const placeholder = await send(chatId, `📊 Fetching summary…`);
  const msgId = placeholder.result?.message_id;

  try {
    const scan = await buildLedgerScan({ wallet: address, range: "30d", persist: false });
    const s = scan.summary;
    const budgetIcon =
      s.netFlow >= 0 ? "✅ Healthy" : s.totalSpend > s.totalIncome * 1.25 ? "🔴 Overspending" : "⚠️ Watch";

    const text = [
      `📊 <b>Quick Summary · 30d</b>`,
      `<code>${short(address)}</code>`,
      ``,
      `Income    <b>${sign(s.totalIncome)}${fmt(s.totalIncome)} USDC</b>`,
      `Spend     <b>−${fmt(s.totalSpend)} USDC</b>`,
      `Net       <b>${sign(s.netFlow)}${fmt(s.netFlow)} USDC</b>`,
      `Status    ${budgetIcon}`,
      ``,
      `<a href="${APP_URL}/report/${address}">Full report →</a>`,
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
  const reportUrl = `${APP_URL}/report/${address}`;

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

// ── Update dispatcher ─────────────────────────────────────────────────────────

type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
};

export async function handleUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Strip bot username from command (e.g. /scan@x402BooksBot → /scan)
  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.split("@")[0].toLowerCase();
  const arg = args.join(" ").trim();

  switch (cmd) {
    case "/start":   return cmdStart(chatId);
    case "/help":    return cmdHelp(chatId);
    case "/scan":    return cmdScan(chatId, arg);
    case "/summary": return cmdSummary(chatId, arg);
    case "/report":  return cmdReport(chatId, arg);
    default:
      // Ignore unknown commands silently
      break;
  }
}
