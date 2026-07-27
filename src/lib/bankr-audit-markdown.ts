// Markdown renderer for the Bankr data-quality audit.
// Pure string builder over the BankrDataAudit shape — no I/O.

import type { BankrDataAudit, BankrAgentAuditRow } from "./bankr-audit";

function flags(r: BankrAgentAuditRow): string {
  const out: string[] = [];
  if (r.needs_review) out.push("needs_review");
  if (r.is_duplicate) out.push(`duplicate(${r.duplicate_reasons.join("+")})`);
  return out.join(", ") || "—";
}

function check(v: unknown): string {
  return v ? "✓" : "✗";
}

export function renderBankrAuditMarkdown(audit: BankrDataAudit): string {
  const { counts: c } = audit;
  const date = audit.generated_at.slice(0, 10);
  const lines: string[] = [];

  lines.push(`# Bankr Agent Data Audit — ${date}`);
  lines.push("");
  lines.push(`Generated: ${audit.generated_at}`);
  lines.push(
    `Source: ${audit.from_supabase ? "Supabase (live)" : "static fallback (NOT live data)"} · ` +
      `Manifest lookup: ${audit.manifest_lookup_ok ? "ok" : "FAILED (statuses degraded to not_submitted)"}`,
  );
  lines.push("");
  lines.push("Note: no `bio` column exists in the registry — the Bio column below is an");
  lines.push("admin-notes-presence proxy. \"Complete metadata\" is the strict check");
  lines.push("(X + website + ticker + token address), stricter than the stored metadata_status tag.");
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|---|---|");
  lines.push(`| Total Bankr agents indexed | ${c.total_bankr_agents_indexed} |`);
  lines.push(`| Complete metadata (strict) | ${c.complete_metadata} |`);
  lines.push(`| Missing X handle | ${c.missing_x} |`);
  lines.push(`| Missing website | ${c.missing_website} |`);
  lines.push(`| Missing token ticker | ${c.missing_ticker} |`);
  lines.push(`| Missing token address | ${c.missing_token_address} |`);
  lines.push(`| Wallets declared | ${c.wallets_declared} |`);
  lines.push(`| Wallets verified | ${c.wallets_verified} |`);
  lines.push(`| Live books | ${c.live_books} |`);
  lines.push(`| Stale books | ${c.stale_books} |`);
  lines.push(`| No books | ${c.no_books} |`);
  lines.push(`| Books pending (extra, not in spec 13) | ${c.books_pending} |`);
  lines.push(`| Books error (extra, not in spec 13) | ${c.books_error} |`);
  lines.push(`| Needs review | ${c.needs_review} |`);
  lines.push(`| Duplicates | ${c.duplicates} |`);
  lines.push("");

  lines.push("## Duplicates");
  lines.push("");
  if (audit.duplicate_groups.length === 0) {
    lines.push("None detected.");
  } else {
    lines.push("| Type | Value | Agents |");
    lines.push("|---|---|---|");
    for (const g of audit.duplicate_groups) {
      const agents = g.agent_slugs.join(", ") + (g.cross_ecosystem ? " (cross-ecosystem)" : "");
      lines.push(`| ${g.type} | \`${g.value}\` | ${agents} |`);
    }
  }
  lines.push("");

  lines.push("## Action buckets");
  lines.push("");
  const buckets: [string, string[]][] = [
    ["Usable — books can generate now", audit.action_buckets.usable],
    ["Books ready (already generated)", audit.action_buckets.books_ready],
    ["Needs manifest", audit.action_buckets.needs_manifest],
    ["Needs metadata cleanup", audit.action_buckets.needs_metadata_cleanup],
    ["Ready for outreach (DM targets)", audit.action_buckets.ready_for_outreach],
    ["Ready to verify (approval queue)", audit.action_buckets.ready_to_verify],
  ];
  for (const [title, slugs] of buckets) {
    lines.push(`### ${title} (${slugs.length})`);
    lines.push("");
    lines.push(slugs.length ? slugs.join(", ") : "_none_");
    lines.push("");
  }

  lines.push("## Full per-agent detail");
  lines.push("");
  lines.push(
    "| Name | Slug | Bio | X | Website | Ticker | Token Addr | Bankr Profile | Wallets (manifest/eligible) | Manifest | Wallet | Books | Profile | Data | Flags |",
  );
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of audit.agents) {
    lines.push(
      `| ${r.name} | ${r.slug} | ${check(r.bio_present)} | ${r.x_handle ?? "✗"} | ` +
        `${check(r.website)} | ${r.token_ticker ?? "✗"} | ${check(r.token_address)} | ` +
        `${check(r.bankr_profile)} | ${r.known_wallets} (${r.manifest_wallet_count}/${r.eligible_wallet_count}) | ` +
        `${r.manifest_status} | ${r.wallet_status} | ${r.books_status} | ${r.profile_status} | ` +
        `${r.data_status} | ${flags(r)} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}
