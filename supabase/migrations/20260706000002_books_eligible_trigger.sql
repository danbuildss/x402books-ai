-- ============================================================
-- Migration: books_eligible computed column + trigger
--
-- Moves the books eligibility invariant from TypeScript (wallet-eligibility.ts)
-- into the database so it cannot be bypassed by any caller.
--
-- Rule (mirrors isBooksEligibleWallet() exactly):
--   books_eligible = true  iff ALL of:
--     1. evidence_source = 'manifest'
--     2. address_type IN ('eoa', 'treasury_contract', 'smart_account')
--     3. role NOT IN ('token_contract', 'token')
--
-- Any wallet that fails any condition gets books_eligible = false.
-- Null evidence_source, null address_type → false.
-- ============================================================

-- Add the column (noop if already present)
ALTER TABLE registry_agent_wallets
  ADD COLUMN IF NOT EXISTS books_eligible boolean NOT NULL DEFAULT false;

-- Backfill existing rows
UPDATE registry_agent_wallets
SET books_eligible = (
  lower(coalesce(evidence_source, '')) = 'manifest'
  AND lower(coalesce(address_type, '')) IN ('eoa', 'treasury_contract', 'smart_account')
  AND lower(coalesce(role, '')) NOT IN ('token_contract', 'token')
);

-- Trigger function: recompute on every INSERT or UPDATE
CREATE OR REPLACE FUNCTION compute_books_eligible()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.books_eligible := (
    lower(coalesce(NEW.evidence_source, '')) = 'manifest'
    AND lower(coalesce(NEW.address_type, '')) IN ('eoa', 'treasury_contract', 'smart_account')
    AND lower(coalesce(NEW.role, '')) NOT IN ('token_contract', 'token')
  );
  RETURN NEW;
END;
$$;

-- Install trigger (drop-and-recreate to handle schema updates safely)
DROP TRIGGER IF EXISTS registry_agent_wallets_books_eligible
  ON registry_agent_wallets;

CREATE TRIGGER registry_agent_wallets_books_eligible
  BEFORE INSERT OR UPDATE
  ON registry_agent_wallets
  FOR EACH ROW EXECUTE FUNCTION compute_books_eligible();

-- ── Verification query (run manually to confirm) ──────────────────────────────
-- SELECT address, evidence_source, address_type, role, books_eligible
-- FROM registry_agent_wallets
-- WHERE books_eligible = true
-- ORDER BY agent_name, address;
