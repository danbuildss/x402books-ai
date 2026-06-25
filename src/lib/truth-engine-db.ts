import { getSupabaseAdminClient } from "./supabase-admin";
import { validateManifest, parseManifest } from "./truth-engine/manifest-validator";
import { normalizeWalletGraph } from "./truth-engine/wallet-graph";
import { assessBooksEligibility } from "./truth-engine/books-eligibility";
import { buildManifestEvidencePacket, buildWalletClaimEvidencePacket } from "./truth-engine/evidence";
import { evidenceRank } from "./truth-engine/revenue-classifier";
import type { WalletRoleGraph } from "./truth-engine/wallet-graph";
import type { BooksEligibilitySnapshot } from "./truth-engine/books-eligibility";
import type { EvidencePacket } from "./truth-engine/evidence";
import type { ClassifiedEvent } from "./truth-engine/revenue-classifier";

export async function upsertManifestSubmission(params: {
  reference_id:        string;
  agent_slug:          string;
  ecosystem?:          string;
  repo_url?:           string;
  manifest_path?:      string;
  manifest_version?:   string;
  submitted_by?:       string;
  verification_status?: string;
  parsed_manifest:     unknown;
  validation_errors?:  unknown[];
}) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("registry_manifest_submissions").upsert(
    {
      reference_id:        params.reference_id,
      agent_slug:          params.agent_slug,
      ecosystem:           params.ecosystem ?? null,
      repo_url:            params.repo_url ?? null,
      manifest_path:       params.manifest_path ?? ".agent/wallets.json",
      manifest_version:    params.manifest_version ?? null,
      submitted_by:        params.submitted_by ?? null,
      verification_status: params.verification_status ?? "pending",
      parsed_manifest:     params.parsed_manifest,
      validation_errors:   params.validation_errors ?? [],
    },
    { onConflict: "reference_id" },
  );
  if (error) throw new Error(`upsertManifestSubmission: ${error.message}`);
}

export async function upsertWalletClaims(graph: WalletRoleGraph) {
  const sb = getSupabaseAdminClient();
  const rows = graph.wallets.map((w) => ({
    agent_slug:       graph.agent_slug,
    address:          w.address,
    chain:            w.chain,
    role:             w.role,
    claim_status:     w.claim_status,
    evidence_status:  w.evidence_status,
    evidence_summary: `Declared in manifest as ${w.role} on ${w.chain}`,
    evidence_packet:  { source_ref: w.source_ref, label: w.label ?? null, notes: w.notes ?? null },
    source_type:      w.source_type,
    source_ref:       w.source_ref,
    confidence:       w.confidence,
    books_eligible:   w.books_eligible,
  }));
  const { error } = await sb.from("registry_wallet_claims").upsert(rows, {
    onConflict: "agent_slug,address,chain,role",
  });
  if (error) throw new Error(`upsertWalletClaims: ${error.message}`);
}

export async function insertEligibilitySnapshot(snapshot: BooksEligibilitySnapshot) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("books_eligibility_snapshots").insert({
    agent_slug:         snapshot.agent_slug,
    period_label:       snapshot.period_label,
    wallet_count:       snapshot.wallet_count,
    eligible_wallets:   snapshot.eligible_wallets,
    ineligible_wallets: snapshot.ineligible_wallets,
    reasons:            snapshot.reasons,
    confidence_summary: snapshot.confidence_summary,
  });
  if (error) throw new Error(`insertEligibilitySnapshot: ${error.message}`);
}

export async function insertEvidencePacket(packet: EvidencePacket) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("registry_evidence_packets").insert({
    subject_type:     packet.subject_type,
    subject_slug:     packet.subject_slug,
    claim:            packet.claim,
    status:           packet.status,
    confidence:       packet.confidence,
    evidence_summary: packet.evidence_summary,
    evidence_payload: packet.evidence_payload,
    source_type:      packet.source_type,
    source_ref:       packet.source_ref,
  });
  if (error) throw new Error(`insertEvidencePacket: ${error.message}`);
}

export async function getWalletClaims(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_wallet_claims")
    .select("*")
    .eq("agent_slug", agentSlug)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getWalletClaims: ${error.message}`);
  return data ?? [];
}

export async function getLatestEligibilitySnapshot(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("books_eligibility_snapshots")
    .select("*")
    .eq("agent_slug", agentSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestEligibilitySnapshot: ${error.message}`);
  return data;
}

export async function getLatestManifestSubmission(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_manifest_submissions")
    .select("*")
    .eq("agent_slug", agentSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestManifestSubmission: ${error.message}`);
  return data;
}

export async function getAgentEvidencePackets(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_evidence_packets")
    .select("*")
    .eq("subject_type", "agent")
    .eq("subject_slug", agentSlug)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getAgentEvidencePackets: ${error.message}`);
  return data ?? [];
}

