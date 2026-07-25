-- ============================================================
-- Migration: promote archive tables to real migrations
--
-- Three tables previously lived only in supabase/archive/ and
-- were never guaranteed to exist in any environment:
--
--   agent_books_history   — 30d P&L snapshots per agent
--   agent_gdp_history     — aggregate ecosystem GDP snapshots
--   agent_economic_events — per-agent inference economics
--
-- Code in agent-books-history.ts, gdp-history.ts, and
-- agent-events.ts writes to these tables. Without this migration
-- those writes silently fail on any environment that never had
-- the archive scripts applied manually.
--
-- All statements are idempotent (IF NOT EXISTS). Safe to run
-- against a database where the tables already exist.
-- ============================================================

-- ── agent_books_history ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_books_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug      text        NOT NULL,
  revenue_usd     numeric     NOT NULL DEFAULT 0,
  expenses_usd    numeric     NOT NULL DEFAULT 0,
  net_income_usd  numeric     NOT NULL DEFAULT 0,
  treasury_usd    numeric,
  tx_count        integer     NOT NULL DEFAULT 0,
  wallet_count    integer     NOT NULL DEFAULT 0,
  snapshotted_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_books_history_slug_idx
  ON agent_books_history (agent_slug, snapshotted_at DESC);

-- ── agent_gdp_history ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_gdp_history (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  total_revenue_usd    numeric     NOT NULL,
  total_expenses_usd   numeric     NOT NULL,
  total_net_income_usd numeric     NOT NULL,
  attributed_agents    integer     NOT NULL,
  total_agents         integer     NOT NULL,
  snapshotted_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_gdp_history_snapshotted
  ON agent_gdp_history (snapshotted_at DESC);

-- ── agent_economic_events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_economic_events (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id       text        NOT NULL,
  agent_name     text,
  wallet_address text,
  event_type     text        NOT NULL CHECK (event_type IN (
                               'inference_purchase',
                               'inference_sale',
                               'provider_spend',
                               'fallback_provider_spend',
                               'api_cost',
                               'agent_revenue',
                               'wallet_inflow',
                               'wallet_outflow',
                               'unknown_agent_activity'
                             )),
  provider       text,
  amount         numeric,
  token          text        DEFAULT 'USDC',
  direction      text        CHECK (direction IN ('inflow', 'outflow', 'neutral')),
  tx_hash        text,
  metadata       jsonb,
  timestamp      timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aee_agent_ts
  ON agent_economic_events (agent_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_aee_event_type
  ON agent_economic_events (event_type);

CREATE INDEX IF NOT EXISTS idx_aee_wallet
  ON agent_economic_events (wallet_address);

-- ── Verification ──────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('agent_books_history','agent_gdp_history','agent_economic_events');
-- → must return 3 rows
