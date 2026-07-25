-- Users table for Privy-authenticated accounts.
-- access_codes is UUID-keyed and only supports invite-code flow.
-- This table supports sign-in via Google/X through Privy.
CREATE TABLE IF NOT EXISTS public.users (
  id          text PRIMARY KEY,  -- privy:<privyId>
  email       text,
  x_handle    text,
  wallet      text,
  last_seen_at timestamptz DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage users"
  ON public.users FOR ALL
  USING (true)
  WITH CHECK (true);
