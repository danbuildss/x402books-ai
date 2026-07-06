# Supabase — Schema & Migrations

## Overview

All schema changes live in `supabase/migrations/` as numbered SQL files.
The `supabase/archive/` directory contains the old ad-hoc SQL files — they
are kept for reference only and must never be applied to any database.

## Setup (first time)

1. Install the Supabase CLI: `brew install supabase/tap/supabase`
2. Log in: `npx supabase login`
3. Link to the project: `npx supabase link --project-ref <your-project-ref>`
   (Find your project ref in the Supabase dashboard URL)

## Apply migrations to production

```bash
npx supabase db push
```

This applies any migration files not yet recorded in the `supabase_migrations`
history table on the remote project.

## Run migrations locally (staging)

```bash
npx supabase start        # starts local Postgres + Studio
npx supabase db reset     # applies all migrations from scratch
```

## Create a new migration

```bash
npx supabase migration new <description>
# e.g. npx supabase migration new add_agent_tier_column
```

This creates a new file in `supabase/migrations/` with a UTC timestamp prefix.
Write your DDL in that file, then push.

**Rules:**
- Every schema change must go through a migration file — never the SQL editor
- Migration files are append-only — never edit an already-applied migration
- All DDL must be idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.)
- Test against a local or staging database before pushing to production

## Migration history

| File | What it does |
|------|-------------|
| `20260706000000_baseline_schema.sql` | Creates all core tables (idempotent) |
| `20260706000001_add_slug_and_address_type.sql` | Adds `slug` to `registry_agents`, backfills from `name`, adds `updated_at` trigger |
| `20260706000002_books_eligible_trigger.sql` | Adds `books_eligible` computed column + trigger to `registry_agent_wallets` |
| `20260706000003_rls_policies.sql` | Enables RLS on all core tables with public read / service-role write policies |
| `20260706000004_fix_transactions_unique.sql` | Replaces the 4-column unique constraint on `transactions` with `(wallet_address, tx_hash)` |

## Invariants — never violate these

These rules are enforced at the database level. Application code must not
attempt to bypass them.

1. **No manifest = no books.**
   A wallet with `evidence_source != 'manifest'` will always have
   `books_eligible = false`, regardless of other fields. The trigger
   in migration 002 enforces this.

2. **Token contracts are never books-eligible.**
   Wallets where `address_type = 'token_contract'` OR `role IN ('token_contract', 'token')`
   will always have `books_eligible = false`. Same trigger.

3. **ERC-8004 is identity, not financial attribution.**
   A wallets.json manifest declares financial identity. It does not
   constitute financial evidence. Verification (`evidence_status = 'verified'`)
   requires on-chain confirmation.

4. **Slug is immutable once set.**
   The `slug` column on `registry_agents` is the stable URL key for
   profile pages. Never UPDATE it after creation — it breaks all external
   links and bookmarks.

5. **Never write directly to `agent_books_cache`.**
   This table is populated exclusively by `buildAgentBooks()` and the
   4-hour cron job. Manual writes will be overwritten and may introduce
   stale or incorrect financial data.

## Secrets

`SUPABASE_SERVICE_ROLE_KEY` lives on Vercel environment variables and in
your local `.env.local`. It is never committed to git.

The anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is safe for browser use —
RLS policies limit it to public SELECT only.
