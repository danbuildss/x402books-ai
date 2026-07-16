-- ============================================================
-- Migration: auto-classify address_type from wallet role
--
-- When a manifest wallet is inserted/updated without an explicit
-- address_type, derive it from the declared role so that the
-- books_eligible trigger (20260706000002) can immediately compute
-- the correct value.
--
-- Role → address_type mapping:
--   treasury       → treasury_contract
--   operator       → eoa
--   fee            → eoa
--   revenue        → eoa
--   surplus_wallet → eoa
--   deployer       → eoa
--   token_contract → (unchanged — intentionally ineligible)
--   token          → (unchanged — intentionally ineligible)
--   anything else  → eoa (safe default for manifest wallets)
--
-- This trigger must fire BEFORE registry_agent_wallets_books_eligible.
-- Postgres fires BEFORE triggers in alphabetical name order, so naming
-- this trigger with prefix "auto_" ensures it sorts before "books_".
-- ============================================================

CREATE OR REPLACE FUNCTION auto_set_address_type_from_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF lower(coalesce(NEW.evidence_source, '')) = 'manifest'
     AND (NEW.address_type IS NULL OR lower(coalesce(NEW.address_type, '')) IN ('unknown', ''))
  THEN
    NEW.address_type := CASE lower(coalesce(NEW.role, ''))
      WHEN 'treasury'        THEN 'treasury_contract'
      WHEN 'operator'        THEN 'eoa'
      WHEN 'fee'             THEN 'eoa'
      WHEN 'revenue'         THEN 'eoa'
      WHEN 'surplus_wallet'  THEN 'eoa'
      WHEN 'deployer'        THEN 'eoa'
      WHEN 'token_contract'  THEN NEW.address_type  -- leave unchanged
      WHEN 'token'           THEN NEW.address_type  -- leave unchanged
      WHEN 'smart_contract'  THEN NEW.address_type  -- leave unchanged
      ELSE 'eoa'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_address_type_from_role ON registry_agent_wallets;

CREATE TRIGGER auto_address_type_from_role
  BEFORE INSERT OR UPDATE
  ON registry_agent_wallets
  FOR EACH ROW EXECUTE FUNCTION auto_set_address_type_from_role();

-- Backfill existing manifest wallets with null/unknown address_type
UPDATE registry_agent_wallets
SET address_type = CASE lower(coalesce(role, ''))
  WHEN 'treasury'        THEN 'treasury_contract'
  WHEN 'operator'        THEN 'eoa'
  WHEN 'fee'             THEN 'eoa'
  WHEN 'revenue'         THEN 'eoa'
  WHEN 'surplus_wallet'  THEN 'eoa'
  WHEN 'deployer'        THEN 'eoa'
  ELSE 'eoa'
END
WHERE lower(coalesce(evidence_source, '')) = 'manifest'
  AND (address_type IS NULL OR lower(coalesce(address_type, '')) IN ('unknown', ''))
  AND lower(coalesce(role, '')) NOT IN ('token_contract', 'token', 'smart_contract');

-- ── Verification ──────────────────────────────────────────────────────────────
-- SELECT evidence_source, address_type, role, books_eligible, COUNT(*)
-- FROM registry_agent_wallets
-- GROUP BY evidence_source, address_type, role, books_eligible
-- ORDER BY evidence_source, books_eligible DESC;
