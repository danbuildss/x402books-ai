-- Agent Books History
-- Persists 30d books snapshots for each attributed agent.
-- One snapshot per agent per snapshot event (triggered by report generation or admin endpoint).
-- Retention: keep all snapshots. Query by snapshotted_at for time ranges.

CREATE TABLE IF NOT EXISTS agent_books_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug      TEXT        NOT NULL,
  revenue_usd     NUMERIC     NOT NULL DEFAULT 0,
  expenses_usd    NUMERIC     NOT NULL DEFAULT 0,
  net_income_usd  NUMERIC     NOT NULL DEFAULT 0,
  treasury_usd    NUMERIC,                          -- NULL if no declared treasury wallet
  tx_count        INTEGER     NOT NULL DEFAULT 0,
  wallet_count    INTEGER     NOT NULL DEFAULT 0,
  snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_books_history_slug_idx
  ON agent_books_history (agent_slug, snapshotted_at DESC);

COMMENT ON TABLE agent_books_history IS
  'Historical snapshots of agent 30d books. One row per agent per snapshot event. '
  'Source: buildAgentBooks() output only — no synthetic or inferred values.';
