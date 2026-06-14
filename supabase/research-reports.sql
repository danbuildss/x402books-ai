-- State of the Agent Economy research reports
-- Published reports written by Luca, stored for display on /research
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS research_reports (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         TEXT         UNIQUE NOT NULL,
  title        TEXT         NOT NULL,
  subtitle     TEXT,
  type         TEXT         NOT NULL CHECK (type IN ('weekly', 'monthly', 'quarterly')),
  summary      TEXT         NOT NULL,
  body         TEXT         NOT NULL,
  agent_gdp_usd NUMERIC,
  attributed_agents INTEGER,
  period_label TEXT,
  published_at TIMESTAMPTZ  DEFAULT NOW(),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_published ON research_reports (published_at DESC);
