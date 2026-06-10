# Migration Ledger

SQL in this directory is applied manually via the Supabase SQL editor.
**Every new .sql file gets a row here. Update the status when you run it.**

Status legend: ✅ applied · ⏳ pending · ❓ unconfirmed

Confirmed 2026-06-10 against `information_schema.tables` (26 tables in public schema).

| File | Status | Evidence |
|---|---|---|
| `registry-schema.sql` | ✅ 2026-06-10 | `registry_agents`, `registry_pending_updates` exist |
| `registry-claims.sql` | ✅ 2026-06-10 | `registry_claims` exists |
| `registry-import-candidates.sql` | ✅ 2026-06-10 | `registry_import_candidates` exists |
| `agent-economic-events.sql` | ✅ 2026-06-10 | `agent_economic_events` exists |
| `inference-events.sql` | ✅ 2026-06-10 | `inference_events` exists |
| `tool-decision-events.sql` | ✅ 2026-06-10 | `tool_decision_events` exists |
| `tool-decision-events-v2.sql` | ✅ 2026-06-10 | column-level migration; `project_id` in active use by Nipmod events |
| `luca-subagent-tables.sql` | ✅ 2026-06-10 | `luca_subagent_runs`, `luca_pending_replies` exist |
| `comm-identities-migration.sql` | ✅ 2026-06-10 | `registry_agent_comm_identities` exists |
| `agent-submissions.sql` | ✅ 2026-06-10 | `agent_submissions` exists |
| `access-codes.sql` | ✅ 2026-06-10 | `access_codes`, `access_code_redemptions` exist |
| `waitlist.sql` | ✅ 2026-06-10 | `waitlist_signups` exists |
| `stage-1-ledger.sql` | ✅ 2026-06-10 | `users`, `wallets`, `transactions`, `reports` exist (legacy scanner era) |
| `growth-schema.sql` / `growth-tables-safe.sql` | ✅ 2026-06-10 | `growth_events`, `daily_metrics`, `luca_events` exist (one of the two variants ran) |
| `luca-verdicts-batch.sql` | ❓ data-only | One-off UPDATE batch — no table to check; verdicts are visibly live on profiles |
| `wallet-metadata-migration.sql` | ✅ 2026-06-10 | `chain`, `role`, `confidence`, `evidence_source` confirmed via column check |
| `api-keys-ownership.sql` | ⏳ **PENDING — run before deploying session-bound keys** | Adds `owner_code_id`, `link_nonce`, `link_nonce_expires_at` to api_keys; also captures api_keys/api_usage schema in repo |
| `trust-score-history.sql` | ⏳ **PENDING — run, then schedule the snapshot cron** | Daily trust score snapshots (powers Most Improved on /trust). After running, schedule `GET /api/cron/snapshot-trust-scores` daily with the internal bearer |

## Confirm wallet-metadata columns

The table list can't show columns. Run:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'registry_agent_wallets';
```

Expect to see `chain`, `role`, `confidence`, `evidence_source`. If present, flip the row above to ✅.

## Tables with NO source file in this repo (schema drift)

These exist in prod but their CREATE statements live nowhere in version control —
presumably created via the dashboard. Worth exporting their definitions into this
directory at some point:

- `api_keys`, `api_usage`, `api_events` (the developer key system!)
- `registry_events`
- The `increment_api_key_usage` RPC function

## How to confirm rows

Supabase dashboard → SQL editor → `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
Flip rows to ✅ with the date.
