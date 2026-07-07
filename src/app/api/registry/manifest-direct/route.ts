// POST /api/registry/manifest-direct
// Submit a wallet manifest inline (no GitHub repo required).
// Stores as a pending submission for admin review.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: {
    agent_name?: string;
    wallets?: { address: string; role: string; label?: string }[];
    x_handle?: string;
    notes?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const name = String(body.agent_name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "agent_name is required" }, { status: 400 });

  const wallets = body.wallets ?? [];
  if (!wallets.length) return NextResponse.json({ ok: false, error: "At least one wallet is required" }, { status: 400 });

  for (const w of wallets) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(w.address?.trim() ?? "")) {
      return NextResponse.json({ ok: false, error: `Invalid wallet address: ${w.address}` }, { status: 400 });
    }
  }

  const slug = toSlug(name);
  const manifestJson = JSON.stringify({
    agent: name,
    wallets: wallets.map((w) => ({ address: w.address.trim().toLowerCase(), role: w.role, label: w.label ?? undefined })),
  }, null, 2);

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: true, slug, queued: false, note: "Submission received (Supabase unavailable — contact team to process)." });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("registry_submissions").insert({
    agent_name:       name,
    agent_slug:       slug,
    wallet_address:   wallets[0].address.trim().toLowerCase(),
    notes:            body.notes ? String(body.notes).slice(0, 500) : `Direct manifest submission. Wallets: ${wallets.length}`,
    x_handle:         body.x_handle ? String(body.x_handle).trim().replace(/^@/, "") : null,
    manifest_json:    manifestJson,
    submission_type:  "manifest_direct",
    status:           "pending",
  });

  if (error) {
    console.error("[manifest-direct] Supabase error:", error.message);
    return NextResponse.json({ ok: false, error: "Failed to store submission." }, { status: 500 });
  }

  // Notify admin via Telegram if configured
  const tgToken   = process.env.TELEGRAM_BOT_TOKEN;
  const adminChat = process.env.LUCA_ADMIN_CHAT_ID;
  if (tgToken && adminChat) {
    fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChat,
        text: `📋 <b>Manifest submission</b>\nAgent: <b>${name}</b> (<code>${slug}</code>)\nWallets: ${wallets.length}\n${body.x_handle ? `X: @${body.x_handle}` : ""}`,
        parse_mode: "HTML",
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, slug, queued: true });
}
