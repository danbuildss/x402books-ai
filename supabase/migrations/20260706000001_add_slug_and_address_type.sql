-- ============================================================
-- Migration: Add slug column to registry_agents
-- and ensure address_type exists on registry_agent_wallets.
--
-- slug: a URL-safe, stable identifier derived from the agent name.
--   - Used in profile URLs: /registry/[slug]
--   - Safe to join on (unlike name, which can change display casing)
--   - Backfilled for existing rows via the UPDATE below
--
-- address_type: already added ad-hoc to some rows via wallet-metadata-migration.sql.
-- This migration ensures the column exists for all environments.
-- ============================================================

-- Add slug column (noop if already present)
ALTER TABLE registry_agents
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill: derive slug from name using the same logic as toSlug() in TypeScript:
--   lowercase → replace non-alphanumeric runs with hyphens → trim leading/trailing hyphens
UPDATE registry_agents
SET slug = regexp_replace(
             regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
             '^-|-$', '', 'g'
           )
WHERE slug IS NULL;

-- Enforce uniqueness now that all rows are backfilled
CREATE UNIQUE INDEX IF NOT EXISTS registry_agents_slug_idx ON registry_agents(slug);

-- Make slug NOT NULL after backfill (safe — every row now has a value)
ALTER TABLE registry_agents
  ALTER COLUMN slug SET NOT NULL;

-- Ensure address_type exists on wallets (noop if wallet-metadata-migration.sql was already applied)
ALTER TABLE registry_agent_wallets
  ADD COLUMN IF NOT EXISTS address_type text;

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Keeps registry_agents.updated_at current on any row modification.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'registry_agents_set_updated_at'
      AND tgrelid = 'registry_agents'::regclass
  ) THEN
    CREATE TRIGGER registry_agents_set_updated_at
      BEFORE UPDATE ON registry_agents
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
