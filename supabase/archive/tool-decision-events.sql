-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Run this in Supabase SQL editor before deploying the Nipmod integration

CREATE TABLE IF NOT EXISTS tool_decision_events (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id      text        NOT NULL,
  package       text        NOT NULL,
  source        text,
  trust_score   integer     CHECK (trust_score >= 0 AND trust_score <= 100),
  risk_level    text        CHECK (risk_level IN ('low', 'medium', 'high', 'unknown')),
  decision      text        CHECK (decision IN ('install', 'reject', 'defer', 'unknown')),
  event_time    timestamptz NOT NULL DEFAULT now(),
  raw           jsonb,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_decision_events_agent_id_idx
  ON tool_decision_events (agent_id, event_time DESC);
