-- AEON Financial Review — 2026-06-23
-- Emergency fix: suppress $3.4M stale figure while correct numbers are verified.
--
-- Step 1: Clear stale AEON books cache (pre-fix data with wrong wallet set)
delete from agent_books_cache where agent_slug = 'aeon';

-- Verify cache is cleared:
select count(*) as remaining_cache_rows from agent_books_cache where agent_slug = 'aeon';
-- Expected: 0

-- Step 2: Mark AEON as "financials under review"
-- This immediately suppresses AEON from GDP, leaderboard, and API responses.
-- Remove this row once AEON revenue is verified correct.
insert into agent_confidence_labels
  (agent_slug, confidence_level, public_note, internal_reason, reviewed_by, reviewed_at)
values (
  'aeon',
  'under_review',
  'Financial figures are being verified with the AEON team. Updated numbers will be published once wallet attribution and transaction classification are confirmed.',
  'AEON team reports $3.4M figure is incorrect. Root cause: stale cache computed before wallet eligibility fix (PR #125). Recomputing with 2 operator EOA wallets only.',
  'admin',
  now()
)
on conflict (agent_slug) do update set
  confidence_level = excluded.confidence_level,
  public_note      = excluded.public_note,
  internal_reason  = excluded.internal_reason,
  reviewed_at      = excluded.reviewed_at;

-- Verify label is set:
select agent_slug, confidence_level, public_note from agent_confidence_labels where agent_slug = 'aeon';

-- After AEON revenue is verified correct, lift the review flag with:
-- update agent_confidence_labels set confidence_level = 'medium', public_note = null where agent_slug = 'aeon';
-- Or delete it: delete from agent_confidence_labels where agent_slug = 'aeon';
