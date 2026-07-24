-- Backend-only financial truth foundation.
-- Additive and backward compatible: existing slug-based readers keep working
-- while new writes attach immutable registry IDs and wallet lifecycle metadata.

ALTER TABLE registry_manifest_submissions
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manifest_digest text,
  ADD COLUMN IF NOT EXISTS source_revision text,
  ADD COLUMN IF NOT EXISTS validator_version text,
  ADD COLUMN IF NOT EXISTS validation_warnings jsonb DEFAULT '[]'::jsonb;

ALTER TABLE registry_wallet_claims
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claim_source text DEFAULT 'repository_manifest',
  ADD COLUMN IF NOT EXISTS control_proof text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS control_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS wallet_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE revenue_classification_events
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recognition_status text DEFAULT 'unresolved',
  ADD COLUMN IF NOT EXISTS evidence_basis text DEFAULT 'onchain_only';

-- Resolve current rows to the immutable registry UUID without breaking aliases.
-- Future ingestion resolves IDs in application code; unresolved legacy rows stay null.
UPDATE registry_manifest_submissions s
SET agent_id = a.id
FROM registry_agents a
WHERE s.agent_id IS NULL
  AND s.agent_slug = lower(regexp_replace(a.name, '[^a-zA-Z0-9]+', '-', 'g'));

UPDATE registry_wallet_claims w
SET agent_id = a.id
FROM registry_agents a
WHERE w.agent_id IS NULL
  AND w.agent_slug = lower(regexp_replace(a.name, '[^a-zA-Z0-9]+', '-', 'g'));

UPDATE revenue_classification_events e
SET agent_id = a.id
FROM registry_agents a
WHERE e.agent_id IS NULL
  AND e.agent_slug = lower(regexp_replace(a.name, '[^a-zA-Z0-9]+', '-', 'g'));

-- Historical labels are retained for API compatibility but can no longer be
-- interpreted as recognized/verified revenue.
UPDATE revenue_classification_events
SET classification = CASE
      WHEN classification = 'settlement_revenue' THEN 'revenue_candidate'
      WHEN classification = 'fee_received' THEN 'unresolved_inflow'
      ELSE classification
    END,
    recognition_status = CASE
      WHEN classification = 'settlement_revenue' THEN 'candidate'
      WHEN classification = 'fee_received' THEN 'unresolved'
      ELSE COALESCE(recognition_status, 'not_revenue')
    END,
    evidence_basis = 'onchain_only'
WHERE classification IN ('settlement_revenue', 'fee_received');

-- A declaration is attribution, not control proof. Correct legacy upgrades that
-- were produced solely from observed transfer patterns.
UPDATE registry_wallet_claims
SET evidence_status = 'observed',
    control_status = 'unverified'
WHERE evidence_status = 'verified'
  AND COALESCE(control_proof, 'none') = 'none';

CREATE INDEX IF NOT EXISTS idx_manifest_submissions_agent_id
  ON registry_manifest_submissions (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_claims_agent_id
  ON registry_wallet_claims (agent_id);
CREATE INDEX IF NOT EXISTS idx_wallet_claims_validity
  ON registry_wallet_claims (agent_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_revenue_events_agent_id
  ON revenue_classification_events (agent_id, observed_at DESC);

ALTER TABLE registry_wallet_claims DROP CONSTRAINT IF EXISTS registry_wallet_claims_wallet_status_check;
ALTER TABLE registry_wallet_claims ADD CONSTRAINT registry_wallet_claims_wallet_status_check
  CHECK (wallet_status IN ('active', 'inactive', 'revoked'));
ALTER TABLE registry_wallet_claims DROP CONSTRAINT IF EXISTS registry_wallet_claims_control_status_check;
ALTER TABLE registry_wallet_claims ADD CONSTRAINT registry_wallet_claims_control_status_check
  CHECK (control_status IN ('unverified', 'operator_attested', 'cryptographically_verified', 'contract_verified'));
ALTER TABLE revenue_classification_events DROP CONSTRAINT IF EXISTS revenue_events_recognition_status_check;
ALTER TABLE revenue_classification_events ADD CONSTRAINT revenue_events_recognition_status_check
  CHECK (recognition_status IN ('not_revenue', 'unresolved', 'candidate', 'recognized'));
