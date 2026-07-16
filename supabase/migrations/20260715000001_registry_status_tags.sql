-- ============================================================
-- Migration: P0 Bankr scope-lock status tags on registry_agents
--
-- Adds the sprint tag vocabulary as TEXT + CHECK columns:
--   focus_status     (admin-edited)  : 'active_focus' | NULL
--   bankr_priority   (admin-edited)  : 'high' | 'medium' | 'low' | NULL
--   metadata_status  (admin-edited)  : 'complete' | 'incomplete' | 'needs_review' | NULL
--   wallet_status    (trigger-owned) : 'none' | 'candidate' | 'declared' | 'verified' | 'rejected'
--   profile_status   (trigger-owned) : 'candidate' | 'needs_verification' | 'verified'
--
-- wallet_status and profile_status follow the books_eligible invariant
-- pattern (20260706000002): computed in the database so no caller can
-- write a value that contradicts the underlying data.
--
-- books_status and data_status are NOT stored — they depend on wall-clock
-- age (cache TTL / last_checked) and are derived at read time in
-- src/lib/status-tags.ts.
-- ============================================================

-- ── 1. Columns ────────────────────────────────────────────────────────────────

ALTER TABLE registry_agents
  ADD COLUMN IF NOT EXISTS focus_status    text,
  ADD COLUMN IF NOT EXISTS bankr_priority  text,
  ADD COLUMN IF NOT EXISTS metadata_status text,
  ADD COLUMN IF NOT EXISTS wallet_status   text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS profile_status  text NOT NULL DEFAULT 'candidate';

-- ── 2. CHECK constraints (drop-and-recreate so re-runs are safe) ──────────────

ALTER TABLE registry_agents
  DROP CONSTRAINT IF EXISTS registry_agents_focus_status_check,
  DROP CONSTRAINT IF EXISTS registry_agents_bankr_priority_check,
  DROP CONSTRAINT IF EXISTS registry_agents_metadata_status_check,
  DROP CONSTRAINT IF EXISTS registry_agents_wallet_status_check,
  DROP CONSTRAINT IF EXISTS registry_agents_profile_status_check;

ALTER TABLE registry_agents
  ADD CONSTRAINT registry_agents_focus_status_check
    CHECK (focus_status IS NULL OR focus_status = 'active_focus'),
  ADD CONSTRAINT registry_agents_bankr_priority_check
    CHECK (bankr_priority IS NULL OR bankr_priority IN ('high', 'medium', 'low')),
  ADD CONSTRAINT registry_agents_metadata_status_check
    CHECK (metadata_status IS NULL OR metadata_status IN ('complete', 'incomplete', 'needs_review')),
  ADD CONSTRAINT registry_agents_wallet_status_check
    CHECK (wallet_status IN ('none', 'candidate', 'declared', 'verified', 'rejected')),
  ADD CONSTRAINT registry_agents_profile_status_check
    CHECK (profile_status IN ('candidate', 'needs_verification', 'verified'));

-- ── 3. profile_status: pure function of verification_status (same row) ────────
-- Mapping (mirrors deriveProfileStatus() in src/lib/status-tags.ts):
--   Candidate, Awaiting Manifest                        → candidate
--   Needs Verification, Wallets Declared, Claimed       → needs_verification
--   Verified, Luca Managed, ERC-8004 Indexed            → verified
--   NULL / anything else                                → candidate

CREATE OR REPLACE FUNCTION compute_profile_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.profile_status := CASE coalesce(NEW.verification_status, '')
    WHEN 'Verified'           THEN 'verified'
    WHEN 'Luca Managed'       THEN 'verified'
    WHEN 'ERC-8004 Indexed'   THEN 'verified'
    WHEN 'Needs Verification' THEN 'needs_verification'
    WHEN 'Wallets Declared'   THEN 'needs_verification'
    WHEN 'Claimed'            THEN 'needs_verification'
    ELSE 'candidate'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registry_agents_profile_status ON registry_agents;

