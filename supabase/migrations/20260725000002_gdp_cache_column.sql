-- ============================================================
-- Migration: add gdp_json to agent_gdp_history
--
-- The existing table stores aggregate totals only. Adding a
-- jsonb column lets getAgentGDP() use the DB row as a full
-- cache across Vercel instances, avoiding redundant
-- buildAgentBooks() fan-outs on every cold start.
-- ============================================================

ALTER TABLE agent_gdp_history
  ADD COLUMN IF NOT EXISTS gdp_json jsonb;

CREATE INDEX IF NOT EXISTS idx_agent_gdp_history_json_snapshotted
  ON agent_gdp_history (snapshotted_at DESC)
  WHERE gdp_json IS NOT NULL;
