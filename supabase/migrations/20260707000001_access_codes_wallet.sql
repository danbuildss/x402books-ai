-- Add wallet column to access_codes so users can link their wallet from the dashboard.
ALTER TABLE access_codes
  ADD COLUMN IF NOT EXISTS wallet text;
