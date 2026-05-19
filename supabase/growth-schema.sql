-- Growth OS: event logging + daily metrics
-- Run once in Supabase SQL editor

-- Raw event log
create table if not exists growth_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,   -- 'scan' | 'report' | 'scan_failed' | 'api_call' | 'endpoint_call'
  wallet      text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- Pre-aggregated daily snapshot (upserted by cron or API middleware)
create table if not exists daily_metrics (
  id                    uuid primary key default gen_random_uuid(),
  date                  date not null unique,
  wallet_scans          int default 0,
  reports_generated     int default 0,
  api_calls             int default 0,
  unique_wallets        int default 0,
  luca_interactions     int default 0,
  registry_submissions  int default 0,
  verified_agents       int default 0,
  failed_scans          int default 0,
  endpoint_calls        int default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Per-call API event log
create table if not exists api_events (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null,
  key_id      uuid references api_keys(id) on delete set null,
  status_code int,
  duration_ms int,
  wallet      text,
  created_at  timestamptz default now()
);

-- Luca bot interactions
create table if not exists luca_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,  -- 'registry_push' | 'cron_run' | 'approval' | 'rejection'
  agent_name  text,
  result      text,           -- 'ok' | 'error'
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- Registry submissions + approvals
create table if not exists registry_events (
  id              uuid primary key default gen_random_uuid(),
  event_type      text not null,  -- 'submission' | 'approval' | 'rejection'
  agent_name      text,
  update_type     text,
  reviewer_notes  text,
  created_at      timestamptz default now()
);

-- Indexes
create index if not exists growth_events_type_idx      on growth_events(event_type);
create index if not exists growth_events_wallet_idx    on growth_events(wallet);
create index if not exists growth_events_created_idx   on growth_events(created_at desc);
create index if not exists daily_metrics_date_idx      on daily_metrics(date desc);
create index if not exists api_events_created_idx      on api_events(created_at desc);
create index if not exists luca_events_created_idx     on luca_events(created_at desc);
create index if not exists registry_events_created_idx on registry_events(created_at desc);

-- Auto-update updated_at on daily_metrics
create or replace function update_daily_metrics_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_metrics_updated_at on daily_metrics;
create trigger daily_metrics_updated_at
  before update on daily_metrics
  for each row execute function update_daily_metrics_updated_at();
