import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";
import { AGENTS } from "@/app/registry/data";
import type { Agent, AgentWallet, WalletLabel, Ecosystem, Health, VerificationStatus, OutreachStatus } from "@/app/registry/types";

// ── Row types from Supabase ───────────────────────────────────────────────────

interface RegistryAgentRow {
  id: string;
  name: string;
  symbol: string | null;
  ecosystem: string;
  x_handle: string | null;
  website: string | null;
  bankr_profile: string | null;
  token_address: string | null;
  verification_status: string | null;
  financial_activity_score: number | null;
  treasury_health: string | null;
  partnership_fit_score: number | null;
  outreach_status: string | null;
  last_checked: string | null;
  admin_notes: string | null;
  priority: number | null;
  pfp: string | null;
  gitlawb_repo: string | null;
  evidence_sources: string[] | null;
}

interface RegistryAgentWalletRow {
  id: string;
  agent_name: string;
  address: string;
  label: string;
  notes: string | null;
}

export interface PendingUpdate {
  id: string;
  created_at: string;
  agent_name: string;
  update_type: "new_agent" | "score_update" | "wallet_update" | "status_change";
  proposed_data: Record<string, unknown>;
  diff_summary: string | null;
  luca_notes: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

// ── Row → Agent mapper ────────────────────────────────────────────────────────

function rowToAgent(row: RegistryAgentRow, wallets: AgentWallet[]): Agent {
  return {
    name: row.name,
    symbol: row.symbol ?? "—",
    ecosystem: (row.ecosystem as Ecosystem) ?? "Base",
    xHandle: row.x_handle ?? "",
    website: row.website,
    bankrProfile: row.bankr_profile,
    tokenAddress: row.token_address,
    wallets,
    verificationStatus: (row.verification_status as VerificationStatus) ?? "Candidate",
    evidenceSources: row.evidence_sources ?? [],
    financialActivityScore: row.financial_activity_score,
    treasuryHealth: (row.treasury_health as Health) ?? "Pending",
    partnershipFitScore: row.partnership_fit_score,
    outreachStatus: row.outreach_status as OutreachStatus | null,
    lastChecked: row.last_checked,
    adminNotes: row.admin_notes,
    priority: row.priority ?? 50,
    pfp: row.pfp ?? undefined,
    gitlawbRepo: row.gitlawb_repo ?? undefined,
  };
}

// ── Agent → DB row mapper ─────────────────────────────────────────────────────

function agentToRow(agent: Agent): Omit<RegistryAgentRow, "id"> {
  return {
    name: agent.name,
    symbol: agent.symbol,
    ecosystem: agent.ecosystem,
    x_handle: agent.xHandle,
    website: agent.website,
    bankr_profile: agent.bankrProfile,
    token_address: agent.tokenAddress,
    verification_status: agent.verificationStatus,
    financial_activity_score: agent.financialActivityScore,
    treasury_health: agent.treasuryHealth,
    partnership_fit_score: agent.partnershipFitScore,
    outreach_status: agent.outreachStatus,
    last_checked: agent.lastChecked,
    admin_notes: agent.adminNotes,
    priority: agent.priority,
    pfp: agent.pfp ?? null,
    gitlawb_repo: agent.gitlawbRepo ?? null,
    evidence_sources: agent.evidenceSources,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch all agents from Supabase. Falls back to static AGENTS if Supabase
 * is not configured or an error occurs.
 */
export async function getRegistryAgents(): Promise<{ agents: Agent[]; fromSupabase: boolean }> {
  if (!hasSupabaseAdminEnv()) {
    return { agents: AGENTS, fromSupabase: false };
  }

  try {
    const sb = getSupabaseAdminClient();

    const [agentsResult, walletsResult] = await Promise.all([
      sb
        .from("registry_agents")
        .select("*")
        .order("priority", { ascending: false }),
      sb.from("registry_agent_wallets").select("*"),
    ]);

    if (agentsResult.error) throw agentsResult.error;
    if (walletsResult.error) throw walletsResult.error;

    const agentRows = (agentsResult.data ?? []) as RegistryAgentRow[];
    const walletRows = (walletsResult.data ?? []) as RegistryAgentWalletRow[];

    if (agentRows.length === 0) {
      // DB is configured but empty — fall back to static
      return { agents: AGENTS, fromSupabase: false };
    }

    // Group wallets by agent_name
    const walletsByAgent: Record<string, AgentWallet[]> = {};
    for (const w of walletRows) {
      if (!walletsByAgent[w.agent_name]) walletsByAgent[w.agent_name] = [];
      walletsByAgent[w.agent_name].push({
        address: w.address,
        label: w.label as WalletLabel,
        notes: w.notes ?? undefined,
      });
    }

    const agents = agentRows.map((row) =>
      rowToAgent(row, walletsByAgent[row.name] ?? [])
    );

    return { agents, fromSupabase: true };
  } catch (err) {
    console.error("[registry-db] getRegistryAgents error:", err);
    return { agents: AGENTS, fromSupabase: false };
  }
}

/**
 * Fetch all pending updates from registry_pending_updates.
 */
export async function getPendingUpdates(): Promise<PendingUpdate[]> {
  if (!hasSupabaseAdminEnv()) return [];

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_pending_updates")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[registry-db] getPendingUpdates error:", error);
    return [];
  }

  return (data ?? []) as PendingUpdate[];
}

/**
 * Approve a pending update: upsert proposed_data into registry_agents (and
 * wallets if present), then mark the update row as approved.
 */
export async function approvePendingUpdate(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };

