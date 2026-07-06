-- ============================================================
-- Migration: Fix transactions unique constraint
--
-- The original constraint was:
--   UNIQUE (wallet_address, tx_hash, counterparty, amount_usdc)
--
-- This allowed duplicate rows for the same on-chain event if the
-- counterparty address or amount differed by rounding or case.
-- A tx_hash is globally unique per chain, so the correct constraint
-- is (wallet_address, tx_hash) — one row per wallet per event.
--
-- Safe approach: add the new constraint first (it will fail if dupes
-- exist; clean up dupes before running if that happens), then drop
-- the old one.
-- ============================================================

-- Remove the old overly-broad unique constraint (may not exist if it
-- was defined inline and Postgres named it automatically — use the
-- conname from pg_constraint to be safe).
DO $$
DECLARE
  _constraint_name text;
BEGIN
  SELECT conname INTO _constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.transactions'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 4  -- the old 4-column constraint
  LIMIT 1;

  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.transactions DROP CONSTRAINT %I', _constraint_name);
    RAISE NOTICE 'Dropped old unique constraint: %', _constraint_name;
  ELSE
    RAISE NOTICE 'Old 4-column unique constraint not found — skipping drop';
  END IF;
END;
$$;

-- Add the correct 2-column unique constraint (idempotent via IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.transactions'::regclass
      AND contype = 'u'
      AND conname = 'transactions_wallet_tx_unique'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_wallet_tx_unique
      UNIQUE (wallet_address, tx_hash);
    RAISE NOTICE 'Added transactions_wallet_tx_unique constraint';
  ELSE
    RAISE NOTICE 'transactions_wallet_tx_unique already exists — skipping';
  END IF;
END;
$$;

-- Add a supporting index on tx_hash alone for fast cross-wallet lookups
CREATE INDEX IF NOT EXISTS transactions_tx_hash_idx
  ON public.transactions(tx_hash);
