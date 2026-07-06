-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Registry claims — agent teams claiming their profile by matching a wallet address
CREATE TABLE IF NOT EXISTS registry_claims (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name      text        NOT NULL,
  wallet_address  text        NOT NULL,
  wallet_matched  boolean     NOT NULL DEFAULT false,
  repo_url        text,
  status          text        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewer_notes  text,
  created_at      timestamptz DEFAULT now(),
  reviewed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS registry_claims_agent_name_idx ON registry_claims (agent_name);
CREATE INDEX IF NOT EXISTS registry_claims_status_idx     ON registry_claims (status);
