import { createHash } from "node:crypto";
import { toSlug } from "@/lib/slug";
import { addressTypeForRole } from "@/lib/wallet-eligibility";
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

const VALIDATOR_VERSION = "financial-truth-v1";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function manifestDigest(manifest: unknown): string {
  return `sha256:${createHash("sha256").update(stableJson(manifest)).digest("hex")}`;
}

async function resolveRegistryAgent(agentSlug: string): Promise<{ id: string; name: string } | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("registry_agents").select("id,name");
  if (error) throw new Error(`resolveRegistryAgent: ${error.message}`);
  return (data ?? []).find((agent: { id: string; name: string }) => toSlug(agent.name) === agentSlug) ?? null;
}

export async function upsertManifestSubmission(params: {
  reference_id: string; agent_slug: string; agent_id?: string; ecosystem?: string;
  repo_url?: string; manifest_path?: string; manifest_version?: string; manifest_digest?: string;
  source_revision?: string; submitted_by?: string; verification_status?: string;
  parsed_manifest: unknown; validation_errors?: unknown[]; validation_warnings?: unknown[];
}) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("registry_manifest_submissions").upsert({
    reference_id: params.reference_id,
    agent_slug: params.agent_slug,
    agent_id: params.agent_id ?? null,
    ecosystem: params.ecosystem ?? null,
    repo_url: params.repo_url ?? null,
    manifest_path: params.manifest_path ?? ".agent/wallets.json",
    manifest_version: params.manifest_version ?? null,
    manifest_digest: params.manifest_digest ?? null,
    source_revision: params.source_revision ?? null,
    validator_version: VALIDATOR_VERSION,
    submitted_by: params.submitted_by ?? null,
    verification_status: params.verification_status ?? "pending",
    parsed_manifest: params.parsed_manifest,
    validation_errors: params.validation_errors ?? [],
    validation_warnings: params.validation_warnings ?? [],
  }, { onConflict: "reference_id" });
  if (error) throw new Error(`upsertManifestSubmission: ${error.message}`);
}

export async function upsertWalletClaims(graph: WalletRoleGraph) {
  const sb = getSupabaseAdminClient();
  const registryAgent = await resolveRegistryAgent(graph.agent_slug);
  const rows = graph.wallets.map((wallet) => ({
    agent_slug: graph.agent_slug,
    agent_id: registryAgent?.id ?? null,
    address: wallet.address,
    chain: wallet.chain,
    role: wallet.role,
    claim_status: wallet.claim_status,
    evidence_status: wallet.evidence_status,
    evidence_summary: `Declared in manifest as ${wallet.role} on ${wallet.chain}; control=${wallet.control_status}`,
    evidence_packet: {
      source_ref: wallet.source_ref, label: wallet.label ?? null, notes: wallet.notes ?? null,
      control_proof: wallet.control_proof, proves_revenue: false,
    },
    source_type: wallet.source_type,
    source_ref: wallet.source_ref,
    confidence: wallet.confidence,
    books_eligible: wallet.books_eligible,
    claim_source: wallet.claim_source,
    control_proof: wallet.control_proof,
    control_status: wallet.control_status,
    valid_from: wallet.valid_from ?? null,
    valid_until: wallet.valid_until ?? null,
    wallet_status: wallet.status,
    claimed_at: wallet.claimed_at ?? null,
    verified_at: wallet.verified_at ?? null,
    revoked_at: wallet.revoked_at ?? null,
    revocation_reason: wallet.revocation_reason ?? null,
  }));
  const { error } = await sb.from("registry_wallet_claims").upsert(rows, { onConflict: "agent_slug,address,chain,role" });
  if (error) throw new Error(`upsertWalletClaims: ${error.message}`);
  await syncWalletClaimsToRegistry(graph, registryAgent);
}

