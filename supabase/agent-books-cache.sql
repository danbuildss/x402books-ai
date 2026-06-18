-- agent_books_cache: persistent cache for computed agent books.
-- Populated by buildAgentBooks() on first scan; refreshed every 4h by the cron job.
-- Keyed on (agent_slug, period) with upsert — only one row per agent per period.

CREATE TABLE IF NOT EXISTS agent_books_cache (
  agent_slug  TEXT        NOT NULL,
  period      TEXT        NOT NULL DEFAULT '30d',
  books_json  JSONB       NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_slug, period)
);

CREATE INDEX IF NOT EXISTS agent_books_cache_slug_idx
  ON agent_books_cache (agent_slug, computed_at DESC);
