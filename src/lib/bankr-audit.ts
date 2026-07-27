// P1 — Bankr agent data-quality audit.
//
// Pure derivation over the P0-enriched Agent objects from getRegistryAgents()
// plus one defensive read of registry_manifest_submissions. No writes, no
// side effects — safe to run at any frequency. The admin route
// /api/admin/registry/data-audit serves this; scripts/bankr-data-audit.sh
// archives dated report artifacts.
//
// Known spec deltas (documented, not hidden):
// - No `bio` column exists on registry_agents; `bio_present` is an
//   admin_notes-presence proxy.
// - `complete_metadata` here is STRICTER than the stored metadata_status tag:
//   it also requires token_address. Both are reported per agent.

import { getRegistryAgents } from "./registry-db";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "./supabase-admin";
import { FOCUS_ECOSYSTEM } from "./focus";
import type {
  Agent,
  BooksStatus,
  DataStatus,
  MetadataStatus,
  ProfileStatus,
  WalletStatus,
} from "@/app/registry/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ManifestStatus = "validated" | "invalid" | "pending" | "not_submitted";

export type BankrAgentAuditRow = {
  name: string;
  slug: string;
  bio_present: boolean; // proxy: admin_notes non-empty (no bio column exists)
  x_handle: string | null;
  website: string | null;
  token_ticker: string | null; // null when missing OR the "—" placeholder
  token_address: string | null;
  bankr_profile: string | null;
  known_wallets: number;
  manifest_wallet_count: number; // wallets with evidenceSource === "manifest"
  eligible_wallet_count: number; // wallets with booksEligible === true
  wallet_sources: string[]; // distinct evidenceSource values present
  manifest_status: ManifestStatus;
  books_eligible: boolean; // ≥1 books-eligible wallet
  wallet_status: WalletStatus;
  profile_status: ProfileStatus;
  books_status: BooksStatus;
  data_status: DataStatus;
  metadata_complete_strict: boolean;
  metadata_status_db: MetadataStatus | null; // stored P0 tag, for comparison
  needs_review: boolean;
  is_duplicate: boolean;
  duplicate_reasons: string[]; // subset of ["token_address","x_handle","wallet_address"]
  // CRM fields for the admin queue (P6) — this audit is admin-only, never public.
  outreach_status: string | null;
  bankr_priority: string | null;
};

export type DuplicateGroup = {
  type: "token_address" | "x_handle" | "wallet_address";
  value: string;
  agent_slugs: string[]; // every colliding agent, including non-BANKR partners
  cross_ecosystem: boolean;
};

export type BankrDataAuditCounts = {
  // The 13 spec counts:
  total_bankr_agents_indexed: number;
  complete_metadata: number;
  missing_x: number;
  missing_website: number;
  missing_ticker: number;
  missing_token_address: number;
  wallets_declared: number;
  wallets_verified: number;
  live_books: number;
  stale_books: number;
  no_books: number;
  needs_review: number;
  duplicates: number;
  // Non-spec extras so the five books buckets always sum to the total:
  books_pending: number;
  books_error: number;
};

