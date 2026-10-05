-- AP-19 / SIN-216: per-question judge scores, append-only (additive only; no DROP/TRUNCATE/DELETE).
-- public.evaluations stays as the per-course summary.

create table if not exists public.question_evaluations (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  unit_id text not null,
  course_id uuid not null references public.courses (id) on delete restrict,
  run_id text not null,
  judge_model text not null,
  prompt_version text not null,
  quellentreue smallint not null check (quellentreue in (0, 1)),
  eindeutigkeit smallint not null check (eindeutigkeit in (0, 1)),
  niveau numeric(2, 1) not null check (niveau between 1 and 5),
  sprache numeric(2, 1) not null check (sprache between 1 and 5),
  sicherheit_flag boolean not null default false,
  passed boolean not null,
  reason text,
  langfuse_trace_id text,
  created_at timestamptz not null default now()
);

create index if not exists question_evaluations_question_id_idx
  on public.question_evaluations (question_id);
create index if not exists question_evaluations_run_id_idx
  on public.question_evaluations (run_id);
create index if not exists question_evaluations_course_id_idx
  on public.question_evaluations (course_id);

-- Latest judge result per question.
create or replace view public.question_quality_latest as
select distinct on (course_id, unit_id, question_id) *
from public.question_evaluations
order by course_id, unit_id, question_id, created_at desc, id desc;

-- Same RLS posture as the other tables: no anon/authenticated policies → deny by default.
alter table public.question_evaluations enable row level security;
-- The view must not bypass the caller's RLS.
alter view public.question_quality_latest set (security_invoker = true);