async function syncWalletClaimsToRegistry(
  graph: WalletRoleGraph,
  registryAgent: { id: string; name: string } | null,
): Promise<void> {
  if (!registryAgent) {
    console.warn(JSON.stringify({ type: "wallet_sync_skipped", slug: graph.agent_slug, note: "No immutable registry agent match" }));
    return;
  }
  const sb = getSupabaseAdminClient();
  const activeWallets = graph.wallets.filter((wallet) => wallet.status === "active");
  if (activeWallets.length === 0) return;
  const rows = activeWallets.map((wallet) => ({
    agent_name: registryAgent.name,
    address: wallet.address,
    label: wallet.label ?? wallet.role,
    notes: wallet.notes ?? null,
    chain: wallet.chain,
    role: wallet.role,
    confidence: wallet.control_status === "unverified" ? "declared" : "verified",
    evidence_source: "manifest",
    address_type: addressTypeForRole(wallet.role),
  }));
  const { error } = await sb.from("registry_agent_wallets").upsert(rows, { onConflict: "agent_name,address" });
  if (error) throw new Error(`syncWalletClaimsToRegistry: ${error.message}`);
}

export async function insertEligibilitySnapshot(snapshot: BooksEligibilitySnapshot) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("books_eligibility_snapshots").insert({
    agent_slug: snapshot.agent_slug, period_label: snapshot.period_label,
    wallet_count: snapshot.wallet_count, eligible_wallets: snapshot.eligible_wallets,
    ineligible_wallets: snapshot.ineligible_wallets, reasons: snapshot.reasons,
    confidence_summary: snapshot.confidence_summary,
  });
  if (error) throw new Error(`insertEligibilitySnapshot: ${error.message}`);
}

export async function insertEvidencePacket(packet: EvidencePacket) {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("registry_evidence_packets").insert(packet);
  if (error) throw new Error(`insertEvidencePacket: ${error.message}`);
}

export async function getWalletClaims(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("registry_wallet_claims").select("*")
    .eq("agent_slug", agentSlug).order("created_at", { ascending: false });
  if (error) throw new Error(`getWalletClaims: ${error.message}`);
  return data ?? [];
}

export async function getLatestEligibilitySnapshot(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("books_eligibility_snapshots").select("*")
    .eq("agent_slug", agentSlug).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`getLatestEligibilitySnapshot: ${error.message}`);
  return data;
}

export async function getLatestManifestSubmission(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("registry_manifest_submissions").select("*")
    .eq("agent_slug", agentSlug).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`getLatestManifestSubmission: ${error.message}`);
  return data;
}

export async function getAgentEvidencePackets(agentSlug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("registry_evidence_packets").select("*")
    .eq("subject_type", "agent").eq("subject_slug", agentSlug).order("created_at", { ascending: false });
  if (error) throw new Error(`getAgentEvidencePackets: ${error.message}`);
  return data ?? [];
}

