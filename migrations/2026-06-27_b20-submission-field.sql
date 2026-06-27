-- Add optional B20 token address field to agent_submissions.
-- Stores the address as-is for manual admin review.
-- Does NOT automatically set isB20Token or trigger any indexing.

ALTER TABLE agent_submissions
  ADD COLUMN IF NOT EXISTS b20_token_address text;

COMMENT ON COLUMN agent_submissions.b20_token_address IS
  'Optional B20 token address submitted by the agent team. Must start with 0xB200 to be considered a real B20 token. Requires manual admin review and verification before any indexing. Never auto-activated.';
