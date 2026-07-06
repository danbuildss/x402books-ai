-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- registry_import_candidates: staging table for Bankr tokens from Dune
-- not yet matched to a registry agent. Reviewed manually before promoting.

CREATE TABLE IF NOT EXISTS registry_import_candidates (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ca            text        NOT NULL UNIQUE,
  ticker        text,
  name          text,
  source        text,
  dune_data     jsonb,
  status        text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes   text,
  created_at    timestamptz DEFAULT now(),
  reviewed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_candidates_status ON registry_import_candidates (status);

-- Add market data columns to registry_agents for Dune enrichment
ALTER TABLE registry_agents ADD COLUMN IF NOT EXISTS market_data    jsonb;
ALTER TABLE registry_agents ADD COLUMN IF NOT EXISTS last_dune_sync timestamptz;
