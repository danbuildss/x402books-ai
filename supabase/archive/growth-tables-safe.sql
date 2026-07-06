-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Growth OS tables (safe version — no FK to api_keys)
-- Run this if growth-schema.sql failed or tables are missing

CREATE TABLE IF NOT EXISTS growth_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  wallet      text,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date                  date        NOT NULL UNIQUE,
  wallet_scans          int         DEFAULT 0,
  reports_generated     int         DEFAULT 0,
  api_calls             int         DEFAULT 0,
  unique_wallets        int         DEFAULT 0,
  luca_interactions     int         DEFAULT 0,
  registry_submissions  int         DEFAULT 0,
  verified_agents       int         DEFAULT 0,
  failed_scans          int         DEFAULT 0,
  endpoint_calls        int         DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registry_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text        NOT NULL,
  agent_name      text,
  update_type     text,
  reviewer_notes  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_events_type_idx    ON growth_events (event_type);
CREATE INDEX IF NOT EXISTS growth_events_created_idx ON growth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS daily_metrics_date_idx    ON daily_metrics (date DESC);
CREATE INDEX IF NOT EXISTS registry_events_created_idx ON registry_events (created_at DESC);
