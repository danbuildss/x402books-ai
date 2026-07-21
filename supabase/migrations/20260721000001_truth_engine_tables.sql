-- ============================================================
-- Migration: promote truth-engine tables to a real migration
--
-- These five tables previously existed only in
-- supabase/archive/zetta-truth-engine.sql, so environments could
-- drift and the dedupe constraints were never guaranteed.
--
-- Everything here is idempotent (IF NOT EXISTS / OR REPLACE), so
-- it is safe to run against a database where the tables were
-- already created manually from the archive file.
--
-- Dedupe guarantees this migration locks in:
--   registry_wallet_claims          UNIQUE (agent_slug, address, chain, role)
--   revenue_classification_events   UNIQUE (agent_slug, tx_hash, classification)
--     → re-running the indexer upserts with ignoreDuplicates on this key,
--       so re-indexing can never double-count revenue events.
--   registry_manifest_submissions   UNIQUE (reference_id)
-- ============================================================

-- ── manifest submissions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS registry_manifest_submissions (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id        text        NOT NULL UNIQUE,
  agent_slug          text        NOT NULL,
  ecosystem           text,
  repo_url            text,
  manifest_path       text        DEFAULT '.agent/wallets.json',
  manifest_version    text,
  submitted_by        text,
  verification_status text        DEFAULT 'pending',
  parsed_manifest     jsonb       NOT NULL,
  validation_errors   jsonb       DEFAULT '[]'::jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── wallet claims and role evidence ──────────────────────────
CREATE TABLE IF NOT EXISTS registry_wallet_claims (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug          text        NOT NULL,
  address             text        NOT NULL,
  chain               text        NOT NULL,
  role                text        NOT NULL,
  claim_status        text        DEFAULT 'declared',
  evidence_status     text        DEFAULT 'attributed',
  evidence_summary    text,
  evidence_packet     jsonb       DEFAULT '{}'::jsonb,
  source_type         text        NOT NULL,
  source_ref          text,
  confidence          text        DEFAULT 'medium',
  books_eligible      boolean     DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (agent_slug, address, chain, role)
);

-- ── books eligibility snapshots ──────────────────────────────
CREATE TABLE IF NOT EXISTS books_eligibility_snapshots (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug          text        NOT NULL,
  period_label        text        NOT NULL,
  wallet_count        integer     DEFAULT 0,
  eligible_wallets    jsonb       NOT NULL,
  ineligible_wallets  jsonb       DEFAULT '[]'::jsonb,
  reasons             jsonb       DEFAULT '[]'::jsonb,
  confidence_summary  jsonb       DEFAULT '{}'::jsonb,
  created_at          timestamptz DEFAULT now()
);

-- ── revenue classification events ────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_classification_events (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug            text        NOT NULL,
  tx_hash               text        NOT NULL,
  chain                 text        NOT NULL,
  observed_at           timestamptz NOT NULL,
  asset_symbol          text,
  amount_usd            numeric,
  direction             text        NOT NULL,
  classification        text        NOT NULL,
  classification_reason text,
  confidence            text        DEFAULT 'medium',
  evidence_packet       jsonb       DEFAULT '{}'::jsonb,
  created_at            timestamptz DEFAULT now(),
  UNIQUE (agent_slug, tx_hash, classification)
);

-- ── evidence packets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registry_evidence_packets (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type        text        NOT NULL,
  subject_slug        text        NOT NULL,
  claim               text        NOT NULL,
  status              text        NOT NULL,
  confidence          text        DEFAULT 'medium',
  evidence_summary    text        NOT NULL,
  evidence_payload    jsonb       DEFAULT '{}'::jsonb,
  source_type         text        NOT NULL,
  source_ref          text,
  created_at          timestamptz DEFAULT now()
);

-- ── enforce dedupe keys on pre-existing tables ───────────────
-- If the tables were created manually WITHOUT the unique constraints,
-- CREATE TABLE IF NOT EXISTS above is a no-op and the constraints are
-- still missing. Add them explicitly: dedupe first, then constrain.

-- registry_wallet_claims: keep the newest row per (agent_slug, address, chain, role)
DELETE FROM registry_wallet_claims a
USING registry_wallet_claims b
WHERE a.agent_slug = b.agent_slug
  AND a.address    = b.address
  AND a.chain      = b.chain
  AND a.role       = b.role
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_claims_agent_addr_chain_role
  ON registry_wallet_claims (agent_slug, address, chain, role);

-- revenue_classification_events: keep the newest row per (agent_slug, tx_hash, classification)
DELETE FROM revenue_classification_events a
USING revenue_classification_events b
WHERE a.agent_slug     = b.agent_slug
  AND a.tx_hash        = b.tx_hash
  AND a.classification = b.classification
  AND a.created_at     < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_events_agent_tx_classification
  ON revenue_classification_events (agent_slug, tx_hash, classification);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_manifest_submissions_agent_slug
  ON registry_manifest_submissions (agent_slug);

CREATE INDEX IF NOT EXISTS idx_wallet_claims_agent_slug
  ON registry_wallet_claims (agent_slug);

CREATE INDEX IF NOT EXISTS idx_wallet_claims_address
  ON registry_wallet_claims (address);

CREATE INDEX IF NOT EXISTS idx_wallet_claims_books_eligible
  ON registry_wallet_claims (books_eligible);

CREATE INDEX IF NOT EXISTS idx_books_eligibility_snapshots_agent_slug
  ON books_eligibility_snapshots (agent_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_classification_events_agent_slug
  ON revenue_classification_events (agent_slug, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_registry_evidence_packets_subject
  ON registry_evidence_packets (subject_type, subject_slug, created_at DESC);

-- ── updated_at triggers ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_truth_engine_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_manifest_submissions_updated_at ON registry_manifest_submissions;
CREATE TRIGGER trg_manifest_submissions_updated_at
  BEFORE UPDATE ON registry_manifest_submissions
  FOR EACH ROW EXECUTE FUNCTION update_truth_engine_updated_at();

DROP TRIGGER IF EXISTS trg_wallet_claims_updated_at ON registry_wallet_claims;
CREATE TRIGGER trg_wallet_claims_updated_at
  BEFORE UPDATE ON registry_wallet_claims
  FOR EACH ROW EXECUTE FUNCTION update_truth_engine_updated_at();

-- ── Verification (run after applying) ────────────────────────
-- 1. All five tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_name IN ('registry_manifest_submissions','registry_wallet_claims',
--      'books_eligibility_snapshots','revenue_classification_events','registry_evidence_packets');
-- 2. Dedupe keys are enforced:
--    SELECT indexname FROM pg_indexes
--    WHERE indexname IN ('uq_wallet_claims_agent_addr_chain_role',
--                        'uq_revenue_events_agent_tx_classification');
-- 3. No duplicate revenue events remain:
--    SELECT agent_slug, tx_hash, classification, COUNT(*)
--    FROM revenue_classification_events
--    GROUP BY 1,2,3 HAVING COUNT(*) > 1;   -- must return 0 rows
