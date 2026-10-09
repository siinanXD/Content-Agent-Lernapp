-- SIN-415: Mehrere Gruppen je Ausbilder, Archiv statt Löschen, Zugang per Einladungslink.
-- Bis auf eine Einschränkung nur hinzufügen: Entfernt wird allein die Eindeutigkeit von
-- trainer_groups.trainer_id (heute genau eine Gruppe je Ausbilder). Keine Daten werden gelöscht.
-- Schreibzugriff gibt es weiter nur über security-definer-Funktionen, die Rolle und Besitz prüfen.
-- Keine Personendaten: Organisationen tragen nur den Namen des Bildungsträgers.

-- 1. Organisation mit Kontingent (Ausbilder, Azubi-Zugänge). Pflege nur durch den Service-Role-Key.
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  trainer_quota integer not null check (trainer_quota >= 1),
  member_quota integer not null check (member_quota >= 0),
  created_at timestamptz not null default now()
);

alter table public.organisations enable row level security;
revoke all on public.organisations from anon, authenticated;

-- 2. Ausbilder einer Organisation (ein Ausbilder gehört zu höchstens einer Organisation).
create table if not exists public.organisation_trainers (
  trainer_id uuid primary key references auth.users (id) on delete restrict,
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists organisation_trainers_org_idx on public.organisation_trainers (organisation_id);

alter table public.organisation_trainers enable row level security;
revoke all on public.organisation_trainers from anon, authenticated;

-- 3. Einladungslink: ein Code = ein Ausbilder-Platz der Organisation. Einmal einlösbar.
create table if not exists public.trainer_access_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  code text not null unique check (char_length(code) between 12 and 64),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists trainer_access_links_org_idx on public.trainer_access_links (organisation_id);

alter table public.trainer_access_links enable row level security;
revoke all on public.trainer_access_links from anon, authenticated;

-- 4. Gruppen: mehrere je Ausbilder, archiviert statt gelöscht, Zuordnung zur Organisation.
alter table public.trainer_groups drop constraint if exists trainer_groups_trainer_id_key;
create index if not exists trainer_groups_trainer_id_idx on public.trainer_groups (trainer_id);

alter table public.trainer_groups add column if not exists archived_at timestamptz;
alter table public.trainer_groups
  add column if not exists organisation_id uuid references public.organisations (id) on delete restrict;

create index if not exists trainer_groups_org_idx on public.trainer_groups (organisation_id);

comment on column public.trainer_groups.archived_at is
  'Archiviert am. Archivierte Gruppen belegen keine Zugänge; jede Lese-Stelle für Lernende muss archived_at is null filtern.';

-- Belegte Azubi-Zugänge einer Organisation: Mitglieder in aktiven (nicht archivierten) Gruppen.
create or replace function public.organisation_belegt(p_organisation uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.group_members m
  join public.trainer_groups g on g.id = m.group_id
  where g.organisation_id = p_organisation and g.archived_at is null
$$;

revoke all on function public.organisation_belegt(uuid) from public, anon, authenticated;

-- Gruppe anlegen: beliebig viele je Ausbilder, Organisation wird aus dem Zugang übernommen.
create or replace function public.ausbilder_gruppe_anlegen(
  p_name text,
  p_schwerpunkt text,
  p_starts_on date default null,
  p_exam_date date default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'ausbilder' then
    raise exception 'kein Ausbilder-Zugang' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_schwerpunkt, ''))) not between 1 and 200 then
    raise exception 'ungueltige Angaben' using errcode = '22023';
  end if;
  if p_starts_on is not null and p_exam_date is not null and p_exam_date <= p_starts_on then
    raise exception 'Pruefung liegt vor dem Beginn' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.trainer_groups
    where trainer_id = auth.uid() and archived_at is null and lower(name) = lower(btrim(p_name))
  ) then
    raise exception 'Gruppe existiert bereits' using errcode = '23505';
  end if;
  insert into public.trainer_groups (trainer_id, name, schwerpunkt, starts_on, exam_date, organisation_id)
  values (
    auth.uid(), btrim(p_name), btrim(p_schwerpunkt), p_starts_on, p_exam_date,
    (select t.organisation_id from public.organisation_trainers t where t.trainer_id = auth.uid())
  )
  returning id into v_id;
  return v_id;
end
$$;

