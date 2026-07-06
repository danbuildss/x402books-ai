-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- ============================================================
-- Zetta Truth Engine
-- Proposed SQL layer for manifest truth, wallet-role evidence,
-- books eligibility, and revenue classification support.
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

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_manifest_submissions_agent_slug
  ON registry_manifest_submissions (agent_slug);

CREATE INDEX IF NOT EXISTS idx_manifest_submissions_reference_id
  ON registry_manifest_submissions (reference_id);

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
