-- Create registry_submissions table if it doesn't exist, with submitter_ip included.
-- Safe to run against databases where the table already exists (all statements idempotent).
CREATE TABLE IF NOT EXISTS registry_submissions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  agent_name       text        NOT NULL,
  agent_slug       text        NOT NULL,
  wallet_address   text,
  notes            text,
  x_handle         text,
  manifest_json    text,
  submission_type  text        NOT NULL DEFAULT 'manifest_direct',
  submitter_ip     text,
  status           text        NOT NULL DEFAULT 'pending',
  reviewed_at      timestamptz,
  reviewer_notes   text
);

-- Add column if table already existed without it (idempotent upgrade path).
ALTER TABLE registry_submissions
  ADD COLUMN IF NOT EXISTS submitter_ip text;

CREATE INDEX IF NOT EXISTS registry_submissions_status_idx
  ON registry_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS registry_submissions_submitter_ip_idx
  ON registry_submissions(submitter_ip, created_at DESC);
