import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { normalizeWalletRole } from "@/lib/luca-classify";
import { dbError } from "@/lib/api-utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { WalletLabel } from "@/app/registry/types";

const ROLE_TO_LABEL: Record<string, WalletLabel> = {
  treasury:  "likely treasury",
  fee:       "likely fee recipient",
  deployer:  "candidate wallet",
  operator:  "likely expense wallet",
  unknown:   "unknown role",
};

export async function POST(req: NextRequest) {
  if (!rateLimit("registry-wallets", clientIp(req), 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again in 10 minutes." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { agent, xHandle, ecosystem, wallets } = body as {
    agent?: string;
    xHandle?: string;
    ecosystem?: string;
    wallets?: Array<{ address: string; role: string; chain?: string; notes?: string }>;
  };

  if (!agent || typeof agent !== "string" || agent.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "agent name is required" }, { status: 400 });
  }
  if (!Array.isArray(wallets) || wallets.length === 0) {
    return NextResponse.json({ ok: false, error: "wallets[] is required and must not be empty" }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });
  }

  const normalized = wallets.map((w) => {
    const role = normalizeWalletRole(w.role ?? "unknown");
    return {
      address: w.address,
      role,
      label:   ROLE_TO_LABEL[role] ?? "unknown role",
      chain:   w.chain ?? "base",
      notes:   w.notes ?? null,
    };
  });

  const sb = getSupabaseAdminClient();

  const { error } = await sb.from("registry_pending_updates").insert({
    agent_name:    agent.trim(),
    update_type:   "wallet_update",
    proposed_data: {
      wallets: normalized.map((w) => ({ address: w.address, label: w.label, role: w.role, chain: w.chain, notes: w.notes })),
      xHandle:    xHandle ?? null,
      ecosystem:  ecosystem ?? null,
    },
    diff_summary: `Wallet manifest: ${wallets.length} wallet(s) — ${normalized.map((w) => w.role).join(", ")}`,
    luca_notes:   "Submitted via wallet manifest API",
    status:       "pending",
  });

  if (error) {
    return dbError("registry/wallets", error);
  }

  return NextResponse.json({
    ok:       true,
    declared: wallets.length,
    message:  `Wallet manifest received. ${wallets.length} wallet(s) queued for verification.`,
  });
}