CREATE TRIGGER registry_agents_profile_status
  BEFORE INSERT OR UPDATE
  ON registry_agents
  FOR EACH ROW EXECUTE FUNCTION compute_profile_status();

-- ── 4. wallet_status: aggregate of the agent's wallet rows ────────────────────
-- Precedence (mirrors deriveWalletStatus() in src/lib/status-tags.ts):
--   1. no wallet rows                                   → none
--   2. any wallet confidence = 'confirmed'              → verified
--   3. any wallet evidence_source = 'manifest'          → declared
--   4. wallets exist, all classified, all disqualified
--      (books_eligible = false AND address_type set but
--       not in the eligible set)                        → rejected
--   5. otherwise                                        → candidate

CREATE OR REPLACE FUNCTION derive_wallet_status(p_agent_name text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN count(*) = 0 THEN 'none'
    WHEN bool_or(lower(coalesce(confidence, '')) = 'confirmed') THEN 'verified'
    WHEN bool_or(lower(coalesce(evidence_source, '')) = 'manifest') THEN 'declared'
    WHEN bool_and(
      NOT books_eligible
      AND address_type IS NOT NULL
      AND lower(address_type) NOT IN ('eoa', 'treasury_contract', 'smart_account')
    ) THEN 'rejected'
    ELSE 'candidate'
  END
  FROM registry_agent_wallets
  WHERE agent_name = p_agent_name;
$$;

CREATE OR REPLACE FUNCTION recompute_agent_wallet_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Recompute for the affected parent; if an UPDATE moved the wallet to a
  -- different agent, recompute both the old and new parents.
  UPDATE registry_agents
  SET wallet_status = derive_wallet_status(name)
  WHERE name IN (
    coalesce(NEW.agent_name, OLD.agent_name),
    coalesce(OLD.agent_name, NEW.agent_name)
  );
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

DROP TRIGGER IF EXISTS registry_agent_wallets_wallet_status ON registry_agent_wallets;

CREATE TRIGGER registry_agent_wallets_wallet_status
  AFTER INSERT OR UPDATE OR DELETE
  ON registry_agent_wallets
  FOR EACH ROW EXECUTE FUNCTION recompute_agent_wallet_status();

-- ── 5. Backfills ──────────────────────────────────────────────────────────────

-- Trigger-owned columns: fire the BEFORE trigger / reuse the derive function.
UPDATE registry_agents SET profile_status = profile_status;
UPDATE registry_agents SET wallet_status  = derive_wallet_status(name);

-- Bankr rows enter active focus; bankr_priority seeded from the internal
-- integer priority (>= 70 high, <= 30 low, else medium). The int column is
-- untouched and stays the fine-grained sort key.
UPDATE registry_agents
SET focus_status   = 'active_focus',
    bankr_priority = CASE
      WHEN coalesce(priority, 0) >= 70 THEN 'high'
      WHEN coalesce(priority, 0) <= 30 THEN 'low'
      ELSE 'medium'
    END
WHERE ecosystem = 'BANKR'
  AND focus_status IS NULL;

-- metadata_status: mechanical completeness check for all rows.
-- 'needs_review' is never auto-set — human judgment only.
UPDATE registry_agents
SET metadata_status = CASE
  WHEN x_handle IS NOT NULL AND website IS NOT NULL AND symbol IS NOT NULL
    THEN 'complete'
  ELSE 'incomplete'
END
WHERE metadata_status IS NULL;

-- ── 6. Index for admin filtering ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS registry_agents_ecosystem_focus_idx
  ON registry_agents (ecosystem, focus_status, bankr_priority);

-- ── Verification queries (run manually after applying) ────────────────────────
-- SELECT wallet_status, count(*) FROM registry_agents GROUP BY 1 ORDER BY 1;
-- SELECT profile_status, verification_status, count(*)
--   FROM registry_agents GROUP BY 1, 2 ORDER BY 1, 2;
-- SELECT ecosystem, focus_status, bankr_priority, count(*)
--   FROM registry_agents GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
-- Trigger check: insert a manifest wallet for a test agent → wallet_status
-- should flip to 'declared'; delete it → recomputed on the spot.
