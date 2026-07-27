// GET /api/cron/index-observed-truth — index on-chain transactions for all books-eligible wallets.
//
// Called by Hermes (external scheduler) via Authorization: Bearer header.
// Also callable manually from luca-admin or curl for testing.
//
// For each books-eligible wallet declared in the registry:
//   1. Fetches recent transactions (Alchemy primary, Etherscan fallback)
//   2. Classifies each transaction conservatively (unknown beats overclaim)
//   3. Upserts classified events (idempotent — safe to re-run)
//   4. Upgrades wallet evidence status only if strong signals are present
//
// Evidence upgrade thresholds (conservative by design):
//   observed  — any meaningful classified event (not unknown/token_distribution only)
//   verified  — settlement_revenue from registry wallet OR ≥3 distinct fee_received senders
//
// Sends a Telegram summary to LUCA_ADMIN_CHAT_ID after each run.
// Processes wallets sequentially to respect provider rate limits.

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // Vercel Pro — allow up to 5 min for sequential wallet indexing
import { internalAuth } from "@/lib/internal-auth";
import { fetchWalletTransactions } from "@/lib/truth-engine/chain-fetcher";
import { classifyTransaction, computeEvidenceUpgrade } from "@/lib/truth-engine/revenue-classifier";
import {
  getBooksEligibleWallets,
  getAllRegistryWalletAddresses,
  getWalletClaims,
  insertRevenueClassificationEvent,
  insertEvidencePacket,
  upgradeWalletEvidenceStatus,
} from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import type { EvidencePacket } from "@/lib/truth-engine/evidence";
import type { ClassifiedEvent } from "@/lib/truth-engine/revenue-classifier";

const TX_LIMIT_PER_WALLET = 100;
const MAX_WALLETS_PER_RUN = 10;
const VALID_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"];

async function notifyTelegram(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.LUCA_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  }

  const started = Date.now();

  // ── Load eligible wallets + full registry for counterparty lookup ─────────────
  let eligibleWallets: { agent_slug: string; address: string; chain: string }[];
  let registryWallets: Set<string>;

  try {
    const [eligible, allAddresses] = await Promise.all([
      getBooksEligibleWallets(),
      getAllRegistryWalletAddresses(),
    ]);
    eligibleWallets = eligible as { agent_slug: string; address: string; chain: string }[];
    registryWallets = new Set(allAddresses.map((a) => a.toLowerCase()));
  } catch (e) {
    const msg = `DB read failed: ${String(e)}`;
    await notifyTelegram(`❌ <b>Observed Truth Index</b> — failed to start\n${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const batch = eligibleWallets.slice(0, MAX_WALLETS_PER_RUN);

  let indexed        = 0;
  let skipped        = 0;
  let evidenceUpgrades = 0;
  let insertErrors   = 0;
  let totalEvents    = 0;
  const errorLines:  string[] = [];

  // Cache own-wallets per agent across the batch
  const agentOwnWallets = new Map<string, Set<string>>();

  async function getOwnWallets(agentSlug: string): Promise<Set<string>> {
    if (agentOwnWallets.has(agentSlug)) return agentOwnWallets.get(agentSlug)!;
    try {
      const claims = await getWalletClaims(agentSlug);
      const s = new Set(claims.map((w) => (w.address as string).toLowerCase()));
      agentOwnWallets.set(agentSlug, s);
      return s;
    } catch { return new Set(); }
  }

  // ── Process wallets sequentially ──────────────────────────────────────────────
  for (const wallet of batch) {
    const addr  = wallet.address.toLowerCase();
    const chain = wallet.chain;

    if (!VALID_CHAINS.includes(chain)) { skipped++; continue; }

    const fetchResult = await fetchWalletTransactions({
      address: addr,
      chain:   chain as "base" | "ethereum" | "arbitrum" | "optimism" | "polygon",
      limit:   TX_LIMIT_PER_WALLET,
    });

    if (fetchResult.provider === "none") { skipped++; continue; }

    const ownWallets = await getOwnWallets(wallet.agent_slug);
    const classified: ClassifiedEvent[] = fetchResult.transactions.map((tx) =>
      classifyTransaction(tx, ownWallets, registryWallets),
    );

    totalEvents += classified.length;

    for (const event of classified) {
      try {
        await insertRevenueClassificationEvent(wallet.agent_slug, event);
      } catch (e) {
        insertErrors++;
        if (insertErrors <= 3) errorLines.push(`insert ${wallet.agent_slug}/${addr.slice(0,8)}: ${String(e)}`);
      }
    }

    // Evidence upgrade — only if signals are strong enough
    try {
      const claims = await getWalletClaims(wallet.agent_slug);
      const claim  = claims.find(
        (w) => (w.address as string).toLowerCase() === addr && w.chain === chain,
      );
      const currentStatus = (claim?.evidence_status as string) ?? "attributed";
      const upgrade = computeEvidenceUpgrade(currentStatus, classified, registryWallets);

      if (upgrade) {
        await upgradeWalletEvidenceStatus(wallet.agent_slug, addr, chain, upgrade);
        evidenceUpgrades++;

        const packet: EvidencePacket = {
          subject_type:     "wallet",
          subject_slug:     `${wallet.agent_slug}:${addr}`,
          claim:            `evidence_status:${upgrade}`,
          status:           upgrade,
          confidence:       upgrade === "verified" ? "high" : "medium",
          evidence_summary: `Cron index on ${chain}: ${classified.length} events; status → ${upgrade}`,
          evidence_payload: {
            address: addr, chain,
            txs_fetched: fetchResult.transactions.length,
            events_classified: classified.length,
            provider: fetchResult.provider,
          },
          source_type: "on_chain",
          source_ref:  `${chain}:${addr}`,
        };
        await insertEvidencePacket(packet);
      }
    } catch { /* non-fatal */ }

    indexed++;
  }

  const durationMs  = Date.now() - started;
  const timestamp   = new Date().toISOString();
  const truncated   = eligibleWallets.length > MAX_WALLETS_PER_RUN;
  const hasProblems = insertErrors > 0 || skipped > 0;
  const icon        = hasProblems ? "⚠️" : "✅";

  const lines = [
    `${icon} <b>Observed Truth Index</b> · ${new Date(timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}`,
    ``,
    `• Wallets eligible: <b>${eligibleWallets.length}</b>  Indexed: <b>${indexed}</b>  Skipped: <b>${skipped}</b>`,
    `• Events classified: <b>${totalEvents}</b>  Evidence upgrades: <b>${evidenceUpgrades}</b>`,
    `• Duration: <b>${(durationMs / 1000).toFixed(1)}s</b>`,
  ];

  if (truncated) {
    lines.push(`• ⚠ Truncated at ${MAX_WALLETS_PER_RUN} wallets — ${eligibleWallets.length - MAX_WALLETS_PER_RUN} remaining`);
  }
  if (insertErrors > 0) {
    lines.push(`• Insert errors: <b>${insertErrors}</b>`);
    for (const e of errorLines) lines.push(`  └ ${e}`);
  }

  await notifyTelegram(lines.join("\n"));

  return NextResponse.json({
    ok: true,
    wallets_eligible: eligibleWallets.length,
    wallets_indexed:  indexed,
    wallets_skipped:  skipped,
    events_classified: totalEvents,
    evidence_upgrades: evidenceUpgrades,
    insert_errors:    insertErrors,
    truncated,
    duration_ms:      durationMs,
    timestamp,
  });
}
