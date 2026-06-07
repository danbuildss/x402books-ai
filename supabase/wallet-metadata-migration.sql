-- Wallet metadata migration
-- Adds chain, role, confidence, evidence_source to registry_agent_wallets
-- Run once in Supabase SQL editor.

ALTER TABLE registry_agent_wallets
  ADD COLUMN IF NOT EXISTS chain           TEXT NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS role            TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS confidence      TEXT NOT NULL DEFAULT 'declared',
  ADD COLUMN IF NOT EXISTS evidence_source TEXT;

-- Backfill evidence_source for existing rows that have a label
-- (these were submitted via manifest before this migration)
UPDATE registry_agent_wallets
SET evidence_source = 'manifest'
WHERE evidence_source IS NULL;

-- Backfill role from label for existing rows
UPDATE registry_agent_wallets SET role = 'treasury'  WHERE label = 'likely treasury'      AND role = 'unknown';
UPDATE registry_agent_wallets SET role = 'fee'        WHERE label = 'likely fee recipient' AND role = 'unknown';
UPDATE registry_agent_wallets SET role = 'operator'   WHERE label = 'likely expense wallet' AND role = 'unknown';
UPDATE registry_agent_wallets SET role = 'deployer'   WHERE label = 'candidate wallet'     AND role = 'unknown';