  const sb = getSupabaseAdminClient();

  // Fetch the pending update
  const { data: updateData, error: fetchError } = await sb
    .from("registry_pending_updates")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !updateData) {
    return { ok: false, error: fetchError?.message ?? "Update not found" };
  }

  const update = updateData as PendingUpdate;
  const proposed = update.proposed_data as Record<string, unknown>;

  try {
    // Build the agent row from proposed_data
    const agentFields: Record<string, unknown> = {
      name: proposed.name ?? update.agent_name,
      ecosystem: proposed.ecosystem ?? "Base",
      updated_at: new Date().toISOString(),
    };

    const fieldMap: Record<string, string> = {
      symbol: "symbol",
      xHandle: "x_handle",
      website: "website",
      bankrProfile: "bankr_profile",
      tokenAddress: "token_address",
      verificationStatus: "verification_status",
      financialActivityScore: "financial_activity_score",
      treasuryHealth: "treasury_health",
      partnershipFitScore: "partnership_fit_score",
      outreachStatus: "outreach_status",
      lastChecked: "last_checked",
      adminNotes: "admin_notes",
      priority: "priority",
      pfp: "pfp",
      gitlawbRepo: "gitlawb_repo",
      evidenceSources: "evidence_sources",
    };

    for (const [agentKey, dbKey] of Object.entries(fieldMap)) {
      if (agentKey in proposed) {
        agentFields[dbKey] = proposed[agentKey];
      }
    }

    // Upsert into registry_agents
    const { error: upsertError } = await sb
      .from("registry_agents")
      .upsert(agentFields, { onConflict: "name" });

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }

    // If proposed_data includes wallets, upsert them
    const wallets = proposed.wallets as AgentWallet[] | undefined;
    if (Array.isArray(wallets) && wallets.length > 0) {
      const agentName = String(agentFields.name);

      // Delete old wallet rows for this agent, then insert new ones
      await sb.from("registry_agent_wallets").delete().eq("agent_name", agentName);

      const walletRows = wallets.map((w) => ({
        agent_name: agentName,
        address: w.address,
        label: w.label,
        notes: w.notes ?? null,
      }));

      const { error: walletError } = await sb
        .from("registry_agent_wallets")
        .insert(walletRows);

      if (walletError) {
        return { ok: false, error: walletError.message };
      }
    }

    // Mark update as approved
    const { error: markError } = await sb
      .from("registry_pending_updates")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (markError) {
      return { ok: false, error: markError.message };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Reject a pending update, optionally storing reviewer notes.
 */
export async function rejectPendingUpdate(
  id: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };

  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("registry_pending_updates")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Insert pending update rows (called by the luca-update API route).
 */
export interface PendingUpdateInput {
  agent_name: string;
  update_type: "new_agent" | "score_update" | "wallet_update" | "status_change";
  proposed_data: Record<string, unknown>;
  diff_summary?: string;
  luca_notes?: string;
}

export async function insertPendingUpdates(
  updates: PendingUpdateInput[]
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, inserted: 0, error: "Supabase not configured" };

  const sb = getSupabaseAdminClient();
  const rows = updates.map((u) => ({
    agent_name: u.agent_name,
    update_type: u.update_type,
    proposed_data: u.proposed_data,
    diff_summary: u.diff_summary ?? null,
    luca_notes: u.luca_notes ?? null,
    status: "pending",
  }));

  const { error, data } = await sb
    .from("registry_pending_updates")
    .insert(rows)
    .select("id");

  if (error) return { ok: false, inserted: 0, error: error.message };
  return { ok: true, inserted: (data ?? []).length };
}

// ── Seed helper (used once to populate DB from static data) ──────────────────

export async function seedRegistryFromStaticData(): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };

  const sb = getSupabaseAdminClient();

  const agentRows = AGENTS.map(agentToRow);
  const { error: agentError } = await sb
    .from("registry_agents")
    .upsert(agentRows, { onConflict: "name" });

  if (agentError) return { ok: false, error: agentError.message };

  const walletRows = AGENTS.flatMap((a) =>
    a.wallets.map((w) => ({
      agent_name: a.name,
      address: w.address,
      label: w.label,
      notes: w.notes ?? null,
    }))
  );

  if (walletRows.length > 0) {
    const { error: walletError } = await sb
      .from("registry_agent_wallets")
      .upsert(walletRows, { onConflict: "id" });

    if (walletError) return { ok: false, error: walletError.message };
  }

  return { ok: true };
}
