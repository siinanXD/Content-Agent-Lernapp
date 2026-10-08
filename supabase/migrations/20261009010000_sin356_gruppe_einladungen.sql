-- SIN-356: Gruppe anlegen und Teilnehmende einladen (nur hinzufügen).
-- Schreibzugriff gibt es weiter nur über security-definer-Funktionen, die Rolle und Gruppe des
-- aufrufenden Ausbilders prüfen. Kein Service-Role-Key im Weg. Keine Personendaten außer dem vom
-- Ausbilder vergebenen Anzeigenamen (Vorname + Initial), keine E-Mail.

-- Eine Einladung gehört zu genau einem Mitglied (Platz in der Gruppe) und trägt einen Beitrittscode.
create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trainer_groups (id) on delete restrict,
  member_id uuid not null unique references public.group_members (id) on delete restrict,
  code text not null unique check (code ~ '^[A-Z0-9]{10}$'),
  created_at timestamptz not null default now()
);

create index if not exists group_invitations_group_id_idx on public.group_invitations (group_id);

alter table public.group_invitations enable row level security;

create policy group_invitations_select_own on public.group_invitations
  for select to authenticated
  using (
    exists (
      select 1 from public.trainer_groups g
      where g.id = group_invitations.group_id
        and g.trainer_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ausbilder'
    )
  );

revoke all on public.group_invitations from anon;
revoke insert, update, delete on public.group_invitations from authenticated;

-- Gruppe anlegen: höchstens eine je Ausbilder (unique trainer_id).
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
  if exists (select 1 from public.trainer_groups where trainer_id = auth.uid()) then
    raise exception 'Gruppe existiert bereits' using errcode = '23505';
  end if;
  insert into public.trainer_groups (trainer_id, name, schwerpunkt, starts_on, exam_date)
  values (auth.uid(), btrim(p_name), btrim(p_schwerpunkt), p_starts_on, p_exam_date)
  returning id into v_id;
  return v_id;
end
$$;

-- Einladung erzeugen: legt den Platz in der Gruppe und den Beitrittscode an (höchstens 100 je Gruppe).
create or replace function public.ausbilder_einladung_erzeugen(p_display_name text)
returns table (member_id uuid, display_name text, code text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_group uuid;
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
  select g.id into v_group from public.trainer_groups g where g.trainer_id = auth.uid();
  if v_group is null then
    raise exception 'keine Gruppe' using errcode = 'P0002';
  end if;
  if (select count(*) from public.group_members m where m.group_id = v_group) >= 100 then
    raise exception 'Gruppe ist voll' using errcode = '54000';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.group_members (group_id, display_name) values (v_group, v_name)
  returning id into v_member;
  insert into public.group_invitations (group_id, member_id, code) values (v_group, v_member, v_code);
  return query select v_member, v_name, v_code;
end
$$;

revoke all on function public.ausbilder_gruppe_anlegen(text, text, date, date) from public, anon;
revoke all on function public.ausbilder_einladung_erzeugen(text) from public, anon;
grant execute on function public.ausbilder_gruppe_anlegen(text, text, date, date) to authenticated;
grant execute on function public.ausbilder_einladung_erzeugen(text) to authenticated;

notify pgrst, 'reload schema';
