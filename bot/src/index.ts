import { Bot, Context } from "grammy";
import { scanWallet, resolveEns, type TimeRange } from "./api.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

const APP_URL = process.env.APP_URL || "https://x402books.xyz";
const VALID_RANGES = new Set(["7d", "14d", "30d", "90d"]);

const bot = new Bot(token);

// ── Helpers ───────────────────────────────────────────────────────────────────

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(2)}`;
}

function sign(n: number) {
  return n >= 0 ? "+" : "−";
}

function budgetIcon(netFlow: number, spend: number, income: number) {
  if (netFlow >= 0) return "✅";
  if (spend > income * 1.25) return "🔴";
  return "⚠️";
}

function budgetLabel(netFlow: number, spend: number, income: number) {
  if (netFlow >= 0) return "✅ Healthy";
  if (spend > income * 1.25) return "🔴 Overspending";
  return "⚠️ Watch";
}

// Parse "0x... [range]" or "name.eth [range]" from command args
function splitArgs(arg: string): { walletRaw: string; range: TimeRange } {
  const parts = arg.trim().split(/\s+/);
  const last = parts.at(-1)?.toLowerCase() ?? "";
  if (parts.length > 1 && VALID_RANGES.has(last)) {
    return { walletRaw: parts.slice(0, -1).join(" "), range: last as TimeRange };
  }
  return { walletRaw: arg.trim(), range: "30d" };
}

async function resolveWallet(
  raw: string,
): Promise<{ address: string } | { error: string }> {
  const input = raw.trim();
  if (!input) {
    return {
      error: [
        "Please provide a wallet address or ENS name.",
        "",
        "<b>Examples:</b>",
        "<code>/scan 0x7d3f…42f1</code>",
        "<code>/scan vitalik.eth 7d</code>",
      ].join("\n"),
    };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return { address: input };
  if (/\.eth$/i.test(input)) {
    const resolved = await resolveEns(input);
    if (resolved) return { address: resolved };
    return {
      error: `❌ Could not resolve <code>${input}</code>.\nTry pasting the 0x address directly.`,
    };
  }
  return {
    error: [
      "❌ Invalid address. Provide a Base wallet address or ENS name.",
      "",
      "<b>Examples:</b>",
      "<code>/scan 0x7d3f…42f1</code>",
      "<code>/scan vitalik.eth</code>",
    ].join("\n"),
  };
}

function buildScanText(
  address: string,
  data: Awaited<ReturnType<typeof scanWallet>>,
): string {
  const s = data.summary;
  const top = data.categories.slice(0, 3);
  const catBlock = top.length
    ? top.map((c) => `  • ${c.label.padEnd(16)} <b>${fmt(c.totalUsdc)}</b>  ${c.count} tx`).join("\n")
    : "  No categories yet";

  return [
    `🔍 <b>Wallet Scan · ${data.range}</b>`,
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
    `📄 <a href="${APP_URL}/report/${address}">Full report →</a>`,
  ].join("\n");
}

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  await ctx.reply(
    [
      `👋 Welcome to <b>x402Books AI</b>`,
      ``,
      `The financial intelligence layer for Base wallets and AI agents.`,
      ``,
      `Paste any Base wallet address and I'll return a full breakdown of USDC activity — spend, income, categories, x402 agent payments, and more.`,
      ``,
      `<b>Commands</b>`,
      `/scan <code>&lt;wallet&gt; [range]</code> — full wallet scan`,
      `/summary <code>&lt;wallet&gt; [range]</code> — quick stats`,
      `/report <code>&lt;wallet&gt;</code> — public report link`,
      `/help — command list`,
      ``,
      `<b>Range options:</b> 7d · 14d · 30d · 90d (default: 30d)`,
      `<b>Example:</b> <code>/scan vitalik.eth 7d</code>`,
      ``,
      `Powered by <a href="${APP_URL}">x402Books AI</a>`,
    ].join("\n"),
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      `<b>x402Books AI — Commands</b>`,
      ``,
      `/scan <code>&lt;wallet&gt; [range]</code>`,
      `Full wallet scan — spend, income, net flow, top categories, x402 count, and report link.`,
      ``,
      `/summary <code>&lt;wallet&gt; [range]</code>`,
      `Quick financial snapshot.`,
      ``,
      `/report <code>&lt;wallet&gt;</code>`,
      `Returns the public shareable report URL. No login required to view.`,
      ``,
      `<b>Range options:</b> <code>7d</code> · <code>14d</code> · <code>30d</code> · <code>90d</code>`,
      `<b>ENS names supported:</b> <code>/scan sweetman.eth 30d</code>`,
      ``,
      `<a href="${APP_URL}">Open full dashboard →</a>`,
    ].join("\n"),
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
});

