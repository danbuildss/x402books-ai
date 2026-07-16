# bankr-data-audit

**Luca Skills by Zetta** — Callable financial intelligence for the agent economy.

## What it does

Generates the Bankr agent data-quality audit: per-agent field checks (name, slug, bio proxy, X handle, website, ticker, token address, Bankr profile, wallets, wallet sources, manifest status, books eligibility, profile status, data freshness) plus aggregate counts and action buckets (usable / books ready / needs manifest / needs metadata cleanup) and duplicate detection (shared token address, X handle, or wallet address — including cross-ecosystem collisions).

This is a **read-only admin skill** — no writes, no side effects. Safe to call at any frequency. It is called by Hermes on a weekly schedule and can be triggered manually at any time. Artifact archiving (dated report files) is done by `scripts/bankr-data-audit.sh`, not by the endpoint.

## Endpoint

```
GET https://www.zettaai.co/api/admin/registry/data-audit
GET https://www.zettaai.co/api/admin/registry/data-audit?format=md
```

## Auth

```
Authorization: Bearer <ZETTA_INTERNAL_SECRET>
```

This is an internal secret shared between Hermes and Zetta. It is **not** a public API key. Never log it or include it in responses.

## Input

No request body. Optional query param:

| Param | Values | Default | Meaning |
|-------|--------|---------|---------|
| `format` | `json`, `md` | `json` | `md` returns a readable markdown report |

## Output (json)

```json
{
  "ok": true,
  "generated_at": "2026-07-20T06:00:03.000Z",
  "ecosystem": "BANKR",
  "from_supabase": true,
  "manifest_lookup_ok": true,
  "counts": {
    "total_bankr_agents_indexed": 57,
    "complete_metadata": 30,
    "missing_x": 2,
    "missing_website": 20,
    "missing_ticker": 5,
    "missing_token_address": 18,
    "wallets_declared": 22,
    "wallets_verified": 6,
    "live_books": 14,
    "stale_books": 3,
    "no_books": 38,
    "needs_review": 1,
    "duplicates": 2,
    "books_pending": 2,
    "books_error": 0
  },
  "agents": [ { "name": "...", "slug": "...", "...": "one row per Bankr agent" } ],
  "duplicate_groups": [ { "type": "token_address", "value": "0x...", "agent_slugs": ["a", "b"], "cross_ecosystem": false } ],
  "action_buckets": {
    "usable": ["..."],
    "books_ready": ["..."],
    "needs_manifest": ["..."],
    "needs_metadata_cleanup": ["..."]
  }
}
```

Invariant: `live_books + stale_books + no_books + books_pending + books_error === total_bankr_agents_indexed`.

## Honesty notes

- `manifest_lookup_ok: false` means the `registry_manifest_submissions` query failed — per-agent `manifest_status` degrades to `not_submitted` rather than the run failing. Treat those statuses as unknown, not authoritative.
- `from_supabase: false` means the registry served the static fallback — numbers are NOT live; re-run before acting on them.
- No `bio` column exists in the registry; `bio_present` is an admin-notes-presence proxy.
- `complete_metadata` is the strict check (X + website + ticker + token address) — stricter than the stored `metadata_status` tag, which ignores token address. Both appear per agent.

## Example

```bash
curl -s https://www.zettaai.co/api/admin/registry/data-audit \
  -H "Authorization: Bearer ${ZETTA_INTERNAL_SECRET}" | jq '.counts'
```

To archive dated artifacts (markdown + json under `reports/`):

```bash
ZETTA_INTERNAL_SECRET=... bash scripts/bankr-data-audit.sh
```

## Hermes schedule

```
# Every Monday at 06:00 UTC — after Sunday's index-observed-truth (02:00 UTC)
# so books/evidence state is fresh when the audit runs
0 6 * * 1  bankr-data-audit
```

After each run, Hermes should log the result back to Zetta:

```bash
POST https://www.zettaai.co/api/admin/subagent-runs
Authorization: Bearer <ZETTA_INTERNAL_SECRET>

{
  "subagent_name": "bankr-data-audit",
  "status": "success",
  "started_at": "<ISO timestamp>",
  "finished_at": "<ISO timestamp>",
  "duration_ms": 1200,
  "summary": "57 Bankr agents audited. 30 complete metadata, 22 wallets declared, 14 live books, 2 duplicates.",
  "triggered_by": "hermes"
}
```

## Limitations

- Counts only agents with `ecosystem = 'BANKR'`; duplicate groups span the full registry so cross-ecosystem collisions surface, but only Bankr agents are counted in `counts.duplicates`.
- `books_status` freshness is relative to the 4-hour books cache TTL — an audit run long after the last `refresh-books` cron will naturally show more `stale_books`.
- The endpoint does not persist anything; historical comparison relies on the archived `reports/bankr-audit-<date>.{md,json}` files.
