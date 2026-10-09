-- SIN-438: Rechte härten (nur hinzufügen, bestehende Migrationen bleiben unverändert).
-- RLS gilt nicht für TRUNCATE, TRIGGER und REFERENCES. Supabase gibt sie anon und authenticated
-- standardmäßig. Entzogen wird nur, was die App nicht braucht; Lesen und Schreiben bleiben wie
-- bisher (RLS-Policies, security-definer-Funktionen, Service-Role auf dem Server).

-- Gruppen (Screen 19/20) und Leitstand: Lesen bleibt für die RLS-Policies erhalten.
revoke truncate, trigger, references on
  public.trainer_groups,
  public.group_members,
  public.group_invitations,
  public.leitstand_nutzer,
  public.loop_events,
  public.loop_snapshot
from anon, authenticated;

-- Fortschritt je Lernendem: kein Policy für anon oder authenticated. Schreiben und Lesen laufen über
-- den Server (Service-Role) und die Funktion ausbilder_uebersicht (security definer). Deshalb ganz entziehen.
revoke all on public.learning_progress from anon, authenticated;
