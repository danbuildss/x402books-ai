-- ============================================================
-- Migration: Communication Identities for Agent Financial Registry
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS registry_agent_comm_identities (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name  text        NOT NULL REFERENCES registry_agents(name) ON DELETE CASCADE,
  platform    text        NOT NULL,
  handle      text        NOT NULL,
  url         text,
  confidence  text        NOT NULL DEFAULT 'unverified'
                          CHECK (confidence IN ('unverified', 'confirmed')),
  labels      text[]      NOT NULL DEFAULT '{}',
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_identities_agent_name
  ON registry_agent_comm_identities (agent_name);

-- Enforce: communication identity is separate from wallet verification.
-- (Enforced at application layer — no DB constraint needed, but noted here.)

COMMENT ON TABLE registry_agent_comm_identities IS
  'Agent communication handles (wiretap, telegram, X, etc).
   Confidence = confirmed does NOT imply wallet verification.
   Payment request activity does NOT imply confirmed revenue.';

COMMENT ON COLUMN registry_agent_comm_identities.labels IS
  'Public-safe labels: payment request observed | settlement not confirmed |
   needs wallet confirmation | reconciliation candidate';
