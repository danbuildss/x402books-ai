import { NextRequest, NextResponse } from "next/server";
import {
  getTodayMetrics,
  getRecentFailedScans,
  getRecentRegistryEvents,
} from "@/lib/growth-db";

const APP_URL = "https://x402books.xyz";

function n(v: number | null | undefined) {
  return v == null ? "0" : v.toLocaleString();
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return res.json();
}

async function buildReport(): Promise<string> {
  const [today, failedScans, registryEvents] = await Promise.all([
    getTodayMetrics(),
    getRecentFailedScans(5),
    getRecentRegistryEvents(10),
  ]);

  const lines: string[] = [];

  lines.push(`📊 <b>Daily Ops · ${todayLabel()}</b>`);
  lines.push(``);

  // Usage
  lines.push(`<b>Usage</b>`);
  lines.push(`• Scans: <b>${n(today?.wallet_scans)}</b>  Unique wallets: <b>${n(today?.unique_wallets)}</b>`);
  lines.push(`• API calls: <b>${n(today?.api_calls)}</b>  Reports: <b>${n(today?.reports_generated)}</b>`);
  lines.push(`• Luca chats: <b>${n(today?.luca_interactions)}</b>  Endpoints: <b>${n(today?.endpoint_calls)}</b>`);

  const failed = today?.failed_scans ?? 0;
  if (failed > 0) {
    lines.push(`• Failed scans: <b>${failed}</b> ⚠️`);
    const top = failedScans.slice(0, 2);
    for (const f of top) {
      const reason = String(f.metadata?.reason ?? "unknown error");
      const w = f.wallet ? `${f.wallet.slice(0, 6)}…${f.wallet.slice(-4)}` : "unknown";
      lines.push(`  └ ${w} — ${reason}`);
    }
  } else {
    lines.push(`• Failed scans: <b>0</b> ✅`);
  }

  lines.push(``);

  // Registry
  const regSubs = today?.registry_submissions ?? 0;
  const verified = today?.verified_agents ?? 0;
  const approvals = registryEvents.filter((e) => e.event_type === "approval").length;
  const rejections = registryEvents.filter((e) => e.event_type === "rejection").length;
  const pending = registryEvents.filter((e) => e.event_type === "submission").length;

  lines.push(`<b>Registry</b>`);
  lines.push(`• Submissions: <b>${n(regSubs)}</b>  Verified agents: <b>${n(verified)}</b>`);
  if (approvals > 0 || rejections > 0 || pending > 0) {
    lines.push(`• Approvals: <b>${approvals}</b>  Rejections: <b>${rejections}</b>  Pending: <b>${pending}</b>`);
  }

  lines.push(``);

  // Focus tomorrow
  const focusItems: string[] = [];
  if (failed > 0) focusItems.push(`Review ${failed} failed scan${failed > 1 ? "s" : ""}`);
  if (pending > 0) focusItems.push(`${pending} registry update${pending > 1 ? "s" : ""} need approval`);
  if ((today?.wallet_scans ?? 0) === 0) focusItems.push("No scans today — check if scanner is healthy");
  if (focusItems.length === 0) focusItems.push("All systems nominal — focus on growth");

  lines.push(`<b>Focus tomorrow</b>`);
  for (const item of focusItems) lines.push(`• ${item}`);

  lines.push(``);
  lines.push(`<a href="${APP_URL}/luca-admin">Open Admin →</a>`);

  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.X402BOOKS_INTERNAL_SECRET;

  const isVercelCron = cronSecret && token === cronSecret;
  const isManualTrigger = internalSecret && token === internalSecret;

  if (!isVercelCron && !isManualTrigger) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const chatId = process.env.LUCA_ADMIN_CHAT_ID;
  if (!chatId) {
    return NextResponse.json({ ok: false, error: "LUCA_ADMIN_CHAT_ID not set" }, { status: 500 });
  }

  try {
    const report = await buildReport();
    const result = await sendTelegram(chatId, report);
    return NextResponse.json({ ok: true, telegram: result, preview: report });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
