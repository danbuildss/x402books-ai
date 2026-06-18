// GET /api/cron/refresh-books — refresh books for all attributed agents.
//
// Called by Hermes (external scheduler) via x-internal-secret header.
// Also callable manually for testing with the same header.
//
// For each agent with declared wallets:
//   1. Invalidates the in-memory cache entry so the next build triggers a fresh scan
//   2. Calls buildAgentBooks() — which will run a live Alchemy scan and write to DB cache
//   3. Saves a books snapshot for historical trending
//
// Sends a Telegram summary to LUCA_ADMIN_CHAT_ID after each run if the bot token is configured.

import { NextRequest, NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, invalidateBooksCache } from "@/lib/agent-books";
import { saveAgentBooksSnapshot } from "@/lib/agent-books-history";
import { internalAuth } from "@/lib/internal-auth";
import { toSlug } from "@/app/registry/[slug]/slug";

async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.LUCA_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { agents } = await getRegistryAgents();
  const attributed = agents.filter((a) => (a.wallets ?? []).length > 0);

  let refreshed = 0;
  let errors = 0;
  const errorAgents: string[] = [];
  const unattributedAgents: string[] = [];

  for (const agent of attributed) {
    const slug = toSlug(agent.name);
    try {
      // Clear both in-memory and DB cache so buildAgentBooks() runs a fresh scan
      await invalidateBooksCache(slug, "30d");
      // Build fresh books (will update DB cache automatically)
      const books = await buildAgentBooks(agent, "30d");
      if (books.attributed) {
        await saveAgentBooksSnapshot(books).catch(() => {});
      } else {
        unattributedAgents.push(`${agent.name} (${books.reason})`);
      }
      refreshed++;
    } catch (err) {
      errors++;
      errorAgents.push(`${agent.name}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const timestamp = new Date().toISOString();

  // Always notify so Hermes run confirmation reaches the admin
  const hasAnomalies = errors > 0 || unattributedAgents.length > 0;
  const statusIcon = hasAnomalies ? "⚠️" : "✅";
  const lines: string[] = [
    `${statusIcon} <b>Books Refresh</b> · ${new Date(timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}`,
    ``,
    `• Scanned: <b>${attributed.length}</b>  Refreshed: <b>${refreshed}</b>  Errors: <b>${errors}</b>`,
  ];

  if (unattributedAgents.length > 0) {
    lines.push(`• Unattributed despite wallets declared: <b>${unattributedAgents.length}</b>`);
    for (const a of unattributedAgents.slice(0, 5)) {
      lines.push(`  └ ${a}`);
    }
  }

  if (errorAgents.length > 0) {
    lines.push(`• Errors:`);
    for (const e of errorAgents.slice(0, 5)) {
      lines.push(`  └ ${e}`);
    }
  }

  await notifyTelegram(lines.join("\n"));

  return NextResponse.json({
    ok: true,
    refreshed,
    errors,
    total: attributed.length,
    timestamp,
  });
}
