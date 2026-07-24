-- Backend-only financial intelligence ledger and publication model.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS economic_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  wallet_address text NOT NULL,
  chain text NOT NULL,
  tx_hash text NOT NULL,
  action_index integer NOT NULL DEFAULT 0,
  action_type text NOT NULL,
  protocol text,
  counterparty text,
  gross_amount_usd numeric NOT NULL DEFAULT 0,
  fee_amount_usd numeric NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'finalized' CHECK (status IN ('pending','finalized','reverted','quarantined')),
  reconstruction_confidence text NOT NULL DEFAULT 'deterministic' CHECK (reconstruction_confidence IN ('deterministic','high','medium','low','conflicting')),
  reason_codes text[] NOT NULL DEFAULT '{}',
  source_event_ids uuid[] NOT NULL DEFAULT '{}',
  adapter_version text NOT NULL DEFAULT 'canonical-action.v1',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain, tx_hash, agent_slug, action_index)
);

CREATE TABLE IF NOT EXISTS commercial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('task','order','invoice','subscription','api_request','marketplace_settlement','deliverable','refund','dispute')),
  external_id text,
  customer_ref text,
  service_ref text,
  currency text,
  gross_amount numeric,
  amount_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'created',
  occurred_at timestamptz NOT NULL,
  delivered_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_slug, event_type, external_id)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES economic_actions(id) ON DELETE CASCADE,
  commercial_event_id uuid NOT NULL REFERENCES commercial_events(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL CHECK (amount_usd >= 0),
  match_method text NOT NULL,
  match_confidence text NOT NULL CHECK (match_confidence IN ('deterministic','high','medium','low','conflicting')),
  status text NOT NULL DEFAULT 'matched' CHECK (status IN ('matched','partial','overpaid','refunded','disputed','conflicting')),
  evidence_basis text NOT NULL DEFAULT 'commercial_record',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (action_id, commercial_event_id)
);

CREATE TABLE IF NOT EXISTS financial_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  action_id uuid REFERENCES economic_actions(id) ON DELETE SET NULL,
  commercial_event_id uuid REFERENCES commercial_events(id) ON DELETE SET NULL,
  journal_type text NOT NULL,
  recognition_status text NOT NULL,
  recognition_date date NOT NULL,
  policy_version text NOT NULL DEFAULT 'zetta-cash-v1',
  evidence_grade text NOT NULL DEFAULT 'U' CHECK (evidence_grade IN ('A','B','C','D','U')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  reversal_of uuid REFERENCES financial_journals(id),
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz
);

CREATE TABLE IF NOT EXISTS financial_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES financial_journals(id) ON DELETE CASCADE,
  line_index integer NOT NULL,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit_usd numeric NOT NULL DEFAULT 0 CHECK (debit_usd >= 0),
  credit_usd numeric NOT NULL DEFAULT 0 CHECK (credit_usd >= 0),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE (journal_id, line_index),
  CHECK ((debit_usd > 0 AND credit_usd = 0) OR (credit_usd > 0 AND debit_usd = 0))
);

CREATE TABLE IF NOT EXISTS financial_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  action_id uuid REFERENCES economic_actions(id) ON DELETE CASCADE,
  anomaly_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','confirmed')),
  score numeric NOT NULL DEFAULT 0,
  reason_codes text[] NOT NULL DEFAULT '{}',
  evidence jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES registry_agents(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  accounting_basis text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'preliminary' CHECK (status IN ('preliminary','published','superseded','restated','withdrawn')),
  manifest_digest text,
  data_cutoffs jsonb NOT NULL DEFAULT '{}',
  policy_versions jsonb NOT NULL DEFAULT '{}',
  metrics jsonb NOT NULL,
  evidence_coverage numeric NOT NULL DEFAULT 0,
  data_completeness numeric NOT NULL DEFAULT 0,
  integrity_hash text NOT NULL,
  supersedes_snapshot_id uuid REFERENCES financial_snapshots(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (agent_slug, period_start, period_end, integrity_hash)
);

CREATE INDEX IF NOT EXISTS idx_economic_actions_agent_time ON economic_actions(agent_slug, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_events_agent_time ON commercial_events(agent_slug, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_journals_agent_date ON financial_journals(agent_slug, recognition_date DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_agent_status ON financial_anomalies(agent_slug, status, severity);
CREATE INDEX IF NOT EXISTS idx_snapshots_agent_period ON financial_snapshots(agent_slug, period_end DESC);

CREATE OR REPLACE FUNCTION assert_financial_journal_balanced(target_journal uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE debits numeric; credits numeric;
BEGIN
  SELECT COALESCE(SUM(debit_usd),0), COALESCE(SUM(credit_usd),0) INTO debits, credits
  FROM financial_journal_lines WHERE journal_id = target_journal;
  IF debits <> credits OR debits = 0 THEN
    RAISE EXCEPTION 'journal % is not balanced: debits %, credits %', target_journal, debits, credits;
  END IF;
END; $$;

ALTER TABLE economic_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_snapshots_public_read ON financial_snapshots;
CREATE POLICY financial_snapshots_public_read ON financial_snapshots FOR SELECT USING (status = 'published');
