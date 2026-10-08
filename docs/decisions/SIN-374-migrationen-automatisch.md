# SIN-374 — Migrationen kommen nicht in Supabase an

**Links:** SIN-347 (migrate belegt Tabellen), SIN-351/363/364 (Schema-Cache), SIN-359 (Fehlerklassen), `.github/workflows/migrate.yml`, `scripts/autonomy/migrationen.mjs`, [Supabase: Migrations](https://supabase.com/docs/guides/deployment/database-migrations)

## Entscheidung

Ursache: Die aus SIN-347 gemergte Aufgabe `migrate` (run-task.yml) startet nur per Handstart (`workflow_dispatch`), kein Merge löst sie aus. Sie lief nie gegen Production. Dazu lag `SUPABASE_PROJECT_REF` in `status.yml`/`digest.yml` als Variable, in `planner.yml`/`run-task.yml` als Secret.

1. **`migrate.yml`**: nach jedem Merge auf main mit Änderungen unter `supabase/migrations/` (und per Handstart): frische Sicherung (SIN-293), dann die bestehende Aufgabe `migrate` (additive Migrationen, je eine Transaktion, `notify pgrst, 'reload schema'`). Neu: nach jeder Migration wird die Version in `supabase_migrations.schema_migrations` eingetragen. Nicht additive bleiben liegen und machen den Lauf rot (risk:high, Sinan entscheidet).
2. **Vor dem Deploy**: `production-deploy.yml` bricht ab (rot), solange additive Migrationen fehlen (`migrationen.mjs --check`); der Wächter startet den Deploy beim nächsten Takt neu.
3. **Wächter**: `status.mjs` zeigt „Migrationen: n/n angewendet“. Fehlt eine, entstehen ein roter Punkt und ein Bug-Issue (ohne Duplikat).
4. **Test** `migrationen.test.ts`: keine doppelte Versionsnummer in `supabase/migrations/`.
5. **Fehlerklassen**: PGRST205 gilt nicht mehr als „Schema-Cache veraltet“, sondern als „Tabelle oder Schema-Cache“ (neue Klasse `cache-oder-fehlt`). Erst mit bekannter Existenz (`exists`) wird es `schema-cache` oder `fehlt`; Sinan-Aufgabe „Cache neu laden“ nur dann.
6. `SUPABASE_PROJECT_REF` wird überall als `secrets.… || vars.…` gelesen.

## Annahmen

- Kein `supabase db push`: Es braucht die CLI plus Datenbank-Passwort (neues Secret) und bricht an der doppelten Version 20261006010000 und an von Hand befüllten Projekten ab. Die vorhandene Management-API-Variante (nur `SUPABASE_ACCESS_TOKEN`) hat weniger Abhängigkeiten und kennt die Regel „nur additiv“.
- Die Altlast `20261006010000` (sin258 und sin260) bleibt: Dateien umzubenennen wäre eine Änderung bestehender Migrationen (risk:high). Der Test erlaubt genau diese Version, jede neue Doppelung fällt durch. In `schema_migrations` kann nur eine der beiden Dateien stehen; der Wächter wertet Dateien mit `create table` nach vorhandenen Tabellen.
- Ein Beleg „neue Test-Migration landet ohne Handarbeit“ ist ohne Secrets in diesem Lauf nicht möglich: „nicht verfügbar“. Er entsteht beim ersten Merge mit einer neuen Migration (Lauf `migrate`).
- Die Secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` und `SUPABASE_SERVICE_ROLE_KEY` sind im Repo vorhanden (status/planner/run-task nutzen sie); Token-Recht für Datenbank-Abfragen ist durch die bestehende Status-Abfrage belegt.

## Warum

Eine Aufgabe, die nur von Hand startet, wird vergessen. Der Merge ist der richtige Auslöser, der Wächter fängt Ausfälle ab, und die Fehlerklasse verhindert, dass wieder der Cache statt der fehlenden Tabelle gejagt wird.
