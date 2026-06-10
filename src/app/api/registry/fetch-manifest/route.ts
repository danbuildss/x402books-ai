import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { normalizeWalletRole } from "@/lib/luca-classify";
import { dbError } from "@/lib/api-utils";
import type { WalletLabel } from "@/app/registry/types";

// 5 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT   = 5;
const WINDOW_MS    = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const ROLE_TO_LABEL: Record<string, WalletLabel> = {
  treasury: "likely treasury",
  fee:      "likely fee recipient",
  deployer: "candidate wallet",
  operator: "likely expense wallet",
  unknown:  "unknown role",
};

function repoToRawUrls(repoUrl: string): string[] {
  const url = repoUrl.trim().replace(/\/$/, "");

  // GitHub: https://github.com/org/repo
  const ghMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (ghMatch) {
    const path = ghMatch[1];
    return [
      `https://raw.githubusercontent.com/${path}/main/.x402books/wallets.json`,
      `https://raw.githubusercontent.com/${path}/master/.x402books/wallets.json`,
    ];
  }

  // Gitlawb: https://gitlawb.com/org/repo
  const glMatch = url.match(/^https?:\/\/gitlawb\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (glMatch) {
    const path = glMatch[1];
    return [
      `https://gitlawb.com/${path}/raw/branch/main/.x402books/wallets.json`,
      `https://gitlawb.com/${path}/raw/branch/master/.x402books/wallets.json`,
    ];
  }

  return [];
}

async function fetchManifest(urls: string[]): Promise<{ url: string; data: unknown } | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data: unknown = await res.json();
        return { url, data };
      }
    } catch {
      // try next URL
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
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

  const { repo_url } = body as { repo_url?: string };

  if (!repo_url || typeof repo_url !== "string" || repo_url.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "repo_url is required" }, { status: 400 });
  }

  const rawUrls = repoToRawUrls(repo_url);
  if (rawUrls.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Unrecognised repo URL. Use a full GitHub or Gitlawb repo URL (e.g. https://github.com/org/repo).",
    }, { status: 400 });
  }

  const found = await fetchManifest(rawUrls);
  if (!found) {
    return NextResponse.json({
      ok: false,
      error: "Could not find .x402books/wallets.json in that repo. Make sure the file exists on the main or master branch.",
    }, { status: 404 });
  }

  const manifest = found.data as {
    agent?: string;
    xHandle?: string;
    ecosystem?: string;
    wallets?: Array<{ address?: string; role?: string; chain?: string; notes?: string }>;
  };

  if (!manifest.agent || typeof manifest.agent !== "string") {
    return NextResponse.json({ ok: false, error: 'wallets.json is missing the "agent" field.' }, { status: 422 });
  }
  if (!Array.isArray(manifest.wallets) || manifest.wallets.length === 0) {
    return NextResponse.json({ ok: false, error: 'wallets.json must include at least one wallet in the "wallets" array.' }, { status: 422 });
  }

  const normalized = manifest.wallets.map((w) => {
    const role = normalizeWalletRole(w.role ?? "unknown");
    return {
      address: w.address ?? "",
      role,
      label:   ROLE_TO_LABEL[role] ?? "unknown role",
      chain:   w.chain ?? "base",
      notes:   w.notes ?? null,
    };
  });

  const invalid = normalized.filter((w) => !/^0x[0-9a-fA-F]{40}$/.test(w.address));
  if (invalid.length > 0) {
    return NextResponse.json({
      ok: false,
      error: `Invalid wallet address: ${invalid.map((w) => w.address || "(empty)").join(", ")}`,
    }, { status: 422 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      ok: true,
      agent: manifest.agent,
      wallets: normalized,
      message: "Manifest read successfully (registry unavailable — contact team to finalize).",
    });
  }

  const sb = getSupabaseAdminClient();

  const { error } = await sb.from("registry_pending_updates").insert({
    agent_name:    manifest.agent.trim(),
    update_type:   "wallet_update",
    proposed_data: {
      wallets:   normalized.map((w) => ({ address: w.address, label: w.label, role: w.role, chain: w.chain, notes: w.notes })),
      xHandle:   manifest.xHandle ?? null,
      ecosystem: manifest.ecosystem ?? null,
      source_repo: repo_url.trim(),
    },
    diff_summary:  `Repo manifest: ${normalized.length} wallet(s) — ${normalized.map((w) => w.role).join(", ")}`,
    luca_notes:    `Auto-fetched from ${found.url}`,
    status:        "pending",
  });

  if (error) {
    return dbError("registry/fetch-manifest", error);
  }

  return NextResponse.json({
    ok:      true,
    agent:   manifest.agent,
    wallets: normalized,
    message: `Manifest submitted. ${normalized.length} wallet(s) queued for Luca verification.`,
  });
}
