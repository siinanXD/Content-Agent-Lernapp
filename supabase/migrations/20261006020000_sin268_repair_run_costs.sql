-- SIN-268: Reparatur nach doppeltem Zeitstempel 20261006010000 (sin258_pipeline_run_costs und sin260_judge_backfill).
-- Die Supabase-Migrationstabelle führt die Version als Primärschlüssel; bei zwei Dateien mit gleicher Version
-- wird nur eine angewendet. Diese Migration holt beide Inhalte idempotent nach (additiv; kein DROP/DELETE/TRUNCATE).
-- Bestehende Migrationen bleiben unverändert.

-- Aus 20261006010000_sin258_pipeline_run_costs.sql
create table if not exists public.pipeline_run_costs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  course_id text not null,
  kind text not null,
  claude_input_tokens bigint not null default 0,
  claude_output_tokens bigint not null default 0,
  claude_cache_creation_tokens bigint not null default 0,
  claude_cache_read_tokens bigint not null default 0,
  openai_input_tokens bigint not null default 0,
  openai_output_tokens bigint not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  cost_eur numeric(10, 2) not null default 0,
  cap_eur numeric(10, 2) not null,
  stopped boolean not null default false,
  stop_reason text,
  langfuse_trace_id text,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_run_costs_run_id_idx on public.pipeline_run_costs (run_id);
create index if not exists pipeline_run_costs_created_at_idx on public.pipeline_run_costs (created_at desc);
alter table public.pipeline_run_costs enable row level security;

-- Aus 20261006010000_sin260_judge_backfill.sql
alter table public.question_evaluations
  add column if not exists content_hash text;

create or replace view public.question_quality_latest as
select distinct on (course_id, unit_id, question_id) *
from public.question_evaluations
order by course_id, unit_id, question_id, created_at desc, id desc;
alter view public.question_quality_latest set (security_invoker = true);

create table if not exists public.judge_runs (
  run_id text primary key,
  judge_model text not null,
  prompt_version text not null,
  questions_total integer not null check (questions_total >= 0),
  questions_judged integer not null check (questions_judged >= 0),
  questions_passed integer not null check (questions_passed >= 0),
  openai_input_tokens integer not null default 0,
  openai_output_tokens integer not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  cost_eur numeric(10, 2) not null default 0,
  stopped boolean not null default false,
  stop_reason text,
  created_at timestamptz not null default now()
);
alter table public.judge_runs enable row level security;

-- PostgREST lädt das Schema neu, damit die Tabellen sofort sichtbar sind (PGRST205).
notify pgrst, 'reload schema';
