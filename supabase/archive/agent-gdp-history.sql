-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Agent GDP history — one row per snapshot.
-- Snapshots are written by the report generation endpoint (Luca triggers both).
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS agent_gdp_history (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  total_revenue_usd    NUMERIC     NOT NULL,
  total_expenses_usd   NUMERIC     NOT NULL,
  total_net_income_usd NUMERIC     NOT NULL,
  attributed_agents    INTEGER     NOT NULL,
  total_agents         INTEGER     NOT NULL,
  snapshotted_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_gdp_history_snapshotted ON agent_gdp_history (snapshotted_at DESC);
