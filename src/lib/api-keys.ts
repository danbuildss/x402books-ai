// API key management: generation, validation, rate limiting, usage logging.

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const KEY_PREFIX = "xb_live_";
const RATE_LIMIT_PER_DAY = 100;

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
  rate_limit_per_day: number;
  requests_today: number;
  requests_total: number;
  created_at: string;
  last_used_at: string | null;
};

// ── Create ────────────────────────────────────────────────────────────────────

export async function createApiKey(name = "Default"): Promise<{ key: string; record: ApiKeyRecord } | null> {
  if (!hasSupabaseAdminEnv()) return null;

  const raw = KEY_PREFIX + randomHex(20); // xb_live_ + 40 hex = 48 chars
  const hash = await sha256hex(raw);
  const prefix = raw.slice(0, 16); // "xb_live_XXXXXXXX"

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      key_hash: hash,
      key_prefix: prefix,
      name,
      rate_limit_per_day: RATE_LIMIT_PER_DAY,
    })
    .select("id, key_prefix, name, is_active, rate_limit_per_day, requests_today, requests_total, created_at, last_used_at")
    .single();

  if (error || !data) return null;
  return { key: raw, record: data as ApiKeyRecord };
}

// ── Validate + rate-limit check ───────────────────────────────────────────────

export type ValidatedKey = {
  id: string;
  name: string;
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
    .select("id, name, is_active, rate_limit_per_day, requests_today, requests_today_date")
    .eq("key_hash", hash)
    .single();

  if (error || !data) return { ok: false, status: 401, message: "Invalid API key." };
  if (!data.is_active) return { ok: false, status: 401, message: "API key has been revoked." };

  const today = todayUtc();
  const count: number = data.requests_today_date === today ? data.requests_today : 0;

  if (count >= data.rate_limit_per_day) {
    return {
      ok: false,
      status: 429,
      message: `Rate limit reached (${data.rate_limit_per_day} requests/day). Resets at midnight UTC.`,
    };
  }

  return { ok: true, key: { id: data.id, name: data.name, rate_limit_per_day: data.rate_limit_per_day } };
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

  // Log the request
  supabase.from("api_usage").insert({
    key_id: params.keyId,
    endpoint: params.endpoint,
    wallet: params.wallet ?? null,
    status_code: params.statusCode,
    duration_ms: params.durationMs,
  }).then(() => {/* fire-and-forget */});

  // Increment counters (reset daily)
  supabase.rpc("increment_api_key_usage", {
    p_key_id: params.keyId,
    p_today: today,
  }).then(() => {/* fire-and-forget */});
}

// ── List keys (for developer dashboard) ──────────────────────────────────────

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  if (!hasSupabaseAdminEnv()) return [];

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, key_prefix, name, is_active, rate_limit_per_day, requests_today, requests_total, created_at, last_used_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (data ?? []) as ApiKeyRecord[];
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeApiKey(id: string): Promise<boolean> {
  if (!hasSupabaseAdminEnv()) return false;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id);

  return !error;
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
