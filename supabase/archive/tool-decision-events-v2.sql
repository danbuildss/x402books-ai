-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Migration: add project_id and decision_proof_hash columns
-- Nipmod v0 sends these fields; previously only captured in raw jsonb

ALTER TABLE tool_decision_events
  ADD COLUMN IF NOT EXISTS project_id          text,
  ADD COLUMN IF NOT EXISTS decision_proof_hash text;

CREATE INDEX IF NOT EXISTS tool_decision_events_project_id_idx
  ON tool_decision_events (project_id)
  WHERE project_id IS NOT NULL;
