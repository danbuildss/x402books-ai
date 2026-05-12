-- ============================================================
-- x402Books AI — Supabase migrations
-- Run these in order in the Supabase SQL editor
-- ============================================================

-- 1. Add wallet column to access_codes (persistent wallet per session)
ALTER TABLE access_codes
  ADD COLUMN IF NOT EXISTS wallet text;

-- 2. Users table — stores Privy-authenticated users (email + X handle)
CREATE TABLE IF NOT EXISTS users (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  privy_user_id   text        UNIQUE NOT NULL,
  email           text,
  x_handle        text,
  wallet          text,
  created_at      timestamptz DEFAULT now(),
  last_seen_at    timestamptz DEFAULT now()
);

-- Index for fast lookup by privy_user_id
CREATE INDEX IF NOT EXISTS users_privy_user_id_idx ON users (privy_user_id);

-- Index for email lookup (sign-in flow)
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
