-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  x_handle text,
  use_case text,
  pain_point text,
  referral_code text unique,
  referred_by text,
  source text not null default 'landing_page',
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups
  add column if not exists referral_code text unique,
  add column if not exists referred_by text;
