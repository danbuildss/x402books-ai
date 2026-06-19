-- Learning loop for Luca X replies.
--
-- luca_pending_replies: add question + posted_at columns
-- luca_reply_examples:  approved (question → reply) pairs for few-shot prompting

alter table luca_pending_replies add column if not exists question  text;
alter table luca_pending_replies add column if not exists posted_at timestamptz;

-- Approved reply examples — injected as few-shot context into future Claude prompts.
create table if not exists luca_reply_examples (
  id         uuid        primary key default gen_random_uuid(),
  question   text        not null,
  reply      text        not null,
  tier       text        not null default 'fast_read', -- fast_read | analyst_read | full_report
  source_id  uuid        references luca_pending_replies(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Speed up tier-filtered lookups (used by generateDraft)
create index if not exists luca_reply_examples_tier_created
  on luca_reply_examples (tier, created_at desc);
