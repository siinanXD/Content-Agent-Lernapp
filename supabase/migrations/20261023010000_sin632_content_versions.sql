-- SIN-632: Versionen für Einheiten und Fragen (additive only; no DROP/TRUNCATE/DELETE).
-- Jede Änderung an units/questions schreibt per Trigger eine Zeile in content_versions (alter und neuer Stand).
-- Rücksetzen: scripts/inhalte-zuruecksetzen.ts, Notfallplan docs/ops/NOTFALL.md.

create table if not exists public.content_versions (
  id bigint generated always as identity primary key,
  tabelle text not null check (tabelle in ('units', 'questions')),
  aktion text not null check (aktion in ('insert', 'update', 'delete')),
  course_id uuid not null,
  unit_id text not null,
  question_id text,
  alt jsonb,
  neu jsonb,
  grund text not null default 'ohne Angabe',
  issue text,
  run_id text,
  created_at timestamptz not null default now()
);

create index if not exists content_versions_einheit_idx on public.content_versions (course_id, unit_id, id);
create index if not exists content_versions_run_idx on public.content_versions (run_id) where run_id is not null;

-- Angabe zum nächsten Schreiben (Grund, Issue, Lauf). Eine Zeile; gilt 10 Minuten, weil PostgREST keine Sitzung hält.
create table if not exists public.content_version_kontext (
  id boolean primary key default true check (id),
  grund text not null,
  issue text,
  run_id text,
  gueltig_bis timestamptz not null
);

create or replace function public.content_version_schreiben() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k public.content_version_kontext%rowtype;
  alt_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  neu_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  zeile jsonb := coalesce(neu_row, alt_row);
begin
  select * into k from public.content_version_kontext where gueltig_bis > now();
  insert into public.content_versions (tabelle, aktion, course_id, unit_id, question_id, alt, neu, grund, issue, run_id)
  values (
    tg_table_name, lower(tg_op), (zeile ->> 'course_id')::uuid,
    case when tg_table_name = 'units' then zeile ->> 'id' else zeile ->> 'unit_id' end,
    case when tg_table_name = 'questions' then zeile ->> 'id' end,
    alt_row, neu_row, coalesce(k.grund, 'ohne Angabe'), k.issue, k.run_id
  );
  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'units_version') then
    create trigger units_version after insert or delete on public.units
      for each row execute function public.content_version_schreiben();
    create trigger units_version_update after update on public.units
      for each row when (old.* is distinct from new.*) execute function public.content_version_schreiben();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'questions_version') then
    create trigger questions_version after insert or delete on public.questions
      for each row execute function public.content_version_schreiben();
    create trigger questions_version_update after update on public.questions
      for each row when (old.* is distinct from new.*) execute function public.content_version_schreiben();
  end if;
end $$;

-- Wie die anderen Tabellen: RLS an, keine Policies → nur Service-Role.
alter table public.content_versions enable row level security;
alter table public.content_version_kontext enable row level security;
revoke all on public.content_versions, public.content_version_kontext from anon, authenticated;

notify pgrst, 'reload schema';
