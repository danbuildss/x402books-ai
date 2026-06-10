-- API key ownership + signature-verified wallet linking.
--
-- Also captures the api_keys / api_usage schema in version control for the
-- first time (these tables were originally created via the dashboard).
-- CREATE IF NOT EXISTS is a no-op on existing tables.

CREATE TABLE IF NOT EXISTS api_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash            TEXT NOT NULL UNIQUE,
  key_prefix          TEXT NOT NULL,
  name                TEXT NOT NULL DEFAULT 'Default',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  tier                TEXT NOT NULL DEFAULT 'free',
  rate_limit_per_day  INTEGER NOT NULL DEFAULT 100,
  requests_today      INTEGER NOT NULL DEFAULT 0,
  requests_today_date DATE,
  requests_total      INTEGER NOT NULL DEFAULT 0,
  wallet_address      TEXT,
  tier_checked_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id      UUID REFERENCES api_keys(id),
  endpoint    TEXT,
  wallet      TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ownership: keys belong to the access-code session that created them.
-- Pre-existing keys keep NULL owner and stay admin-managed.
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS owner_code_id         TEXT,
  ADD COLUMN IF NOT EXISTS link_nonce            TEXT,
  ADD COLUMN IF NOT EXISTS link_nonce_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_code_id);
