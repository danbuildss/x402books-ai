import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { normalizeWalletRole } from "@/lib/luca-classify";
import { ingestManifestTruth } from "@/lib/truth-engine-db";
import type { WalletLabel } from "@/app/registry/types";

const ROLE_TO_LABEL: Record<string, WalletLabel> = {
  treasury:            "likely treasury",
  revenue:             "likely revenue wallet",
  expense:             "likely expense wallet",
  fee_recipient:       "likely fee recipient",
  payment_receiver:    "likely revenue wallet",
  operator:            "likely expense wallet",
  deployer:            "candidate wallet",
  token_contract:      "candidate wallet",
  token_bound_account: "candidate wallet",
  unknown:             "unknown role",
};

function repoToRawUrls(repoUrl: string): string[] {
  const url = repoUrl.trim().replace(/\/$/, "");

  // GitHub: https://github.com/org/repo
  const ghMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (ghMatch) {
    const path = ghMatch[1];
    return [
      // Standard path — try first
      `https://raw.githubusercontent.com/${path}/main/.agent/wallets.json`,
      `https://raw.githubusercontent.com/${path}/master/.agent/wallets.json`,
      // Legacy fallback
      `https://raw.githubusercontent.com/${path}/main/.x402books/wallets.json`,
      `https://raw.githubusercontent.com/${path}/master/.x402books/wallets.json`,
    ];
  }

  // Gitlawb: https://gitlawb.com/org/repo
  const glMatch = url.match(/^https?:\/\/gitlawb\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (glMatch) {
    const path = glMatch[1];
    return [
      `https://gitlawb.com/${path}/raw/branch/main/.agent/wallets.json`,
      `https://gitlawb.com/${path}/raw/branch/master/.agent/wallets.json`,
      `https://gitlawb.com/${path}/raw/branch/main/.x402books/wallets.json`,
      `https://gitlawb.com/${path}/raw/branch/master/.x402books/wallets.json`,
    ];
  }

  return [];
}

const MAX_MANIFEST_BYTES = 51200; // 50KB

async function fetchManifest(urls: string[]): Promise<{ url: string; data: unknown } | { error: string } | null> {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      let res: Response;
      try {
        res = await fetch(url, { headers: { "Accept": "application/json" }, signal: controller.signal });
        clearTimeout(timeout);
      } catch (e) {
        clearTimeout(timeout);
        if ((e as Error).name === "AbortError") {
          return { error: "Manifest fetch timed out (5s)" };
        }
        continue; // try next URL
      }
      if (!res.ok) continue;

      // Check content-length header first
      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_MANIFEST_BYTES) {
        return { error: "Manifest file too large (max 50KB)" };
      }

      const text = await res.text();
      if (text.length > MAX_MANIFEST_BYTES) {
        return { error: "Manifest file too large (max 50KB)" };
      }

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        continue; // not valid JSON, try next URL
      }
      return { url, data };
    } catch {
      // try next URL
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
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
  if (found && "error" in found) {
    return NextResponse.json({ ok: false, error: found.error }, { status: 400 });
  }
  if (!found) {
    return NextResponse.json({
      ok: false,
      error: "Could not find .agent/wallets.json in that repo. Make sure the file exists on the main or master branch (legacy path .x402books/wallets.json is also checked).",
    }, { status: 404 });
  }

  const manifest = found.data as {
    version?:  string;
    agent?:    string;
    project?:  string;
    ecosystem?: string;
    website?:  string;
    x?:        string;
    xHandle?:  string;   // legacy alias
    did?:      string;
    wallets?:  Array<{
      address?:             string;
      role?:                string;
      chain?:               string;
      verification_method?: string;
      label?:               string;
      notes?:               string;
      active?:              boolean;
      last_updated?:        string;
    }>;
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
      address:             w.address ?? "",
      role,
      label:               ROLE_TO_LABEL[role] ?? "unknown role",
      chain:               w.chain ?? "base",
      verification_method: w.verification_method ?? "repo_manifest",
      notes:               w.notes ?? null,
      active:              w.active !== false,
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
      ok:      true,
      version: manifest.version ?? null,
      agent:   manifest.agent,
      project: manifest.project ?? null,
      ecosystem: manifest.ecosystem ?? null,
      did:     manifest.did ?? null,
      wallets: normalized,
      message: "Manifest read successfully (registry unavailable — contact team to finalize).",
    });
  }

  const sb = getSupabaseAdminClient();

  const { data, error } = await sb.from("registry_pending_updates").insert({
    agent_name:    manifest.agent.trim(),
    update_type:   "wallet_update",
    proposed_data: {
      wallets:      normalized.map((w) => ({
        address:             w.address,
        label:               w.label,
        role:                w.role,
        chain:               w.chain,
        verification_method: w.verification_method,
        notes:               w.notes,
        active:              w.active,
      })),
      project:      manifest.project ?? null,
      xHandle:      manifest.xHandle ?? manifest.x ?? null,
      ecosystem:    manifest.ecosystem ?? null,
      website:      manifest.website ?? null,
      did:          manifest.did ?? null,
      version:      manifest.version ?? null,
      source_repo:  repo_url.trim(),
    },
    diff_summary:  `Repo manifest v${manifest.version ?? "0"}: ${normalized.length} wallet(s) — ${normalized.map((w) => w.role).join(", ")}`,
    luca_notes:    `Auto-fetched from ${found.url}`,
    status:        "pending",
  }).select("id").single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const ref_id = data?.id ? (data.id as string).slice(0, 8).toUpperCase() : null;

  // Best-effort truth engine ingestion — never blocks the response
  ingestManifestTruth(manifest, {
    repoUrl:     repo_url.trim(),
    sourceUrl:   found.url,
  }).catch(() => {});

  return NextResponse.json({
    ok:      true,
    version: manifest.version ?? null,
    agent:   manifest.agent,
    project: manifest.project ?? null,
    wallets: normalized,
    ref_id,
    message: `Manifest submitted. ${normalized.length} wallet(s) queued for Luca verification.`,
  });
}
