-- SIN-1451: RLS-Test für public.learner_state. In psql auf einer Staging-/lokalen Datenbank mit ON_ERROR_STOP=1
-- ausführen, nach der Migration 20261102010000_sin1451_learner_state.sql. Rollt immer zurück.
-- Prüft: Konto B sieht und ändert nichts von Konto A, kann nicht als A schreiben, anon hat keinen Zugriff.
begin;

insert into auth.users (id, aud, role, email)
values ('00000000-0000-0000-0000-0000000014a1', 'authenticated', 'authenticated', 'sin1451-a@example.invalid'),
       ('00000000-0000-0000-0000-0000000014b1', 'authenticated', 'authenticated', 'sin1451-b@example.invalid');

-- Konto A schreibt seine Zeile.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000014a1","role":"authenticated"}', true);
insert into public.learner_state (user_id, events)
values ('00000000-0000-0000-0000-0000000014a1', '[{"at":"2026-11-02T10:00:00Z","day":"2026-11-02","kind":"unit","unitId":"u1"}]');
do $$ begin
  if (select count(*) from public.learner_state) <> 1 then raise exception 'A sieht seine Zeile nicht'; end if;
end $$;

-- Konto B sieht nichts, ändert nichts, kann nicht als A einfügen.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000014b1","role":"authenticated"}', true);
do $$
declare n integer;
begin
  if (select count(*) from public.learner_state) <> 0 then raise exception 'B sieht Zeilen von A'; end if;
  update public.learner_state set events = '[]'::jsonb where user_id = '00000000-0000-0000-0000-0000000014a1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B ändert Zeile von A'; end if;
  begin
    insert into public.learner_state (user_id) values ('00000000-0000-0000-0000-0000000014a1');
    raise exception 'B schreibt als A';
  exception when insufficient_privilege or unique_violation then null;
  end;
  begin
    delete from public.learner_state;
    raise exception 'B darf löschen';
  exception when insufficient_privilege then null;
  end;
end $$;

-- anon hat keinen Zugriff.
reset role;
set local role anon;
do $$ begin
  begin
    perform count(*) from public.learner_state;
    raise exception 'anon liest learner_state';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A hat nach allem noch seinen Stand.
reset role;
do $$ begin
  if (select jsonb_array_length(events) from public.learner_state
      where user_id = '00000000-0000-0000-0000-0000000014a1') <> 1 then
    raise exception 'Stand von A wurde verändert';
  end if;
end $$;

rollback;
