-- ============================================================
-- Migration: outreach_status vocabulary migration (P0 Bankr scope lock)
--
-- Replaces the legacy Title-Case CRM values with the sprint's 8-value
-- snake_case vocabulary, CHECK-enforced. Reversible: the old value is
-- preserved in outreach_status_legacy before anything is rewritten.
--
-- ── RUN THIS BEFORE APPLYING (judgment-call review) ──────────────────────────
-- 'Connected' maps to 'replied' by default. Eyeball the rows first — if a
-- conversation had progressed further, reclassify those agents to
-- 'interested' / 'manifest_requested' in the admin UI after migrating:
--
--   SELECT name, ecosystem, outreach_status, admin_notes
--   FROM registry_agents
--   WHERE outreach_status = 'Connected';
--
-- Mapping:
--   'Not started'        → 'not_contacted'
--   'In progress'        → 'dm_sent'
--   'Connected'          → 'replied'          (judgment call, see above)
--   'Manifest submitted' → 'manifest_submitted'
--   already-new values   → unchanged
--   anything else        → 'not_contacted'
-- ============================================================

-- ── 1. Backup column (fills once; safe to re-run) ─────────────────────────────

ALTER TABLE registry_agents
  ADD COLUMN IF NOT EXISTS outreach_status_legacy text;

UPDATE registry_agents
SET outreach_status_legacy = outreach_status
WHERE outreach_status_legacy IS NULL
  AND outreach_status IS NOT NULL;

-- ── 2. Rewrite to the new vocabulary ──────────────────────────────────────────

UPDATE registry_agents
SET outreach_status = CASE outreach_status
  WHEN 'Not started'        THEN 'not_contacted'
  WHEN 'In progress'        THEN 'dm_sent'
  WHEN 'Connected'          THEN 'replied'
  WHEN 'Manifest submitted' THEN 'manifest_submitted'
  WHEN 'not_contacted'      THEN 'not_contacted'
  WHEN 'dm_sent'            THEN 'dm_sent'
  WHEN 'replied'            THEN 'replied'
  WHEN 'interested'         THEN 'interested'
  WHEN 'manifest_requested' THEN 'manifest_requested'
  WHEN 'manifest_submitted' THEN 'manifest_submitted'
  WHEN 'books_live'         THEN 'books_live'
  WHEN 'shared_profile'     THEN 'shared_profile'
  ELSE 'not_contacted'
END
WHERE outreach_status IS NOT NULL;

-- ── 3. Enforce the vocabulary at the schema level ──────────────────────────────

ALTER TABLE registry_agents
  DROP CONSTRAINT IF EXISTS registry_agents_outreach_status_check;

ALTER TABLE registry_agents
  ADD CONSTRAINT registry_agents_outreach_status_check
    CHECK (outreach_status IS NULL OR outreach_status IN (
      'not_contacted',
      'dm_sent',
      'replied',
      'interested',
      'manifest_requested',
      'manifest_submitted',
      'books_live',
      'shared_profile'
    ));

-- ── Verification (run manually after applying) ────────────────────────────────
-- SELECT outreach_status, outreach_status_legacy, count(*)
--   FROM registry_agents GROUP BY 1, 2 ORDER BY 1, 2;
-- Negative test (expect CHECK violation):
--   UPDATE registry_agents SET outreach_status = 'Connected' WHERE false; -- ok
--   UPDATE registry_agents SET outreach_status = 'bogus' LIMIT 1;         -- must fail

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- ALTER TABLE registry_agents DROP CONSTRAINT IF EXISTS registry_agents_outreach_status_check;
-- UPDATE registry_agents SET outreach_status = outreach_status_legacy;
-- (keep outreach_status_legacy until the sprint's vocabulary is confirmed,
--  then drop it in a later cleanup migration)
