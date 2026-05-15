-- Phase 4: $XBOOKS token-gated tiers on API keys

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS wallet_address text,
  ADD COLUMN IF NOT EXISTS tier           text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS api_keys_wallet ON api_keys(wallet_address);