bot.command("scan", async (ctx) => {
  const { walletRaw, range } = splitArgs(ctx.match ?? "");
  const parsed = await resolveWallet(walletRaw);
  if ("error" in parsed) {
    return ctx.reply(parsed.error, { parse_mode: "HTML" });
  }

  const { address } = parsed;
  const placeholder = await ctx.reply(
    `🔍 Scanning <code>${short(address)}</code> · ${range}…`,
    { parse_mode: "HTML" },
  );

  try {
    const data = await scanWallet(address, range);
    const text = buildScanText(address, data);
    await ctx.api.editMessageText(
      placeholder.chat.id,
      placeholder.message_id,
      text,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await ctx.api.editMessageText(
      placeholder.chat.id,
      placeholder.message_id,
      `❌ Could not scan this wallet.\n<i>${msg}</i>`,
      { parse_mode: "HTML" },
    );
  }
});

bot.command("summary", async (ctx) => {
  const { walletRaw, range } = splitArgs(ctx.match ?? "");
  const parsed = await resolveWallet(walletRaw);
  if ("error" in parsed) {
    return ctx.reply(parsed.error, { parse_mode: "HTML" });
  }

  const { address } = parsed;
  const placeholder = await ctx.reply(`📊 Fetching summary…`);

  try {
    const data = await scanWallet(address, range);
    const s = data.summary;
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
      `<a href="${APP_URL}/report/${address}">Full report →</a>`,
    ].join("\n");
    await ctx.api.editMessageText(
      placeholder.chat.id,
      placeholder.message_id,
      text,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await ctx.api.editMessageText(
      placeholder.chat.id,
      placeholder.message_id,
      `❌ Could not fetch summary.\n<i>${msg}</i>`,
      { parse_mode: "HTML" },
    );
  }
});

bot.command("report", async (ctx) => {
  const walletRaw = (ctx.match ?? "").trim();
  const parsed = await resolveWallet(walletRaw);
  if ("error" in parsed) {
    return ctx.reply(parsed.error, { parse_mode: "HTML" });
  }

  const { address } = parsed;
  const reportUrl = `${APP_URL}/report/${address}`;
  await ctx.reply(
    [
      `📄 <b>Public Report</b>`,
      `<code>${short(address)}</code>`,
      ``,
      `<a href="${reportUrl}">${reportUrl}</a>`,
      ``,
      `No login required to view.`,
    ].join("\n"),
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
});

// ── Inline mode ───────────────────────────────────────────────────────────────

bot.on("inline_query", async (ctx) => {
  const { walletRaw, range } = splitArgs(ctx.inlineQuery.query);

  if (!walletRaw || walletRaw.length < 5) {
    return ctx.answerInlineQuery([], {
      cache_time: 0,
      button: { text: "Enter a wallet address or ENS name", start_parameter: "help" },
    });
  }

  const parsed = await resolveWallet(walletRaw);
  if ("error" in parsed) {
    return ctx.answerInlineQuery([], {
      cache_time: 0,
      button: { text: "Invalid address — tap for help", start_parameter: "help" },
    });
  }

  const { address } = parsed;

  try {
    const data = await scanWallet(address, range);
    const s = data.summary;
    const text = buildScanText(address, data);
    const desc = `Income: ${fmt(s.totalIncome)} · Spend: ${fmt(s.totalSpend)} · Net: ${sign(s.netFlow)}${fmt(s.netFlow)} · ${s.transactionCount} txns`;

    await ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: address,
          title: `Wallet Report — ${short(address)}`,
          description: desc,
          input_message_content: {
            message_text: text,
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
          },
          reply_markup: {
            inline_keyboard: [[
              { text: "📄 Full Report", url: `${APP_URL}/report/${address}` },
              { text: "🌐 x402Books AI", url: APP_URL },
            ]],
          },
        },
      ],
      { cache_time: 30 },
    );
  } catch {
    await ctx.answerInlineQuery([], {
      cache_time: 0,
      button: { text: "Could not scan — try again", start_parameter: "help" },
    });
  }
});

// ── Group chat: only respond when explicitly mentioned ─────────────────────────

bot.on("message", async (ctx: Context) => {
  // Ignore non-command messages silently
});

// ── Start polling ─────────────────────────────────────────────────────────────

console.log("x402Books AI bot starting…");
bot.start({
  onStart: () => console.log("Bot is running via long polling"),
  drop_pending_updates: true,
}).catch((err) => {
  console.error("Bot crashed:", err);
  process.exit(1);
});
