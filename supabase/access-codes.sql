create extension if not exists pgcrypto;

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text,
  max_uses integer,
  use_count integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null references public.access_codes(id) on delete cascade,
  email text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;

drop policy if exists "Service role can manage access codes" on public.access_codes;
create policy "Service role can manage access codes"
  on public.access_codes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage access redemptions" on public.access_code_redemptions;
create policy "Service role can manage access redemptions"
  on public.access_code_redemptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists access_codes_code_hash_idx on public.access_codes(code_hash);
create index if not exists access_code_redemptions_code_id_idx
  on public.access_code_redemptions(access_code_id);

-- Generate code_hash locally with:
-- node -e "const crypto=require('crypto'); const salt='YOUR_ACCESS_CODE_SALT'; const code='XBOOKS-BETA-001'; console.log(crypto.createHash('sha256').update(`${salt}:${code.trim().replace(/\\s+/g,'').toUpperCase()}`).digest('hex'))"
--
-- Then insert it:
-- insert into public.access_codes (code_hash, label, max_uses)
-- values ('PASTE_HASH_HERE', 'Founding beta', 25);

