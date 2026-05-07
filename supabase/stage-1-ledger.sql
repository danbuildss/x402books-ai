create table if not exists public.wallets (
  address text primary key,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id bigserial primary key,
  wallet_address text not null references public.wallets(address) on delete cascade,
  tx_hash text not null,
  timestamp timestamptz not null,
  direction text not null check (direction in ('income', 'expense', 'internal')),
  counterparty text not null,
  amount_usdc numeric not null,
  category text not null default 'unknown',
  confidence_score integer not null default 0,
  memo text,
  is_likely_x402 boolean not null default false,
  risk_flag text not null default 'none',
  created_at timestamptz not null default now(),
  unique (wallet_address, tx_hash, counterparty, amount_usdc)
);

create index if not exists transactions_wallet_timestamp_idx
  on public.transactions(wallet_address, timestamp desc);

create table if not exists public.reports (
  id bigserial primary key,
  wallet_address text not null references public.wallets(address) on delete cascade,
  period text not null,
  title text not null,
  summary jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_wallet_created_idx
  on public.reports(wallet_address, created_at desc);
