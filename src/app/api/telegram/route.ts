import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";

const BOT_COMMANDS = [
  { command: "scan",    description: "Full wallet scan — spend, income, categories, x402" },
  { command: "summary", description: "Quick 3-line financial snapshot" },
  { command: "report",  description: "Get public shareable report link" },
  { command: "help",    description: "Command list and usage guide" },
  { command: "start",   description: "Introduction and onboarding" },
];

// Webhook receiver — Telegram POSTs every update here
export async function POST(request: Request) {
  try {
    const update = await request.json();
    await handleUpdate(update);
  } catch {
    // Always return 200 so Telegram doesn't retry
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
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
    tgSetup("setMyCommands", { commands: BOT_COMMANDS }),
  ]);

  return NextResponse.json({ webhook: webhookResult, commands: commandsResult });
}
