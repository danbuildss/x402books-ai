-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- inference_events: Surplus-facing raw inference economics table.
-- Any agent that uses Surplus (or any provider) logs events here via POST /api/inference/log.
-- Separate from agent_economic_events (broader financial ledger).
-- agent_id matches registry slug convention (e.g. "luca", "bankr", "virtuals-protocol").

CREATE TABLE IF NOT EXISTS inference_events (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id     text        NOT NULL,
  provider     text        NOT NULL,
  model        text,
  request_type text,
  cost_usd     numeric(12, 8),
  latency_ms   integer,
  status       text        NOT NULL DEFAULT 'success',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ie_agent_created  ON inference_events (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ie_provider        ON inference_events (provider);
CREATE INDEX IF NOT EXISTS idx_ie_agent_provider  ON inference_events (agent_id, provider);
CREATE INDEX IF NOT EXISTS idx_ie_status          ON inference_events (status);
