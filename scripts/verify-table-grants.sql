-- SIN-438: prüft die Tabellenrechte nach Migration 20261012020000. Liest nur, ändert nichts.
-- Ausführen im SQL-Editor des Supabase-Projekts oder: psql "$SUPABASE_DB_URL" -f scripts/verify-table-grants.sql
-- Bricht mit Fehler ab, wenn anon oder authenticated noch TRUNCATE, TRIGGER oder REFERENCES haben.
-- Gruppen- und Leitstand-Tabellen behalten SELECT (RLS-Policies); learning_progress hat gar nichts.

do $$
declare
  t text;
  r text;
  p text;
  problems text[] := '{}';
begin
  foreach t in array array['trainer_groups', 'group_members', 'group_invitations', 'leitstand_nutzer', 'loop_events', 'loop_snapshot'] loop
    foreach r in array array['anon', 'authenticated'] loop
      foreach p in array array['TRUNCATE', 'TRIGGER', 'REFERENCES'] loop
        if has_table_privilege(r, 'public.' || t, p) then
          problems := problems || format('%s hat %s auf %s', r, p, t);
        end if;
      end loop;
    end loop;
    if not has_table_privilege('authenticated', 'public.' || t, 'SELECT') then
      problems := problems || format('authenticated hat kein SELECT auf %s (RLS-Policy bräuchte es)', t);
    end if;
  end loop;

  foreach r in array array['anon', 'authenticated'] loop
    foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'] loop
      if has_table_privilege(r, 'public.learning_progress', p) then
        problems := problems || format('%s hat %s auf learning_progress', r, p);
      end if;
    end loop;
  end loop;

  if array_length(problems, 1) is null then
    raise notice 'SIN-438 Rechte: ok';
  else
    raise exception 'SIN-438 Rechte offen: %', array_to_string(problems, '; ');
  end if;
end
$$;
