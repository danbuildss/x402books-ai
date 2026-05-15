-- Phase 3: API key management and usage tracking

CREATE TABLE IF NOT EXISTS api_keys (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash            text        NOT NULL UNIQUE,
  key_prefix          text        NOT NULL,          -- first 12 chars for display
  name                text        NOT NULL DEFAULT 'Default',
  is_active           boolean     NOT NULL DEFAULT true,
  rate_limit_per_day  integer     NOT NULL DEFAULT 100,
  requests_today      integer     NOT NULL DEFAULT 0,
  requests_today_date text        NOT NULL DEFAULT '', -- YYYY-MM-DD, reset trigger
  requests_total      integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_used_at        timestamptz
);

CREATE TABLE IF NOT EXISTS api_usage (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id      uuid        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  wallet      text,
  status_code integer,
  duration_ms integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_key_created ON api_usage(key_id, created_at DESC);

-- Atomically increment usage counters, resetting daily
CREATE OR REPLACE FUNCTION increment_api_key_usage(p_key_id uuid, p_today text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE api_keys
  SET
    requests_today      = CASE WHEN requests_today_date = p_today THEN requests_today + 1 ELSE 1 END,
    requests_today_date = p_today,
    requests_total      = requests_total + 1,
    last_used_at        = now()
  WHERE id = p_key_id;
END;
$$;
