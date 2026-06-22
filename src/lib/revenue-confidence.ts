// Revenue Confidence Labels — human-verified confidence that overrides auto-computed.
//
// After running the Revenue Accuracy Report and reviewing transaction evidence,
// an admin sets a label per agent. That label is stored in Supabase and surfaced
// publicly on agent profiles and the /registry/confidence page.
//
// SQL migration (run once in Supabase dashboard):
//
//   create table agent_confidence_labels (
//     agent_slug        text primary key,
//     confidence_level  text not null check (confidence_level in ('high','medium','low','under_review')),
//     public_note       text,
//     internal_reason   text,
//     reviewed_by       text,
//     reviewed_at       timestamptz default now()
//   );
//   grant select on agent_confidence_labels to anon, authenticated;

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "high" | "medium" | "low" | "under_review";

export type AgentConfidenceLabel = {
  agent_slug:       string;
  confidence_level: ConfidenceLevel;
  public_note:      string | null;  // shown on profile and public report
  internal_reason:  string | null;  // admin-only
  reviewed_by:      string | null;
  reviewed_at:      string | null;
};

export const CONFIDENCE_META: Record<ConfidenceLevel, { label: string; color: string; description: string }> = {
  high: {
    label:       "High Confidence",
    color:       "#22c55e",
    description: "Revenue figures verified against on-chain evidence. Stablecoin-denominated, Base-native, full wallet attribution.",
  },
  medium: {
    label:       "Medium Confidence",
    color:       "#f59e0b",
    description: "Revenue figures are directional. Partial wallet coverage or mixed token/stablecoin activity may affect precision.",
  },
  low: {
    label:       "Low Confidence",
    color:       "#ef4444",
    description: "Revenue figure is unreliable. High quarantine rate, missing wallets, or unresolved classification issues.",
  },
  under_review: {
    label:       "Attribution Under Review",
    color:       "#6b7280",
    description: "Revenue attribution is being verified. Figure may change once wallet data and classification are confirmed.",
  },
};

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getConfidenceLabel(slug: string): Promise<AgentConfidenceLabel | null> {
  if (!hasSupabaseAdminEnv()) return null;
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("agent_confidence_labels")
    .select("*")
    .eq("agent_slug", slug)
    .single();
  return data as AgentConfidenceLabel | null;
}

export async function getAllConfidenceLabels(): Promise<AgentConfidenceLabel[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("agent_confidence_labels")
    .select("*")
    .order("reviewed_at", { ascending: false });
  return (data ?? []) as AgentConfidenceLabel[];
}

export async function setConfidenceLabel(
  slug: string,
  level: ConfidenceLevel,
  opts: { public_note?: string; internal_reason?: string; reviewed_by?: string },
): Promise<void> {
  if (!hasSupabaseAdminEnv()) throw new Error("Supabase not configured");
  const sb = getSupabaseAdminClient();
  await sb.from("agent_confidence_labels").upsert(
    {
      agent_slug:       slug,
      confidence_level: level,
      public_note:      opts.public_note ?? null,
      internal_reason:  opts.internal_reason ?? null,
      reviewed_by:      opts.reviewed_by ?? null,
      reviewed_at:      new Date().toISOString(),
    },
    { onConflict: "agent_slug" },
  );
}