-- Einladung für eine bestimmte, aktive Gruppe. Prüft Obergrenze (100) und Kontingent der Organisation.
create or replace function public.ausbilder_einladung_erzeugen(p_group_id uuid, p_display_name text)
returns table (member_id uuid, display_name text, code text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_found boolean;
  v_member uuid;
  v_name text := btrim(coalesce(p_display_name, ''));
  v_code text;
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'ausbilder' then
    raise exception 'kein Ausbilder-Zugang' using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 60 or position('@' in v_name) > 0 then
    raise exception 'ungueltiger Name' using errcode = '22023';
  end if;
  select g.organisation_id, true into v_org, v_found
  from public.trainer_groups g
  where g.id = p_group_id and g.trainer_id = auth.uid() and g.archived_at is null;
  if v_found is null then
    raise exception 'keine Gruppe' using errcode = 'P0002';
  end if;
  if (select count(*) from public.group_members m where m.group_id = p_group_id) >= 100 then
    raise exception 'Gruppe ist voll' using errcode = '54000';
  end if;
  if v_org is not null and public.organisation_belegt(v_org) >=
     (select o.member_quota from public.organisations o where o.id = v_org) then
    raise exception 'keine Zugaenge frei' using errcode = '54001';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.group_members (group_id, display_name) values (p_group_id, v_name)
  returning id into v_member;
  insert into public.group_invitations (group_id, member_id, code) values (p_group_id, v_member, v_code);
  return query select v_member, v_name, v_code;
end
$$;

-- Alte Form ohne Gruppe bleibt für bestehende Aufrufer: gilt nur, wenn genau eine aktive Gruppe existiert.
create or replace function public.ausbilder_einladung_erzeugen(p_display_name text)
returns table (member_id uuid, display_name text, code text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'ausbilder' then
    raise exception 'kein Ausbilder-Zugang' using errcode = '42501';
  end if;
  select array_agg(g.id) into v_ids
  from public.trainer_groups g where g.trainer_id = auth.uid() and g.archived_at is null;
  if coalesce(array_length(v_ids, 1), 0) <> 1 then
    raise exception 'keine Gruppe' using errcode = 'P0002';
  end if;
  return query select * from public.ausbilder_einladung_erzeugen(v_ids[1], p_display_name);
end
$$;

-- Meine Gruppen (aktiv und archiviert) mit Teilnehmenden und durchschnittlichem Fortschritt.
create or replace function public.ausbilder_gruppen()
returns table (
  group_id uuid,
  name text,
  schwerpunkt text,
  starts_on date,
  exam_date date,
  archived_at timestamptz,
  member_count integer,
  avg_percent integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id, g.name, g.schwerpunkt, g.starts_on, g.exam_date, g.archived_at,
    (select count(*) from public.group_members m where m.group_id = g.id)::integer,
    coalesce((
      select round(avg(s.p))::integer
      from (
        select least(100, round(100.0 * coalesce((
          select count(distinct lp.question_id)
          from public.learning_progress lp
          where lp.anonymous_id = m.anonymous_id and lp.correct
        ), 0) / greatest((select count(*) from public.questions q where q.course_id = g.course_id), 1))) as p
        from public.group_members m
        where m.group_id = g.id
      ) s
    ), 0)::integer
  from public.trainer_groups g
  where g.trainer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ausbilder'
  order by g.created_at desc
$$;

-- Übersicht einer bestimmten Gruppe (auch archiviert: Fortschritt bleibt lesbar).
create or replace function public.ausbilder_uebersicht(p_group_id uuid)
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
    where g.id = p_group_id
      and g.trainer_id = auth.uid()
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

-- Zugänge der eigenen Organisation: „x von y vergeben“. Keine Zeile, wenn keine Organisation besteht.
create or replace function public.ausbilder_zugaenge()
returns table (
  organisation text,
  trainer_quota integer,
  member_quota integer,
  members_used integer,
  active_groups integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.name, o.trainer_quota, o.member_quota,
    public.organisation_belegt(o.id),
    (select count(*) from public.trainer_groups g
      where g.organisation_id = o.id and g.trainer_id = auth.uid() and g.archived_at is null)::integer
  from public.organisation_trainers t
  join public.organisations o on o.id = t.organisation_id
  where t.trainer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ausbilder'
$$;

-- Archivieren: Gruppe bleibt samt Fortschritt erhalten, belegt aber keine Zugänge mehr.
create or replace function public.ausbilder_gruppe_archivieren(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'ausbilder' then
    raise exception 'kein Ausbilder-Zugang' using errcode = '42501';
  end if;
  update public.trainer_groups set archived_at = now()
  where id = p_group_id and trainer_id = auth.uid() and archived_at is null;
  if not found then
    raise exception 'keine Gruppe' using errcode = 'P0002';
  end if;
end
$$;

-- Wiederherstellen: nur, solange die Zugänge der Organisation für alle Mitglieder reichen.
create or replace function public.ausbilder_gruppe_wiederherstellen(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_found boolean;
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'ausbilder' then
    raise exception 'kein Ausbilder-Zugang' using errcode = '42501';
  end if;
  select g.organisation_id, true into v_org, v_found
  from public.trainer_groups g
  where g.id = p_group_id and g.trainer_id = auth.uid() and g.archived_at is not null
  for update;
  if v_found is null then
    raise exception 'keine Gruppe' using errcode = 'P0002';
  end if;
  if v_org is not null and
     public.organisation_belegt(v_org)
       + (select count(*) from public.group_members m where m.group_id = p_group_id)
       > (select o.member_quota from public.organisations o where o.id = v_org) then
    raise exception 'keine Zugaenge frei' using errcode = '54001';
  end if;
  update public.trainer_groups set archived_at = null where id = p_group_id;
end
$$;

-- Einladungslink einlösen (nur Service-Role-Key, aufgerufen von /api/ausbilder/zugang).
-- Prüfen: Link offen? Zeigt Organisation und Kontingent, ohne etwas zu verändern.
create or replace function public.zugang_pruefen(p_code text)
returns table (organisation text, trainer_quota integer, member_quota integer)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, o.trainer_quota, o.member_quota
  from public.trainer_access_links l
  join public.organisations o on o.id = l.organisation_id
  where l.code = btrim(p_code) and l.redeemed_at is null
    and (l.expires_at is null or l.expires_at > now())
$$;

-- Reservieren: genau ein Aufruf bekommt den Platz (atomar), solange das Ausbilder-Kontingent reicht.
create or replace function public.zugang_reservieren(p_code text)
returns table (organisation_id uuid, organisation text)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    update public.trainer_access_links l
    set redeemed_at = now()
    from public.organisations o
    where o.id = l.organisation_id
      and l.code = btrim(p_code)
      and l.redeemed_at is null
      and (l.expires_at is null or l.expires_at > now())
      and (select count(*) from public.trainer_access_links x
           where x.organisation_id = l.organisation_id and x.redeemed_at is not null) < o.trainer_quota
    returning l.organisation_id as org_id, o.name as org_name
  )
  select c.org_id, c.org_name from claimed c;
end
$$;

-- Freigeben, wenn nach dem Reservieren etwas schiefging (Konto nicht angelegt).
create or replace function public.zugang_freigeben(p_code text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.trainer_access_links set redeemed_at = null
  where code = btrim(p_code) and redeemed_by is null
$$;

-- Zuordnen: das neue Konto gehört ab jetzt zur Organisation.
create or replace function public.zugang_zuordnen(p_code text, p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  update public.trainer_access_links set redeemed_by = p_user
  where code = btrim(p_code) and redeemed_at is not null and redeemed_by is null
  returning organisation_id into v_org;
  if v_org is null then
    raise exception 'Link nicht reserviert' using errcode = 'P0002';
  end if;
  insert into public.organisation_trainers (trainer_id, organisation_id)
  values (p_user, v_org)
  on conflict (trainer_id) do nothing;
end
$$;

revoke all on function public.ausbilder_einladung_erzeugen(uuid, text) from public, anon;
revoke all on function public.ausbilder_einladung_erzeugen(text) from public, anon;
revoke all on function public.ausbilder_gruppe_anlegen(text, text, date, date) from public, anon;
revoke all on function public.ausbilder_gruppen() from public, anon;
revoke all on function public.ausbilder_uebersicht(uuid) from public, anon;
revoke all on function public.ausbilder_zugaenge() from public, anon;
revoke all on function public.ausbilder_gruppe_archivieren(uuid) from public, anon;
revoke all on function public.ausbilder_gruppe_wiederherstellen(uuid) from public, anon;
grant execute on function public.ausbilder_einladung_erzeugen(uuid, text) to authenticated;
grant execute on function public.ausbilder_einladung_erzeugen(text) to authenticated;
grant execute on function public.ausbilder_gruppe_anlegen(text, text, date, date) to authenticated;
grant execute on function public.ausbilder_gruppen() to authenticated;
grant execute on function public.ausbilder_uebersicht(uuid) to authenticated;
grant execute on function public.ausbilder_zugaenge() to authenticated;
grant execute on function public.ausbilder_gruppe_archivieren(uuid) to authenticated;
grant execute on function public.ausbilder_gruppe_wiederherstellen(uuid) to authenticated;

revoke all on function public.zugang_pruefen(text) from public, anon, authenticated;
revoke all on function public.zugang_reservieren(text) from public, anon, authenticated;
revoke all on function public.zugang_freigeben(text) from public, anon, authenticated;
revoke all on function public.zugang_zuordnen(text, uuid) from public, anon, authenticated;
grant execute on function public.zugang_pruefen(text) to service_role;
grant execute on function public.zugang_reservieren(text) to service_role;
grant execute on function public.zugang_freigeben(text) to service_role;
grant execute on function public.zugang_zuordnen(text, uuid) to service_role;

notify pgrst, 'reload schema';
