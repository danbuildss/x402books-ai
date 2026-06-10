-- Trust score history — enables "Most Improved" and score trajectories.
-- One row per agent per snapshot run (daily via /api/cron/snapshot-trust-scores).

CREATE TABLE IF NOT EXISTS trust_score_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug          TEXT NOT NULL,
  agent_name          TEXT NOT NULL,
  trust_score         INTEGER NOT NULL,
  confidence          INTEGER NOT NULL,
  verification_status TEXT NOT NULL,
  risk_level          TEXT NOT NULL,
  recommendation      TEXT NOT NULL,
  snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One snapshot per agent per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_history_agent_day
  ON trust_score_history (agent_slug, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_trust_history_date
  ON trust_score_history (snapshot_date);
