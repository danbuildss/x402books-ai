// API key management: generation, validation, rate limiting, usage logging.
// Keys are owned by the access-code session that created them (owner_code_id).

import { verifyMessage } from "viem";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { type LucaTier, TIER_LIMITS, getWalletTier } from "@/lib/luca-token";

const KEY_PREFIX = "zt_live_";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ApiKeyRecord = {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  tier: LucaTier;
  rate_limit_per_day: number;
  requests_today: number;
  requests_total: number;
  wallet_address: string | null;
  created_at: string;
  last_used_at: string | null;
};

const SELECT_FIELDS = "id, key_prefix, name, is_active, tier, rate_limit_per_day, requests_today, requests_total, wallet_address, created_at, last_used_at";

// ── Create ────────────────────────────────────────────────────────────────────

export async function createApiKey(
  name = "Default",
  ownerCodeId?: string,
): Promise<{ key: string; record: ApiKeyRecord } | null> {
  if (!hasSupabaseAdminEnv()) return null;

  const raw = KEY_PREFIX + randomHex(20); // zt_live_ + 40 hex = 48 chars total
  const hash = await sha256hex(raw);
  const prefix = raw.slice(0, 16); // "zt_live_XXXXXXXX"

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      key_hash: hash,
      key_prefix: prefix,
      name,
      tier: "free",
      rate_limit_per_day: TIER_LIMITS.free,
      owner_code_id: ownerCodeId ?? null,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) return null;
  return { key: raw, record: data as ApiKeyRecord };
}

// ── Validate + rate-limit check ───────────────────────────────────────────────

export type ValidatedKey = {
  id: string;
  name: string;
  tier: LucaTier;
  rate_limit_per_day: number;
};

export type AuthResult =
  | { ok: true; key: ValidatedKey }
  | { ok: false; status: 401 | 429; message: string };

export async function validateApiKey(raw: string): Promise<AuthResult> {
  if (!hasSupabaseAdminEnv()) {
    return { ok: false, status: 401, message: "API key system not configured." };
  }

  const hash = await sha256hex(raw);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, is_active, tier, rate_limit_per_day, requests_today, requests_today_date")
    .eq("key_hash", hash)
    .single();

  if (error || !data) return { ok: false, status: 401, message: "Invalid API key." };
  if (!data.is_active) return { ok: false, status: 401, message: "API key has been revoked." };

  const today = todayUtc();
  const count: number = data.requests_today_date === today ? data.requests_today : 0;
  const limit: number = data.rate_limit_per_day;

  if (count >= limit) {
    const tier = (data.tier ?? "free") as LucaTier;
    const upgradeHint = tier === "free"
      ? " Hold ≥1,000 $LUCA and link your wallet on /developer to upgrade to 500/day."
      : tier === "holder"
        ? " Hold ≥10,000 $LUCA to upgrade to 2,000/day."
        : "";
    return {
      ok: false,
      status: 429,
      message: `Rate limit reached (${limit} requests/day). Resets at midnight UTC.${upgradeHint}`,
    };
  }

  return {
    ok: true,
    key: {
      id: data.id,
      name: data.name,
      tier: (data.tier ?? "free") as LucaTier,
      rate_limit_per_day: limit,
    },
  };
}

// ── Usage logging + counter increment (fire-and-forget) ──────────────────────

export function recordUsage(params: {
  keyId: string;
  endpoint: string;
  wallet?: string;
  statusCode: number;
  durationMs: number;
}) {
  if (!hasSupabaseAdminEnv()) return;

  const supabase = getSupabaseAdminClient();
  const today = todayUtc();

  supabase.from("api_usage").insert({
    key_id: params.keyId,
    endpoint: params.endpoint,
    wallet: params.wallet ?? null,
    status_code: params.statusCode,
    duration_ms: params.durationMs,
  }).then(() => {/* fire-and-forget */});

  supabase.rpc("increment_api_key_usage", {
    p_key_id: params.keyId,
    p_today: today,
  }).then(() => {/* fire-and-forget */});
}

// ── List keys ─────────────────────────────────────────────────────────────────

