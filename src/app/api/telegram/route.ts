import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";

const BOT_COMMANDS = [
  { command: "scan",    description: "Full AI wallet scan — /scan 0x... [7d|14d|30d|90d]" },
  { command: "summary", description: "Quick stats — /summary 0x... [7d|14d|30d|90d]" },
  { command: "report",  description: "Get public report link — /report 0x..." },
  { command: "help",    description: "Command list and usage guide" },
  { command: "start",   description: "Introduction and onboarding" },
];

// Webhook receiver — Telegram POSTs every update here
export async function POST(request: Request) {
  const update = await request.json().catch(() => null);
  if (update) {
    // Fire-and-forget: respond 200 immediately so Telegram doesn't retry,
    // giving the function the full execution budget for the scan.
    handleUpdate(update).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

// One-time setup — GET /api/telegram?setup=1
// Registers webhook + sets bot commands in Telegram
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("setup") !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  async function tgSetup(method: string, body: object) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // Use the canonical domain (no www — matches what Vercel serves)
  const webhookUrl = "https://x402books.xyz/api/telegram";

  const [webhookResult, commandsResult] = await Promise.all([
    tgSetup("setWebhook", {
      url: webhookUrl,
      allowed_updates: ["message", "inline_query"],
      drop_pending_updates: true,
    }),
    tgSetup("setMyCommands", { commands: BOT_COMMANDS }),
  ]);

  return NextResponse.json({ webhook: webhookResult, commands: commandsResult });
}
