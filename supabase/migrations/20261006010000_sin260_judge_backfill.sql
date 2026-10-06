-- SIN-260: Bewertungslauf über bestehende Fragen (additiv; kein DROP/DELETE/TRUNCATE).

-- Inhalts-Hash der bewerteten Frage: nur neue oder geänderte Fragen werden erneut bewertet.
alter table public.question_evaluations
  add column if not exists content_hash text;

create or replace view public.question_quality_latest as
select distinct on (course_id, unit_id, question_id) *
from public.question_evaluations
order by course_id, unit_id, question_id, created_at desc, id desc;
alter view public.question_quality_latest set (security_invoker = true);

-- Ledger: ein Eintrag je Bewertungslauf (Kosten, Zählung, Stopp-Grund).
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
