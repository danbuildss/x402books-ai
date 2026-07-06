-- ============================================================
-- Migration: Baseline schema
-- Ensures all production tables exist with their current shape.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Safe to run against a database that already has these tables.
-- ============================================================

-- ── registry_agents ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registry_agents (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    text        NOT NULL UNIQUE,
  symbol                  text,
  ecosystem               text        NOT NULL DEFAULT 'Base',
  x_handle                text,
  website                 text,
  bankr_profile           text,
  token_address           text,
  verification_status     text        DEFAULT 'Candidate',
  financial_activity_score integer,
  treasury_health         text        DEFAULT 'Pending',
  partnership_fit_score   integer,
  outreach_status         text,
  last_checked            text,
  admin_notes             text,
  priority                integer     DEFAULT 50,
  pfp                     text,
  gitlawb_repo            text,
  evidence_sources        text[]      DEFAULT '{}',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ── registry_agent_wallets ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registry_agent_wallets (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name      text        NOT NULL REFERENCES registry_agents(name) ON DELETE CASCADE,
  address         text        NOT NULL,
  label           text        NOT NULL,
  notes           text,
  chain           text        NOT NULL DEFAULT 'base',
  role            text        NOT NULL DEFAULT 'unknown',
  confidence      text        NOT NULL DEFAULT 'declared',
  evidence_source text,
  address_type    text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (agent_name, address)
);

-- ── registry_pending_updates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registry_pending_updates (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  agent_name      text        NOT NULL,
  update_type     text        NOT NULL,
  proposed_data   jsonb       NOT NULL DEFAULT '{}',
  diff_summary    text,
  luca_notes      text,
  status          text        NOT NULL DEFAULT 'pending',
  reviewed_at     timestamptz,
  reviewer_notes  text
);

-- ── wallets (ledger layer) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  address         text        PRIMARY KEY,
  last_scanned_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id               bigserial   PRIMARY KEY,
  wallet_address   text        NOT NULL REFERENCES public.wallets(address) ON DELETE CASCADE,
  tx_hash          text        NOT NULL,
  timestamp        timestamptz NOT NULL,
  direction        text        NOT NULL CHECK (direction IN ('income', 'expense', 'internal')),
  counterparty     text        NOT NULL,
  amount_usdc      numeric     NOT NULL,
  category         text        NOT NULL DEFAULT 'unknown',
  confidence_score integer     NOT NULL DEFAULT 0,
  memo             text,
  is_likely_x402   boolean     NOT NULL DEFAULT false,
  risk_flag        text        NOT NULL DEFAULT 'none',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── reports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id             bigserial   PRIMARY KEY,
  wallet_address text        NOT NULL REFERENCES public.wallets(address) ON DELETE CASCADE,
  period         text        NOT NULL,
  title          text        NOT NULL,
  summary        jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── agent_books_cache ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_books_cache (
  agent_slug   text        NOT NULL,
  period       text        NOT NULL DEFAULT '30d',
  books_json   jsonb       NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_slug, period)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS transactions_wallet_timestamp_idx
  ON public.transactions(wallet_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS reports_wallet_created_idx
  ON public.reports(wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS registry_agent_wallets_agent_name_idx
  ON registry_agent_wallets(agent_name);

CREATE INDEX IF NOT EXISTS registry_agent_wallets_address_idx
  ON registry_agent_wallets(address);

CREATE INDEX IF NOT EXISTS agent_books_cache_slug_idx
  ON agent_books_cache(agent_slug, computed_at DESC);

CREATE INDEX IF NOT EXISTS registry_pending_updates_status_idx
  ON registry_pending_updates(status, created_at DESC);
