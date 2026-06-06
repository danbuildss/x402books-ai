-- Luca subagent operating layer — V1 tables

CREATE TABLE IF NOT EXISTS luca_subagent_runs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  subagent_name text        NOT NULL,
  status        text        NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  duration_ms   integer,
  summary       text,
  result        jsonb,
  error         text,
  triggered_by  text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS luca_subagent_runs_name_idx    ON luca_subagent_runs (subagent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS luca_subagent_runs_started_idx ON luca_subagent_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS luca_pending_replies (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user     text,
  target_post_url text,
  target_post_id  text,
  draft_reply     text        NOT NULL,
  risk_level      text        NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  recommendation  text,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes  text,
  reviewed_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS luca_pending_replies_status_idx ON luca_pending_replies (status, created_at DESC);
