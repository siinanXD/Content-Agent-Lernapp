# SIN-438: Tabellenrechte härten (TRUNCATE, TRIGGER, REFERENCES)

- Issue: [SIN-438](https://linear.app/sinan-kahraman/issue/SIN-438/rechte-harten-truncate-trigger-references-auf-gruppen-tabellen-fur)
- Fund aus der Prüfung: [SIN-390](https://linear.app/sinan-kahraman/issue/SIN-390/migration-gruppe-anlegen-und-einladen-prufen-rls-und-funktionen-197)
- Migration: `supabase/migrations/20261012020000_sin438_rechte_haerten.sql` (nur hinzufügen)
- Prüfskript: `scripts/verify-table-grants.sql` (liest nur), Test `src/lib/storage/tabellenrechte.test.ts`
- Vorlagen: Gruppen-Migration [SIN-356](../../supabase/migrations/20261009010000_sin356_gruppe_einladungen.sql), Gruppen-Grundlage [SIN-277](../../supabase/migrations/20261007010000_sin277_ausbilder_demo.sql), Leitstand [SIN-303](../../supabase/migrations/20261011010000_sin303_leitstand.sql), Lernfortschritt [AP-17](../../supabase/migrations/20261003030000_ap17_course_persistence.sql)

## Entscheidung

Entzogen wird, was RLS nicht abdeckt und die App nicht braucht:

- `truncate, trigger, references` von `anon` und `authenticated` auf `trainer_groups`, `group_members`, `group_invitations`, `leitstand_nutzer`, `loop_events`, `loop_snapshot`.
- Alle Rechte von `anon` und `authenticated` auf `learning_progress`.

`SELECT` bleibt auf den Gruppen- und Leitstand-Tabellen, weil die App über den Nutzer-Client lesen (`/api/ausbilder/gruppe`, `/api/ausbilder/einladungen`) und die RLS-Policies darauf aufbauen. Schreibrechte bleiben wie bisher entzogen bzw. gar nicht vergeben.

`service_role` bleibt unverändert: Server, Backup und Leitstand schreiben darüber.

## Annahmen

- Supabase vergibt `anon` und `authenticated` standardmäßig alle Tabellenrechte auf `public`-Tabellen. Das ist aus dem Issue übernommen und in diesem Lauf nicht gegen die Supabase-Doku geprüft (Web-Zugriff nicht freigegeben). Das Prüfskript zeigt den Ist-Zustand nach der Migration.
- PostgreSQL wendet RLS nicht auf TRUNCATE, TRIGGER und REFERENCES an. Deshalb wirken die Rechte nur über `GRANT`/`REVOKE`.
- `learning_progress` hat keine Policy für `anon` oder `authenticated`. Schreiben übernimmt der Server mit der Service-Role (`supabase-store.ts`), Lesen für Ausbilder die security-definer-Funktion `ausbilder_uebersicht`. Beides braucht keine Rechte der Rolle `authenticated`.
- `demo_requests` hat schon `revoke all` für beide Rollen (SIN-277), also keine Änderung.

## Nicht geändert (bewusst)

- Die übrigen Inhaltstabellen (`courses`, `units`, `questions`, `evaluations`, …) haben dieselben Standardrechte. Sie enthalten keine Personendaten. Ob `authenticated` dort TRUNCATE behalten soll, ist eine eigene Frage für ein Folge-Issue.

## Warum

RLS schützt TRUNCATE nicht. Mit der Rolle `authenticated` könnte deshalb jemand Gruppen- oder Fortschrittsdaten leeren, obwohl die RLS-Policies stimmen. Die Migration schließt das ohne Änderung an bestehenden Migrationen, ohne Lesezugriff und ohne Schreibzugriff der App zu verändern.

## Prüfung

- `scripts/verify-table-grants.sql` im SQL-Editor oder per `psql` gegen das Projekt ausführen; es muss „ok“ melden.
- Die App-Abläufe „Gruppe anlegen“ und „Einladen“ laufen über Funktionen und SELECT; die e2e-Prüfung braucht ein echtes Supabase-Projekt.
