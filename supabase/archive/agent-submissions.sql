-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Agent verification submissions
-- Stores submissions from /registry#verify form (both Manual Submit and Gitlawb tabs)

CREATE TABLE IF NOT EXISTS agent_submissions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name      text        NOT NULL,
  wallet_address  text        NOT NULL,
  x_handle        text,
  notes           text,
  gitlawb_repo    text,
  status          text        NOT NULL DEFAULT 'pending',   -- pending | reviewed | approved | rejected
  admin_notes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,

  -- Prevent the exact same agent+wallet being submitted twice
  CONSTRAINT agent_submissions_unique_pair UNIQUE (agent_name, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_agent_submissions_status
  ON agent_submissions (status);

CREATE INDEX IF NOT EXISTS idx_agent_submissions_created
  ON agent_submissions (created_at DESC);
