-- SIN-277: Demo-Anfragen und Gruppenübersicht für Ausbilder (additive only).
-- Keine Personendaten von Lernenden: Mitglieder tragen nur einen Anzeigenamen (Vorname + Initial,
-- vom Ausbilder vergeben) und die zufällige anonymous_id aus learning_progress.
-- Rolle „Ausbilder“: app_metadata.role = 'ausbilder' (nur serverseitig setzbar, nicht durch Nutzer).

-- Demo-Zugang anfragen (Screen 20). Einwilligung ist Pflicht und wird mit Zeitpunkt gespeichert.
-- Kein Zugriff für anon/authenticated: nur die API-Route schreibt mit dem Service-Role-Key.
create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  organisation text not null check (char_length(organisation) between 1 and 200),
  contact_name text not null check (char_length(contact_name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 254),
  participants integer not null check (participants between 1 and 500),
  schwerpunkt text not null check (char_length(schwerpunkt) between 1 and 200),
  consent boolean not null check (consent),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.demo_requests enable row level security;
revoke all on public.demo_requests from anon, authenticated;

-- Eine Gruppe je Ausbilder (Screen 19).
create table if not exists public.trainer_groups (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null unique references auth.users (id) on delete restrict,
  name text not null,
  schwerpunkt text not null,
  course_id uuid references public.courses (id) on delete restrict,
  starts_on date,
  exam_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trainer_groups (id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 60),
  anonymous_id uuid unique,
  created_at timestamptz not null default now()
);

create index if not exists group_members_group_id_idx on public.group_members (group_id);

comment on column public.group_members.anonymous_id is
  'Zufalls-Kennung aus learning_progress; verknüpft Fortschritt, nie Name oder E-Mail.';

alter table public.trainer_groups enable row level security;
alter table public.group_members enable row level security;

-- RLS: Ausbilder sehen nur die eigene Gruppe und deren Mitglieder. Nur Lesen, kein Schreibzugriff.
create policy trainer_groups_select_own on public.trainer_groups
  for select to authenticated
  using (
    trainer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ausbilder'
  );

create policy group_members_select_own on public.group_members
  for select to authenticated
  using (
    exists (
      select 1 from public.trainer_groups g
      where g.id = group_members.group_id
        and g.trainer_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ausbilder'
    )
  );

revoke all on public.trainer_groups, public.group_members from anon;
revoke insert, update, delete on public.trainer_groups, public.group_members from authenticated;

-- Fortschritt je Mitglied: Anteil der richtig beantworteten Fragen des Gruppenkurses.
-- learning_progress ist für Nutzer gesperrt; die Funktion liefert nur Zeilen der eigenen Gruppe.
create or replace function public.ausbilder_uebersicht()
returns table (
  member_id uuid,
  display_name text,
  progress_percent integer,
  last_active_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with grp as (
    select g.id, g.course_id
    from public.trainer_groups g
    where g.trainer_id = auth.uid()
      and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ausbilder'
  ),
  total as (
    select greatest(count(*), 1) as n
    from public.questions q
    join grp on q.course_id = grp.course_id
  )
  select
    m.id,
    m.display_name,
    least(100, round(100.0 * coalesce((
      select count(distinct lp.question_id)
      from public.learning_progress lp
      where lp.anonymous_id = m.anonymous_id and lp.correct
    ), 0) / (select n from total)))::integer,
    (select max(lp.created_at) from public.learning_progress lp where lp.anonymous_id = m.anonymous_id)
  from public.group_members m
  join grp on grp.id = m.group_id
  order by m.display_name
$$;

revoke all on function public.ausbilder_uebersicht() from public, anon;
grant execute on function public.ausbilder_uebersicht() to authenticated;
