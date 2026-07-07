// Luca Session Memory
//
// Stores key facts Luca writes after each conversation.
// Schema: luca_memory { id, user_id, agent_slug, key, value, updated_at }
// Read on session start. Written after explicit user statements and implicit signals.

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export type MemoryEntry = {
  key:        string;
  value:      string;
  agent_slug: string | null;
  updated_at: string;
};

export async function readMemory(userId: string, agentSlug?: string): Promise<MemoryEntry[]> {
  if (!hasSupabaseAdminEnv()) return [];
  const sb = getSupabaseAdminClient();
  let q = sb
    .from("luca_memory")
    .select("key, value, agent_slug, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (agentSlug) q = q.eq("agent_slug", agentSlug);
  const { data } = await q;
  return (data ?? []) as MemoryEntry[];
}

export async function writeMemory(
  userId: string,
  agentSlug: string | null,
  key: string,
  value: string,
): Promise<void> {
  if (!hasSupabaseAdminEnv()) return;
  const sb = getSupabaseAdminClient();
  await sb.from("luca_memory").upsert(
    { user_id: userId, agent_slug: agentSlug, key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,agent_slug,key" },
  );
}

export function formatMemoryContext(entries: MemoryEntry[]): string {
  if (!entries.length) return "";
  const lines = entries.map((e) =>
    e.agent_slug
      ? `- [${e.agent_slug}] ${e.key}: ${e.value}`
      : `- ${e.key}: ${e.value}`,
  );
  return `Prior session context:\n${lines.join("\n")}`;
}
