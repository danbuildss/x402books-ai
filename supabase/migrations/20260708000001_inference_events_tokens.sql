-- Create inference_events table (moved from archive into migrations).
-- All statements idempotent — safe to run against prod where the table was applied manually.

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

-- Token counts and cost transparency fields
ALTER TABLE inference_events
  ADD COLUMN IF NOT EXISTS input_tokens        integer,
  ADD COLUMN IF NOT EXISTS output_tokens       integer,
  ADD COLUMN IF NOT EXISTS total_tokens        integer,
  ADD COLUMN IF NOT EXISTS cost_source         text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS external_request_id text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ie_agent_created ON inference_events (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ie_provider       ON inference_events (provider);
CREATE INDEX IF NOT EXISTS idx_ie_agent_provider ON inference_events (agent_id, provider);
CREATE INDEX IF NOT EXISTS idx_ie_status         ON inference_events (status);
CREATE INDEX IF NOT EXISTS idx_ie_cost_source    ON inference_events (cost_source);
