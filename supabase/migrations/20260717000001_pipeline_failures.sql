-- ============================================================
-- Migration: pipeline_failures + registry_agents.last_indexed_at (P5)
--
-- Makes the Bankr data pipeline observable end to end. Every stage failure
-- is recorded so it's queryable by admin — no more silent empty states.
--
-- Pipeline stages (fixed vocabulary, CHECK-enforced):
--   agent_indexed → metadata_complete → wallet_declared → wallet_eligible →
--   transactions_fetched → transactions_normalized → transactions_classified →
--   books_generated → profile_updated → luca_report_generated
--
-- last_indexed_at is stamped by the pipeline on every successful agent run so
-- data_status can finally distinguish fresh / stale / failed (it previously
-- read last_checked, which only admin verdict-refresh ever wrote).
-- ============================================================

-- ── 1. Pipeline freshness marker on agents ────────────────────────────────────

ALTER TABLE registry_agents
  ADD COLUMN IF NOT EXISTS last_indexed_at timestamptz;

-- ── 2. Failure log ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_failures (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug          text,
  agent_name          text,
  wallet_address      text,
  chain               text,
  provider            text,
  stage               text        NOT NULL,
  error               text,
  last_successful_run timestamptz,
  records_fetched     integer     NOT NULL DEFAULT 0,
  records_written     integer     NOT NULL DEFAULT 0,
  retry_count         integer     NOT NULL DEFAULT 0,
  resolved            boolean     NOT NULL DEFAULT false,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Stage vocabulary (drop-and-recreate so re-runs are safe)
ALTER TABLE pipeline_failures
  DROP CONSTRAINT IF EXISTS pipeline_failures_stage_check;

ALTER TABLE pipeline_failures
  ADD CONSTRAINT pipeline_failures_stage_check
    CHECK (stage IN (
      'agent_indexed',
      'metadata_complete',
      'wallet_declared',
      'wallet_eligible',
      'transactions_fetched',
      'transactions_normalized',
      'transactions_classified',
      'books_generated',
      'profile_updated',
      'luca_report_generated'
    ));

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS pipeline_failures_agent_created_idx
  ON pipeline_failures (agent_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS pipeline_failures_stage_idx
  ON pipeline_failures (stage);
CREATE INDEX IF NOT EXISTS pipeline_failures_unresolved_idx
  ON pipeline_failures (resolved, created_at DESC);

-- ── 4. RLS: service-only (admin/internal — never exposed via anon key) ───────

ALTER TABLE pipeline_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pipeline_failures_service_only" ON pipeline_failures;
CREATE POLICY "pipeline_failures_service_only"
  ON pipeline_failures FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Verification (run manually after applying) ────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'pipeline_failures' ORDER BY ordinal_position;
-- SELECT stage, count(*) FROM pipeline_failures WHERE NOT resolved GROUP BY 1 ORDER BY 2 DESC;
-- SELECT name, last_indexed_at FROM registry_agents WHERE last_indexed_at IS NOT NULL ORDER BY last_indexed_at DESC LIMIT 10;
-- Negative test (expect CHECK violation):
--   INSERT INTO pipeline_failures (stage) VALUES ('bogus_stage');
