import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export type ToolDecisionEvent = {
  id: string;
  agent_id: string;
  package: string;
  source: string | null;
  trust_score: number | null;
  risk_level: "low" | "medium" | "high" | "unknown";
  decision: "install" | "reject" | "defer" | "unknown";
  event_time: string;
  project_id: string | null;
  decision_proof_hash: string | null;
};

export async function getToolDecisions(agentId: string, limit = 10): Promise<ToolDecisionEvent[]> {
  if (!hasSupabaseAdminEnv()) return [];
  try {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("tool_decision_events")
      .select("id, agent_id, package, source, trust_score, risk_level, decision, event_time, project_id, decision_proof_hash")
      .eq("agent_id", agentId)
      .order("event_time", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as ToolDecisionEvent[];
  } catch {
    return [];
  }
}
