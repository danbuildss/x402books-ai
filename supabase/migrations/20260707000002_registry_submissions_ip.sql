-- Add submitter_ip to registry_submissions for cross-instance rate limiting.
ALTER TABLE registry_submissions
  ADD COLUMN IF NOT EXISTS submitter_ip text;
