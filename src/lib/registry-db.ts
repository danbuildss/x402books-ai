import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";
import { AGENTS } from "@/app/registry/data";
import type {
  Agent, AgentWallet, WalletLabel, Ecosystem, Health, VerificationStatus, OutreachStatus,
  CommunicationIdentity, CommPlatform, CommConfidence, CommLabel,
} from "@/app/registry/types";

// ── Row types from Supabase ───────────────────────────────────────────────────

interface RegistryAgentRow {
  id: string;
  slug?: string | null;
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
  chain: string | null;
  role: string | null;
  confidence: string | null;
  evidence_source: string | null;
  address_type: string | null; // populated after classification audit
}

interface CommIdentityRow {
  id: string;
  agent_name: string;
  platform: string;
  handle: string;
  url: string | null;
  confidence: string;
  labels: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommIdentityInput {
  agent_name: string;
  platform: CommPlatform;
  handle: string;
  url?: string | null;
  confidence: CommConfidence;
  labels: CommLabel[];
  notes?: string | null;
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

function rowToCommIdentity(row: CommIdentityRow): CommunicationIdentity {
  return {
    id: row.id,
    platform: row.platform as CommPlatform,
    handle: row.handle,
    url: row.url,
    confidence: row.confidence as CommConfidence,
    labels: (row.labels ?? []) as CommLabel[],
    notes: row.notes,
  };
}

function rowToAgent(
  row: RegistryAgentRow,
  wallets: AgentWallet[],
  commIdentities?: CommunicationIdentity[],
): Agent {
  return {
    name: row.name,
    symbol: row.symbol ?? "—",
    ecosystem: (row.ecosystem as Ecosystem) ?? "Base",
    xHandle: row.x_handle ?? "",
    website: row.website,
    bankrProfile: row.bankr_profile,
    tokenAddress: row.token_address,
    wallets: wallets ?? [],
    verificationStatus: (row.verification_status as VerificationStatus) ?? "Candidate",
    evidenceSources: row.evidence_sources ?? [],
    treasuryHealth: (row.treasury_health as Health) ?? "Pending",
    outreachStatus: row.outreach_status as OutreachStatus | null,
    lastChecked: row.last_checked,
    adminNotes: row.admin_notes,
    priority: row.priority ?? 50,
    pfp: row.pfp ?? undefined,
    gitlawbRepo: row.gitlawb_repo ?? undefined,
    communicationIdentities: commIdentities ?? [],
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
    financial_activity_score: null,
    treasury_health: agent.treasuryHealth,
    partnership_fit_score: null,
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

    const [agentsResult, walletsResult, commResult] = await Promise.all([
      sb
        .from("registry_agents")
        .select("*")
        .order("priority", { ascending: false }),
      sb.from("registry_agent_wallets").select("*"),
      sb.from("registry_agent_comm_identities").select("*"),
    ]);

    if (agentsResult.error) throw agentsResult.error;
    if (walletsResult.error) throw walletsResult.error;

    const agentRows = (agentsResult.data ?? []) as RegistryAgentRow[];
    const walletRows = (walletsResult.data ?? []) as RegistryAgentWalletRow[];
    const commRows = (commResult.data ?? []) as CommIdentityRow[];

    if (agentRows.length === 0) {
      return { agents: AGENTS, fromSupabase: false };
    }

    // Group wallets by agent_name
    const walletsByAgent: Record<string, AgentWallet[]> = {};
    for (const w of walletRows) {
      if (!walletsByAgent[w.agent_name]) walletsByAgent[w.agent_name] = [];
      walletsByAgent[w.agent_name].push({
        address: w.address,
        label: w.label as WalletLabel,
        role: w.role ?? undefined,
        chain: w.chain ?? undefined,
        confidence: w.confidence ?? undefined,
        evidenceSource: w.evidence_source ?? undefined,
        notes: w.notes ?? undefined,
        address_type: (w.address_type ?? undefined) as import("@/app/registry/types").AddressType | undefined,
      });
    }

    // Group comm identities by agent_name
    const commByAgent: Record<string, CommunicationIdentity[]> = {};
    for (const c of commRows) {
      if (!commByAgent[c.agent_name]) commByAgent[c.agent_name] = [];
      commByAgent[c.agent_name].push(rowToCommIdentity(c));
    }

    const agents = agentRows.map((row) =>
      rowToAgent(row, walletsByAgent[row.name] ?? [], commByAgent[row.name] ?? [])
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

  // Fetch only if still pending — concurrent approvals for the same update
  // will get null here once the first one marks it approved, preventing
  // double-wallet insertion.
  const { data: updateData, error: fetchError } = await sb
    .from("registry_pending_updates")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (fetchError || !updateData) {
    return { ok: false, error: fetchError?.message ?? "Update not found" };
  }

  const update = updateData as PendingUpdate;
  const proposed = update.proposed_data as Record<string, unknown>;

  try {
    // Resolve the canonical agent name from the registry (case-insensitive).
    // The manifest may use different casing (e.g. "AEON" vs "Aeon") — we match
    // by slug so wallets land on the existing registry entry, not a new one.
    const rawName = String(proposed.name ?? update.agent_name);
    const toSlug  = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const rawSlug = toSlug(rawName);

    // Query by slug pattern server-side — avoids the silent 100-row client-side scan
    // that would miss agents beyond the limit. The slug is a deterministic lowercase
    // transform of the name, so we match all rows whose name lowercases to rawSlug.
    const { data: existingRows } = await sb
      .from("registry_agents")
      .select("name")
      .ilike("name", rawName);

    const existingMatch = (existingRows ?? []).find(
      (r: { name: string }) => toSlug(r.name) === rawSlug,
    );
    const canonicalName = existingMatch ? existingMatch.name : rawName;

    // Build the agent row from proposed_data
    const agentFields: Record<string, unknown> = {
      name:       canonicalName,
      updated_at: new Date().toISOString(),
    };

    // Only update ecosystem if the manifest explicitly provides one — never clobber with "Base" default
    if (proposed.ecosystem) agentFields.ecosystem = proposed.ecosystem;

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

    // Promote to "Wallets Declared" AFTER fieldMap so it always wins over anything in proposed_data
    const hasWallets = Array.isArray(proposed.wallets) && (proposed.wallets as unknown[]).length > 0;
    if (hasWallets) {
      agentFields.verification_status = "Wallets Declared";
    }

    // Upsert into registry_agents
    const { error: upsertError } = await sb
      .from("registry_agents")
      .upsert(agentFields, { onConflict: "name" });

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }

    // If proposed_data includes wallets, replace them atomically:
    // insert new rows first so that if the insert fails the old wallets survive.
    type PendingWallet = AgentWallet & { role?: string; chain?: string; confidence?: string; evidence_source?: string };
    const wallets = proposed.wallets as PendingWallet[] | undefined;
    if (Array.isArray(wallets) && wallets.length > 0) {
      const agentName = String(agentFields.name);

      const walletRows = wallets.map((w) => ({
        agent_name:      agentName,
        address:         w.address,
        label:           w.label,
        notes:           w.notes ?? null,
        chain:           w.chain ?? "base",
        role:            w.role ?? "unknown",
        confidence:      w.confidence ?? "declared",
        evidence_source: w.evidence_source ?? "manifest",
      }));

      // Snapshot current wallet IDs before any mutations
      const { data: oldWallets } = await sb
        .from("registry_agent_wallets")
        .select("id")
        .eq("agent_name", agentName);
      const oldIds = (oldWallets ?? []).map((w: { id: string }) => w.id);

      // Insert new rows — if this fails, old wallets are untouched
      const { error: walletError } = await sb
        .from("registry_agent_wallets")
        .insert(walletRows);

      if (walletError) {
        return { ok: false, error: walletError.message };
      }

      // Insert succeeded — delete old rows by their specific IDs
      if (oldIds.length > 0) {
        await sb.from("registry_agent_wallets").delete().in("id", oldIds);
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

  const inserted = (data ?? []).length;

  // Notify admin bot on new manifest submissions (fire-and-forget)
  if (inserted > 0) {
    const chatId = process.env.LUCA_ADMIN_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (chatId && botToken) {
      const names = updates.map((u) => u.agent_name).join(", ");
      const type  = updates[0]?.update_type ?? "update";
      const text  = `📥 <b>New pending update</b>\n\nType: <code>${type}</code>\nAgent(s): <b>${names}</b>\n\n<a href="https://www.zettaai.co/luca-admin/registry-updates">Review in admin →</a>`;
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      }).catch(() => { /* non-blocking — failure is silent */ });
    }
  }

  return { ok: true, inserted };
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
      agent_name:      a.name,
      address:         w.address,
      label:           w.label,
      notes:           w.notes ?? null,
      chain:           w.chain ?? "base",
      role:            w.role ?? "unknown",
      confidence:      w.confidence ?? "declared",
      evidence_source: w.evidenceSource ?? "manifest",
      address_type:    w.address_type ?? null,
    }))
  );

