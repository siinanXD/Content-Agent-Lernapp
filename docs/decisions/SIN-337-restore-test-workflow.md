# SIN-337: Restore-Test der Sicherung als monatlicher Workflow

- Issue: https://linear.app/sinan-kahraman/issue/SIN-337
- Workflow: `.github/workflows/restore-test.yml`, Alarm: `scripts/autonomy/backup.mjs` (`analyzeRestoreTest`)
- Docs: [supabase/setup-cli](https://github.com/supabase/setup-cli), [Supabase CLI `start`/`status`](https://supabase.com/docs/guides/local-development/cli/getting-started)

## Entscheidung

Der Restore läuft in einer wegwerfbaren lokalen Supabase im GitHub-Runner (`supabase start`, `db reset`), nicht in einem Branch oder neuen Projekt (kostet) und nicht von Hand. Quelle ist der Bucket der Produktion (nur lesen), Ziel sind die lokalen Werte aus `supabase status -o env`. Die Produktion bekommt nur die Ereigniszeile `restore-test` in `loop_events`.

## Annahmen

- Es gibt kein `supabase/config.toml` im Repo; der Workflow erzeugt es mit `supabase init --force`. Ausgeschlossen werden nur Dienste ohne Bedeutung (Studio, Imgproxy, Edge, Logs, Vektor, Mail, Meta, Supavisor); Auth und Storage bleiben, weil Migrationen `auth.`/`storage.` verwenden.
- Zeilenzahlen und Dauer stehen in der vorhandenen Spalte `grund` von `loop_events` (keine neue Migration). Der Leitstand (anderes Repo) zeigt „zuletzt getestet am …“ aus diesem Ereignis; die Kachel dort ist nicht Teil dieses PR.
- Schlägt der Lauf wegen abweichender Schemas fehl, ist das ein echter Befund: Ursache hier festhalten, nicht den Test lockern.
- Der Workflow konnte in der Agent-Umgebung nicht laufen (kein Docker, keine Schlüssel); die Schritte sind ungetestet bis zum ersten Lauf nach dem Merge.

## Warum

Eine nie getestete Sicherung ist keine. Lokal im Runner kostet es nichts, braucht keine Schlüssel bei Sinan und kann der Produktion nicht schaden.
