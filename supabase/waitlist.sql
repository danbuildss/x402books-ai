create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  x_handle text,
  use_case text,
  pain_point text,
  source text not null default 'landing_page',
  created_at timestamptz not null default now()
);
