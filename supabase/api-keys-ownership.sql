-- API key ownership + wallet-link challenge columns
-- Binds keys to the access-code session that created them, and stores the
-- single-use nonce for signature-verified wallet linking.
-- Safe to run multiple times.

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS owner_code_id TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS link_nonce TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS link_nonce_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_code_id);
