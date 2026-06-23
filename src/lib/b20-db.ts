import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import type { B20TokenIdentity, B20AgentLink, B20ActivityEvent, B20ActivitySummary } from "@/lib/b20-client";

export type B20TokenRow = {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  total_supply: string | null;
  issuer_wallet: string | null;
  owner_wallet: string | null;
  deployment_tx: string | null;
  deployed_block: number | null;
  chain: string;
  deployed_at: string | null;
  metadata_uri: string | null;
  linked_agent_name: string | null;
  link_method: string;
  link_confidence: string | null;
  manifest_status: string;
  luca_summary: string | null;
  last_indexed_at: string;
  created_at: string;
};

export type B20Stats = {
  total: number;
  linked: number;
  attributed: number;
  awaiting_manifest: number;
  unlinked: number;
};

function noSupabase() {
  return !hasSupabaseAdminEnv();
}

export async function upsertB20Token(
  token: B20TokenIdentity,
  link: B20AgentLink,
  manifestStatus: "attributed" | "candidate" | "none",
  lucaSummary: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (noSupabase()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();

  const row = {
    address:           token.address,
    name:              token.name,
    symbol:            token.symbol,
    decimals:          token.decimals,
    total_supply:      token.totalSupply,
    issuer_wallet:     token.issuerWallet,
    owner_wallet:      token.ownerWallet,
    deployment_tx:     token.deploymentTx,
    deployed_block:    token.deployedBlock,
    chain:             token.chain,
    metadata_uri:      token.metadataUri,
    linked_agent_name: link.agentName,
    link_method:       link.method,
    link_confidence:   link.confidence,
    manifest_status:   manifestStatus,
    luca_summary:      lucaSummary,
    last_indexed_at:   new Date().toISOString(),
  };

  const { error } = await sb.from("b20_tokens").upsert(row, { onConflict: "address" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateB20AgentLink(
  address: string,
  link: B20AgentLink,
  manifestStatus: "attributed" | "candidate" | "none",
): Promise<{ ok: boolean; error?: string }> {
  if (noSupabase()) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("b20_tokens")
    .update({
      linked_agent_name: link.agentName,
      link_method:       link.method,
      link_confidence:   link.confidence,
      manifest_status:   manifestStatus,
      last_indexed_at:   new Date().toISOString(),
    })
    .eq("address", address.toLowerCase());
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertB20ActivityBatch(
  tokenAddress: string,
  events: B20ActivityEvent[],
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (noSupabase() || events.length === 0) return { ok: true, inserted: 0 };
  const sb = getSupabaseAdminClient();

  const rows = events.map((e, i) => ({
    token_address:   tokenAddress.toLowerCase(),
    event_type:      e.eventType,
    tx_hash:         e.txHash,
    block_number:    e.blockNumber,
    from_address:    e.from,
    to_address:      e.to,
    amount_raw:      e.amountRaw,
    log_index:       i,
    block_timestamp: e.timestamp,
  }));

  const { error } = await sb
    .from("b20_activity")
    .upsert(rows, { onConflict: "tx_hash,log_index", ignoreDuplicates: true });

  if (error) return { ok: false, inserted: 0, error: error.message };
  return { ok: true, inserted: rows.length };
}

export async function getB20Tokens(): Promise<B20TokenRow[]> {
  if (noSupabase()) return [];
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("b20_tokens")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as B20TokenRow[];
}

export async function getB20Token(address: string): Promise<B20TokenRow | null> {
  if (noSupabase()) return null;
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("b20_tokens")
    .select("*")
    .eq("address", address.toLowerCase())
    .single();
  if (error || !data) return null;
  return data as B20TokenRow;
}

export async function getB20Activity(
  tokenAddress: string,
  limit = 20,
): Promise<B20ActivityEvent[]> {
  if (noSupabase()) return [];
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("b20_activity")
    .select("*")
    .eq("token_address", tokenAddress.toLowerCase())
    .order("block_timestamp", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Array<{
    event_type: string; tx_hash: string; block_number: number;
    from_address: string; to_address: string; amount_raw: string; block_timestamp: string | null;
  }>).map((r) => ({
    eventType: r.event_type as "mint" | "burn",
    txHash: r.tx_hash,
    blockNumber: r.block_number,
    from: r.from_address,
    to: r.to_address,
    amountRaw: r.amount_raw,
    timestamp: r.block_timestamp,
  }));
}

export async function getB20Stats(): Promise<B20Stats> {
  if (noSupabase()) return { total: 0, linked: 0, attributed: 0, awaiting_manifest: 0, unlinked: 0 };
  const sb = getSupabaseAdminClient();

  const { data, error } = await sb.from("b20_tokens").select("manifest_status, linked_agent_name");
  if (error || !data) return { total: 0, linked: 0, attributed: 0, awaiting_manifest: 0, unlinked: 0 };

  const rows = data as Array<{ manifest_status: string; linked_agent_name: string | null }>;
  const total = rows.length;
  const linked = rows.filter((r) => r.linked_agent_name !== null).length;
  const attributed = rows.filter((r) => r.manifest_status === "attributed").length;
  const awaiting_manifest = rows.filter(
    (r) => r.linked_agent_name !== null && r.manifest_status !== "attributed",
  ).length;
  const unlinked = rows.filter((r) => r.linked_agent_name === null).length;

  return { total, linked, attributed, awaiting_manifest, unlinked };
}

export function buildActivitySummaryFromDb(
  tokenAddress: string,
  events: B20ActivityEvent[],
): B20ActivitySummary {
  const mints = events.filter((e) => e.eventType === "mint");
  const burns = events.filter((e) => e.eventType === "burn");

  function sumRaw(items: B20ActivityEvent[]): string {
    let total = BigInt(0);
    for (const e of items) {
      try { total += BigInt(e.amountRaw || "0"); } catch { /* skip */ }
    }
    return total.toString();
  }

  const timestamps = events.map((e) => e.timestamp).filter(Boolean) as string[];
  return {
    tokenAddress: tokenAddress.toLowerCase(),
    mintCount: mints.length,
    burnCount: burns.length,
    mintVolumeRaw: sumRaw(mints),
    burnVolumeRaw: sumRaw(burns),
    recentMints: mints.slice(0, 10),
    recentBurns: burns.slice(0, 10),
    lastActivityAt: timestamps.length > 0 ? timestamps.sort().reverse()[0] : null,
  };
}