// When ownerCodeId is provided, only that session's keys are returned.
// Without it (admin path), all active keys are returned — callers must
// verify internal auth before omitting the owner filter.
export async function listApiKeys(ownerCodeId?: string): Promise<ApiKeyRecord[]> {
  if (!hasSupabaseAdminEnv()) return [];

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("api_keys")
    .select(SELECT_FIELDS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (ownerCodeId) query = query.eq("owner_code_id", ownerCodeId);

  const { data } = await query;
  return (data ?? []) as ApiKeyRecord[];
}

// ── Ownership check ───────────────────────────────────────────────────────────

export async function keyBelongsTo(id: string, ownerCodeId: string): Promise<boolean> {
  if (!hasSupabaseAdminEnv()) return false;

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("api_keys")
    .select("owner_code_id")
    .eq("id", id)
    .single();

  return Boolean(data && data.owner_code_id === ownerCodeId);
}

// ── Revoke ────────────────────────────────────────────────────────────────────

// When ownerCodeId is provided, the key is only revoked if that session owns
// it. Without it (admin path), any key can be revoked.
export async function revokeApiKey(id: string, ownerCodeId?: string): Promise<boolean> {
  if (!hasSupabaseAdminEnv()) return false;

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id);

  if (ownerCodeId) query = query.eq("owner_code_id", ownerCodeId);

  const { error, data } = await query.select("id");
  if (error) return false;
  // With an owner filter, no matched rows means the session doesn't own this key
  return ownerCodeId ? (data ?? []).length > 0 : true;
}

// ── Wallet linking: signature challenge / verify ─────────────────────────────
// Linking a wallet upgrades the key's rate-limit tier based on $LUCA balance,
// so ownership must be proven with a signature — pasting someone else's
// address must never work.

const NONCE_TTL_MS = 10 * 60 * 1000;

export function buildLinkMessage(keyId: string, walletAddress: string, nonce: string): string {
  return [
    "Zetta wallet verification",
    "",
    `Key: ${keyId}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Nonce: ${nonce}`,
    "",
    "Signing this message proves you control this wallet.",
    "This signature does not authorize any transaction.",
  ].join("\n");
}

export async function issueLinkChallenge(
  keyId: string,
  walletAddress: string,
): Promise<{ message: string } | null> {
  if (!hasSupabaseAdminEnv()) return null;

  const nonce = randomHex(16);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("api_keys")
    .update({
      link_nonce: nonce,
      link_nonce_expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
    })
    .eq("id", keyId);

  if (error) return null;
  return { message: buildLinkMessage(keyId, walletAddress, nonce) };
}

export async function verifyAndLinkWallet(
  keyId: string,
  walletAddress: string,
  signature: string,
): Promise<{ tier: LucaTier; balance: number } | { error: string } | null> {
  if (!hasSupabaseAdminEnv()) return null;

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("api_keys")
    .select("link_nonce, link_nonce_expires_at")
    .eq("id", keyId)
    .single();

  if (!data?.link_nonce) return { error: "No pending challenge. Request a challenge first." };
  if (data.link_nonce_expires_at && new Date(data.link_nonce_expires_at).getTime() < Date.now()) {
    return { error: "Challenge expired. Request a new one." };
  }

  const message = buildLinkMessage(keyId, walletAddress, data.link_nonce);

  let valid = false;
  try {
    valid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }
  if (!valid) return { error: "Signature verification failed." };

  // Single-use nonce: clear before applying the upgrade
  await supabase
    .from("api_keys")
    .update({ link_nonce: null, link_nonce_expires_at: null })
    .eq("id", keyId);

  const { tier, balance } = await getWalletTier(walletAddress);
  const limit = TIER_LIMITS[tier];

  const { error } = await supabase
    .from("api_keys")
    .update({
      wallet_address: walletAddress.toLowerCase(),
      tier,
      rate_limit_per_day: limit,
      tier_checked_at: new Date().toISOString(),
    })
    .eq("id", keyId);

  if (error) return null;
  return { tier, balance };
}

// ── Recent usage for a key ────────────────────────────────────────────────────

export async function getKeyUsage(keyId: string, limit = 50) {
  if (!hasSupabaseAdminEnv()) return [];

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("api_usage")
    .select("endpoint, wallet, status_code, duration_ms, created_at")
    .eq("key_id", keyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
