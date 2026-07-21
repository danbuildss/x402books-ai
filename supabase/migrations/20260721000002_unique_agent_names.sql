-- ============================================================
-- Migration: unique agent names (case-insensitive)
--
-- Duplicate agents (zer0, wake + others) have been manually
-- deduped before; this constraint makes recurrence impossible.
--
-- Safety: the DO block checks for existing duplicates FIRST and
-- aborts with a readable list if any are found — the constraint
-- is only created on a clean table. Nothing is deleted here.
--
-- If it aborts, dedupe manually before re-running:
--   1. List duplicates:
--        SELECT lower(name), array_agg(id::text), array_agg(name)
--        FROM registry_agents GROUP BY lower(name) HAVING COUNT(*) > 1;
--   2. For each group, pick the keeper (most metadata / oldest),
--      repoint wallets: UPDATE registry_agent_wallets
--        SET agent_name = '<keeper>' WHERE agent_name = '<dupe>';
--      (ON CONFLICT? delete the dupe wallet row instead)
--   3. DELETE FROM registry_agents WHERE id = '<dupe id>';
--   4. Re-run this migration.
-- ============================================================

DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(dup.name_lower || ' (x' || dup.cnt || ')', ', ')
  INTO dupes
  FROM (
    SELECT lower(name) AS name_lower, COUNT(*) AS cnt
    FROM registry_agents
    GROUP BY lower(name)
    HAVING COUNT(*) > 1
  ) dup;

  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot add unique constraint: duplicate agent names exist — %. Dedupe first (see migration header for the plan), then re-run.',
      dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_registry_agents_lower_name
  ON registry_agents (lower(name));

-- ── Verification ─────────────────────────────────────────────
-- SELECT indexname FROM pg_indexes WHERE indexname = 'uq_registry_agents_lower_name';
-- Then attempt a duplicate insert — it must fail:
--   INSERT INTO registry_agents (name, ecosystem) SELECT name, ecosystem FROM registry_agents LIMIT 1;
--   (expect: duplicate key value violates unique constraint)
