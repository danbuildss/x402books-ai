-- ============================================================
-- Migration: agent bio (P3 profile restructure)
--
-- One-line public description shown at the top of the agent profile,
-- directly under the name. Plain prose — no CHECK constraint. Nullable:
-- profiles without a bio render an honest empty state ("No bio yet —
-- claim this profile to add one").
--
-- Written by: admin update-agent PATCH (500-char soft clamp app-side).
-- Public: exposed on PublicAgent — never put internal notes here
-- (that's admin_notes / the Luca verdict).
-- ============================================================

ALTER TABLE registry_agents
  ADD COLUMN IF NOT EXISTS bio text;

-- ── Verification (run manually after applying) ────────────────────────────────
-- SELECT column_name, is_nullable, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'registry_agents' AND column_name = 'bio';