export type BankrDataAudit = {
  generated_at: string;
  ecosystem: typeof FOCUS_ECOSYSTEM;
  from_supabase: boolean;
  manifest_lookup_ok: boolean; // false = submissions query failed; statuses degrade to not_submitted
  counts: BankrDataAuditCounts;
  agents: BankrAgentAuditRow[];
  duplicate_groups: DuplicateGroup[];
  action_buckets: {
    needs_metadata_cleanup: string[]; // !metadata_complete_strict
    needs_manifest: string[]; // not_submitted with known wallets
    books_ready: string[]; // books already generated (live or stale)
    usable: string[]; // strict metadata + ≥1 eligible wallet — books can generate now
    // P6 queue views:
    ready_for_outreach: string[]; // complete metadata, no manifest, not yet contacted — DM targets
    ready_to_verify: string[]; // manifest wallets on file, awaiting verification — Dan's approval queue
  };
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

// rowToAgent() maps a null DB symbol to the display placeholder "—";
// treat it as missing here or null tickers are silently undercounted.
const TICKER_PLACEHOLDER = "—";

export function isMissingTicker(agent: Agent): boolean {
  return !agent.symbol || agent.symbol === TICKER_PLACEHOLDER;
}

export function isMetadataCompleteStrict(agent: Agent): boolean {
  return Boolean(agent.xHandle && agent.website && !isMissingTicker(agent) && agent.tokenAddress);
}

function normalizeXHandle(handle: string): string {
  return handle.toLowerCase().replace(/^@/, "").trim();
}

export function buildDuplicateGroups(allAgents: Agent[]): DuplicateGroup[] {
  const byToken = new Map<string, Agent[]>();
  const byHandle = new Map<string, Agent[]>();
  const byWallet = new Map<string, Agent[]>();

  for (const a of allAgents) {
    if (a.tokenAddress) {
      const key = a.tokenAddress.toLowerCase();
      byToken.set(key, [...(byToken.get(key) ?? []), a]);
    }
    if (a.xHandle && normalizeXHandle(a.xHandle)) {
      const key = normalizeXHandle(a.xHandle);
      byHandle.set(key, [...(byHandle.get(key) ?? []), a]);
    }
    const seenAddresses = new Set<string>();
    for (const w of a.wallets) {
      const key = w.address.toLowerCase();
      if (seenAddresses.has(key)) continue; // same wallet twice on one agent isn't a cross-agent duplicate
      seenAddresses.add(key);
      byWallet.set(key, [...(byWallet.get(key) ?? []), a]);
    }
  }

  const groups: DuplicateGroup[] = [];
  const emit = (type: DuplicateGroup["type"], map: Map<string, Agent[]>) => {
    for (const [value, agents] of map) {
      if (agents.length < 2) continue;
      groups.push({
        type,
        value,
        agent_slugs: agents.map((a) => a.slug),
        cross_ecosystem: new Set(agents.map((a) => a.ecosystem)).size > 1,
      });
    }
  };
  emit("token_address", byToken);
  emit("x_handle", byHandle);
  emit("wallet_address", byWallet);
  return groups;
}

export function buildAuditRow(
  agent: Agent,
  manifestStatusBySlug: Record<string, ManifestStatus>,
  duplicateReasonsBySlug: Record<string, string[]>,
): BankrAgentAuditRow {
  const manifestWallets = agent.wallets.filter(
    (w) => (w.evidenceSource ?? "").toLowerCase() === "manifest",
  );
  const eligibleWallets = agent.wallets.filter((w) => w.booksEligible);
  const duplicateReasons = duplicateReasonsBySlug[agent.slug] ?? [];

  return {
    name: agent.name,
    slug: agent.slug,
    bio_present: Boolean(agent.adminNotes?.trim()),
    x_handle: agent.xHandle || null,
    website: agent.website,
    token_ticker: isMissingTicker(agent) ? null : agent.symbol,
    token_address: agent.tokenAddress,
    bankr_profile: agent.bankrProfile,
    known_wallets: agent.wallets.length,
    manifest_wallet_count: manifestWallets.length,
    eligible_wallet_count: eligibleWallets.length,
    wallet_sources: [...new Set(agent.wallets.map((w) => w.evidenceSource ?? "unknown"))],
    manifest_status: manifestStatusBySlug[agent.slug] ?? "not_submitted",
    books_eligible: eligibleWallets.length > 0,
    wallet_status: agent.walletStatus,
    profile_status: agent.profileStatus,
    books_status: agent.booksStatus,
    data_status: agent.dataStatus,
    metadata_complete_strict: isMetadataCompleteStrict(agent),
    metadata_status_db: agent.metadataStatus,
    needs_review: agent.metadataStatus === "needs_review",
    is_duplicate: duplicateReasons.length > 0,
    duplicate_reasons: duplicateReasons,
    outreach_status: agent.outreachStatus,
    bankr_priority: agent.bankrPriority,
  };
}

export function buildCounts(rows: BankrAgentAuditRow[]): BankrDataAuditCounts {
  const count = (pred: (r: BankrAgentAuditRow) => boolean) => rows.filter(pred).length;
  return {
    total_bankr_agents_indexed: rows.length,
    complete_metadata: count((r) => r.metadata_complete_strict),
    missing_x: count((r) => !r.x_handle),
    missing_website: count((r) => !r.website),
    missing_ticker: count((r) => !r.token_ticker),
    missing_token_address: count((r) => !r.token_address),
    wallets_declared: count((r) => r.wallet_status === "declared" || r.wallet_status === "verified"),
    wallets_verified: count((r) => r.wallet_status === "verified"),
    live_books: count((r) => r.books_status === "live"),
    stale_books: count((r) => r.books_status === "stale"),
    no_books: count((r) => r.books_status === "no_books"),
    needs_review: count((r) => r.needs_review),
    duplicates: count((r) => r.is_duplicate),
    books_pending: count((r) => r.books_status === "pending"),
    books_error: count((r) => r.books_status === "error"),
  };
}

export function buildActionBuckets(rows: BankrAgentAuditRow[]): BankrDataAudit["action_buckets"] {
  return {
    needs_metadata_cleanup: rows.filter((r) => !r.metadata_complete_strict).map((r) => r.slug),
    needs_manifest: rows
      .filter((r) => r.manifest_status === "not_submitted" && r.known_wallets > 0 && r.manifest_wallet_count === 0)
      .map((r) => r.slug),
    books_ready: rows
      .filter((r) => r.books_status === "live" || r.books_status === "stale")
      .map((r) => r.slug),
    usable: rows
      .filter((r) => r.metadata_complete_strict && r.eligible_wallet_count > 0)
      .map((r) => r.slug),
    // Growth's DM list: profile is presentable (metadata complete) but has no
    // manifest yet, and nobody has reached out.
    ready_for_outreach: rows
      .filter(
        (r) =>
          r.metadata_complete_strict &&
          r.manifest_status === "not_submitted" &&
          r.manifest_wallet_count === 0 &&
          (r.outreach_status === null || r.outreach_status === "not_contacted"),
      )
      .map((r) => r.slug),
    // Dan's approval queue: manifest wallets on file, verification not final.
    ready_to_verify: rows
      .filter((r) => r.manifest_wallet_count > 0 && r.profile_status === "needs_verification")
      .map((r) => r.slug),
  };
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

const VALID_SUBMISSION_STATUSES = new Set<ManifestStatus>(["validated", "invalid", "pending"]);

export async function buildBankrDataAudit(): Promise<BankrDataAudit> {
  const { agents, fromSupabase } = await getRegistryAgents();
  const bankrAgents = agents.filter((a) => a.ecosystem === FOCUS_ECOSYSTEM);

  // registry_manifest_submissions exists only as a hand-created prod table
  // (no tracked migration) — degrade gracefully if the query fails.
  const manifestStatusBySlug: Record<string, ManifestStatus> = {};
  let manifestLookupOk = true;
  if (hasSupabaseAdminEnv()) {
    try {
      const sb = getSupabaseAdminClient();
      const { data, error } = await sb
        .from("registry_manifest_submissions")
        .select("agent_slug, verification_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      for (const row of (data ?? []) as { agent_slug: string; verification_status: string }[]) {
        if (row.agent_slug in manifestStatusBySlug) continue; // rows are DESC — first wins (latest)
        const status = row.verification_status as ManifestStatus;
        manifestStatusBySlug[row.agent_slug] = VALID_SUBMISSION_STATUSES.has(status)
          ? status
          : "pending";
      }
    } catch (err) {
      console.error("[bankr-audit] manifest submissions lookup failed (non-fatal):", err);
      manifestLookupOk = false;
    }
  }

  // Duplicate groups span the FULL registry: a Bankr agent sharing a wallet
  // or handle with a non-Bankr agent is still a data-quality problem.
  const duplicateGroups = buildDuplicateGroups(agents);
  const duplicateReasonsBySlug: Record<string, string[]> = {};
  for (const g of duplicateGroups) {
    for (const slug of g.agent_slugs) {
      const reasons = duplicateReasonsBySlug[slug] ?? [];
      if (!reasons.includes(g.type)) reasons.push(g.type);
      duplicateReasonsBySlug[slug] = reasons;
    }
  }

  const rows = bankrAgents.map((a) =>
    buildAuditRow(a, manifestStatusBySlug, duplicateReasonsBySlug),
  );

  return {
    generated_at: new Date().toISOString(),
    ecosystem: FOCUS_ECOSYSTEM,
    from_supabase: fromSupabase,
    manifest_lookup_ok: manifestLookupOk,
    counts: buildCounts(rows),
    agents: rows,
    duplicate_groups: duplicateGroups,
    action_buckets: buildActionBuckets(rows),
  };
}