// Orchestrate full truth engine ingestion for a manifest.
// Silently returns an error string on failure so callers can swallow it.
export async function ingestManifestTruth(
  manifest: unknown,
  options: { repoUrl?: string; sourceUrl?: string; submittedBy?: string } = {},
): Promise<{ ok: true; agentSlug: string } | { ok: false; error: string }> {
  try {
    const validation = validateManifest(manifest);
    const parsed     = parseManifest(manifest);
    const agentSlug  = parsed.agent.toLowerCase().replace(/\s+/g, "-");
    const sourceRef  = options.sourceUrl ?? options.repoUrl ?? ".agent/wallets.json";

    await upsertManifestSubmission({
      reference_id:        `manifest:${agentSlug}`,
      agent_slug:          agentSlug,
      ecosystem:           parsed.ecosystem,
      repo_url:            options.repoUrl,
      manifest_version:    parsed.version,
      submitted_by:        options.submittedBy,
      verification_status: validation.ok ? "validated" : "invalid",
      parsed_manifest:     manifest,
      validation_errors:   validation.errors,
    });

    if (!validation.ok) {
      return { ok: false, error: `Validation failed: ${validation.errors.join("; ")}` };
    }

    const graph    = normalizeWalletGraph(parsed, sourceRef);
    const snapshot = assessBooksEligibility(graph, new Date().toISOString().slice(0, 10));

    await upsertWalletClaims(graph);
    await insertEligibilitySnapshot(snapshot);
    await insertEvidencePacket(buildManifestEvidencePacket(agentSlug, parsed, sourceRef));
    for (const wallet of graph.wallets) {
      await insertEvidencePacket(buildWalletClaimEvidencePacket(agentSlug, wallet, sourceRef));
    }

    return { ok: true, agentSlug };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Phase 2: Revenue classification helpers ───────────────────────────────────

export async function insertRevenueClassificationEvent(
  agentSlug: string,
  event:     ClassifiedEvent,
) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("revenue_classification_events").upsert(
    {
      agent_slug:            agentSlug,
      tx_hash:               event.txHash,
      chain:                 event.chain,
      observed_at:           event.observed_at,
      asset_symbol:          event.assetSymbol,
      amount_usd:            event.valueUsd ?? null,
      direction:             event.direction,
      classification:        event.classification,
      classification_reason: event.classification_reason,
      confidence:            event.confidence,
      evidence_packet: {
        from:    event.from,
        to:      event.to,
        isERC20: event.isERC20,
      },
    },
    { onConflict: "agent_slug,tx_hash,classification", ignoreDuplicates: true },
  );
  if (error) throw new Error(`insertRevenueClassificationEvent: ${error.message}`);
}

export async function getRevenueEvents(
  agentSlug: string,
  options?: {
    limit?:          number;
    offset?:         number;
    chain?:          string;
    classification?: string;
    sinceDate?:      string;  // ISO date string
  },
) {
  const sb = getSupabaseAdminClient();
  let query = sb
    .from("revenue_classification_events")
    .select("*")
    .eq("agent_slug", agentSlug)
    .order("observed_at", { ascending: false });

  if (options?.chain)          query = query.eq("chain", options.chain);
  if (options?.classification) query = query.eq("classification", options.classification);
  if (options?.sinceDate)      query = query.gte("observed_at", options.sinceDate);
  if (options?.limit)          query = query.limit(options.limit);
  if (options?.offset)         query = query.range(
    options.offset,
    (options.offset) + (options.limit ?? 50) - 1,
  );

  const { data, error } = await query;
  if (error) throw new Error(`getRevenueEvents: ${error.message}`);
  return data ?? [];
}

export async function getBooksEligibleWallets(agentSlug?: string) {
  const sb = getSupabaseAdminClient();
  let query = sb
    .from("registry_wallet_claims")
    .select("agent_slug, address, chain, role, evidence_status, confidence")
    .eq("books_eligible", true);

  if (agentSlug) query = query.eq("agent_slug", agentSlug);

  const { data, error } = await query;
  if (error) throw new Error(`getBooksEligibleWallets: ${error.message}`);
  return data ?? [];
}

export async function getAllRegistryWalletAddresses(): Promise<string[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_wallet_claims")
    .select("address");
  if (error) throw new Error(`getAllRegistryWalletAddresses: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.address.toLowerCase()))];
}

// Only upgrades — never downgrades. Checks current status before writing.
export async function upgradeWalletEvidenceStatus(
  agentSlug:  string,
  address:    string,
  chain:      string,
  newStatus:  string,
) {
  const sb = getSupabaseAdminClient();

  const { data, error: readErr } = await sb
    .from("registry_wallet_claims")
    .select("id, evidence_status")
    .eq("agent_slug", agentSlug)
    .eq("address", address.toLowerCase())
    .eq("chain", chain);

  if (readErr) throw new Error(`upgradeWalletEvidenceStatus read: ${readErr.message}`);
  if (!data || data.length === 0) return;

  const newRank = evidenceRank(newStatus);
  const idsToUpgrade = data
    .filter((row) => newRank > evidenceRank(row.evidence_status ?? "attributed"))
    .map((row) => row.id as string);

  if (idsToUpgrade.length === 0) return;

  const { error: updateErr } = await sb
    .from("registry_wallet_claims")
    .update({ evidence_status: newStatus })
    .in("id", idsToUpgrade);

  if (updateErr) throw new Error(`upgradeWalletEvidenceStatus update: ${updateErr.message}`);
}