export async function ingestManifestTruth(
  manifest: unknown,
  options: { repoUrl?: string; sourceUrl?: string; submittedBy?: string } = {},
): Promise<{ ok: true; agentSlug: string; agentId: string | null; manifestDigest: string } | { ok: false; error: string }> {
  try {
    const validation = validateManifest(manifest);
    const parsed = parseManifest(manifest);
    const agentSlug = toSlug(parsed.agent);
    const sourceRef = options.sourceUrl ?? options.repoUrl ?? ".agent/wallets.json";
    const registryAgent = agentSlug ? await resolveRegistryAgent(agentSlug) : null;
    const digest = manifestDigest(manifest);

    await upsertManifestSubmission({
      reference_id: `manifest:${agentSlug}:${digest}`,
      agent_slug: agentSlug,
      agent_id: registryAgent?.id,
      ecosystem: parsed.ecosystem,
      repo_url: options.repoUrl,
      manifest_version: parsed.version,
      manifest_digest: digest,
      source_revision: parsed.source_revision,
      submitted_by: options.submittedBy,
      verification_status: validation.ok ? "validated" : "invalid",
      parsed_manifest: manifest,
      validation_errors: validation.issues,
      validation_warnings: validation.warnings,
    });

    if (!validation.ok) return { ok: false, error: `Validation failed: ${validation.errors.join("; ")}` };
    const graph = normalizeWalletGraph(parsed, sourceRef);
    const snapshot = assessBooksEligibility(graph, new Date().toISOString().slice(0, 10));
    await upsertWalletClaims(graph);
    await insertEligibilitySnapshot(snapshot);
    await insertEvidencePacket(buildManifestEvidencePacket(agentSlug, parsed, sourceRef));
    for (const wallet of graph.wallets) await insertEvidencePacket(buildWalletClaimEvidencePacket(agentSlug, wallet, sourceRef));
    return { ok: true, agentSlug, agentId: registryAgent?.id ?? null, manifestDigest: digest };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function insertRevenueClassificationEvent(agentSlug: string, event: ClassifiedEvent) {
  const sb = getSupabaseAdminClient();
  const registryAgent = await resolveRegistryAgent(agentSlug);
  const { error } = await sb.from("revenue_classification_events").upsert({
    agent_slug: agentSlug,
    agent_id: registryAgent?.id ?? null,
    tx_hash: event.txHash,
    chain: event.chain,
    observed_at: event.observed_at,
    asset_symbol: event.assetSymbol,
    amount_usd: event.valueUsd ?? null,
    direction: event.direction,
    classification: event.classification,
    classification_reason: event.classification_reason,
    confidence: event.confidence,
    recognition_status: event.recognition_status,
    evidence_basis: event.evidence_basis,
    evidence_packet: { from: event.from, to: event.to, isERC20: event.isERC20, proves_revenue: false },
  }, { onConflict: "agent_slug,tx_hash,classification", ignoreDuplicates: true });
  if (error) throw new Error(`insertRevenueClassificationEvent: ${error.message}`);
}

export async function getRevenueEvents(agentSlug: string, options?: {
  limit?: number; offset?: number; chain?: string; classification?: string; sinceDate?: string;
}) {
  const sb = getSupabaseAdminClient();
  let query = sb.from("revenue_classification_events").select("*").eq("agent_slug", agentSlug)
    .order("observed_at", { ascending: false });
  if (options?.chain) query = query.eq("chain", options.chain);
  if (options?.classification) query = query.eq("classification", options.classification);
  if (options?.sinceDate) query = query.gte("observed_at", options.sinceDate);
  if (options?.offset !== undefined) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  else if (options?.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw new Error(`getRevenueEvents: ${error.message}`);
  return data ?? [];
}

export async function getBooksEligibleWallets(agentSlug?: string) {
  const sb = getSupabaseAdminClient();
  let query = sb.from("registry_wallet_claims")
    .select("agent_slug, agent_id, address, chain, role, evidence_status, confidence")
    .eq("books_eligible", true).eq("wallet_status", "active");
  if (agentSlug) query = query.eq("agent_slug", agentSlug);
  const { data, error } = await query;
  if (error) throw new Error(`getBooksEligibleWallets: ${error.message}`);
  return data ?? [];
}

export async function getAllRegistryWalletAddresses(): Promise<string[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("registry_wallet_claims").select("address")
    .eq("wallet_status", "active");
  if (error) throw new Error(`getAllRegistryWalletAddresses: ${error.message}`);
  return [...new Set((data ?? []).map((row) => row.address.toLowerCase()))];
}

export async function upgradeWalletEvidenceStatus(agentSlug: string, address: string, chain: string, newStatus: string) {
  // Observed chain activity may upgrade attribution to observed, but this path
  // can never grant verified control or verified revenue.
  if (evidenceRank(newStatus) > evidenceRank("observed")) throw new Error("Onchain activity cannot grant verified evidence status");
  const sb = getSupabaseAdminClient();
  const { data, error: readError } = await sb.from("registry_wallet_claims")
    .select("id,evidence_status").eq("agent_slug", agentSlug).eq("address", address.toLowerCase()).eq("chain", chain);
  if (readError) throw new Error(`upgradeWalletEvidenceStatus read: ${readError.message}`);
  const ids = (data ?? []).filter((row) => evidenceRank(newStatus) > evidenceRank(row.evidence_status ?? "attributed"))
    .map((row) => row.id as string);
  if (ids.length === 0) return;
  const { error } = await sb.from("registry_wallet_claims").update({ evidence_status: newStatus }).in("id", ids);
  if (error) throw new Error(`upgradeWalletEvidenceStatus update: ${error.message}`);
}