  if (walletRows.length > 0) {
    const { error: walletError } = await sb
      .from("registry_agent_wallets")
      .upsert(walletRows, { onConflict: "agent_name,address" });

    if (walletError) return { ok: false, error: walletError.message };
  }

  return { ok: true };
}

// ── Communication identity CRUD ───────────────────────────────────────────────

export async function getCommIdentities(
  agentName?: string,
): Promise<{ ok: boolean; data: CommunicationIdentity[]; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, data: [], error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();
  let query = sb.from("registry_agent_comm_identities").select("*").order("created_at", { ascending: false });
  if (agentName) query = query.eq("agent_name", agentName);
  const { data, error } = await query;
  if (error) return { ok: false, data: [], error: error.message };
  return { ok: true, data: ((data ?? []) as CommIdentityRow[]).map(rowToCommIdentity) };
}

export async function createCommIdentity(
  input: CommIdentityInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_agent_comm_identities")
    .insert({
      agent_name: input.agent_name,
      platform:   input.platform,
      handle:     input.handle,
      url:        input.url ?? null,
      confidence: input.confidence,
      labels:     input.labels,
      notes:      input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateCommIdentity(
  id: string,
  patch: Partial<Omit<CommIdentityInput, "agent_name">>,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("registry_agent_comm_identities")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCommIdentity(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseAdminEnv()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("registry_agent_comm_identities")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
