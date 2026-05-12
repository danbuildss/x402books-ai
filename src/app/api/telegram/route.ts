import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";

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

// One-time webhook registration — GET /api/telegram?setup=1
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("setup") !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const webhookUrl = "https://www.x402books.xyz/api/telegram";
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
