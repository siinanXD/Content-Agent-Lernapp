# SIN-632 Versionen und Rückgängig für Inhalte

- Issue: https://linear.app/sinan-kahraman/issue/SIN-632
- Verwandt: SIN-620 (Korrekturen), SIN-621 (Umzug), SIN-293 (Sicherung), SIN-337 (Restore-Test)

## Entscheidung

- Tabelle `content_versions` (alter/neuer Stand als jsonb, Aktion, Grund, Issue, `run_id`, Zeitpunkt), geschrieben von einem Trigger auf `units` und `questions`. Der Trigger deckt jeden Weg ab (Skript, Pipeline, SQL-Editor); Update nur bei echter Änderung (`WHEN old.* is distinct from new.*`).
- Grund, Issue und Lauf kommen aus der Einzeilen-Tabelle `content_version_kontext` (gültig 10 Minuten), weil PostgREST keine Sitzungsvariablen über Aufrufe hält. Ohne Eintrag: Grund „ohne Angabe“.
- `setGenerated` schreibt per upsert und löscht nur entfallene Zeilen (vorher: alles löschen, neu anlegen). Sonst würde jeder Lauf für jede Zeile Löschen + Anlegen versionieren.
- Zurücksetzen: `scripts/inhalte-zuruecksetzen.ts` kehrt Versionen eines Laufs oder einer Einheit (`--ab`) in umgekehrter Reihenfolge um; Logik und Tests in `src/lib/versions/`. Kein neuer Dienst, keine neue Abhängigkeit.
- Notfallplan: `docs/ops/NOTFALL.md`.

## Annahmen

- Der Test „Rücksetzen eines Laufs“ läuft hier gegen einen In-Memory-Ersatz mit nachgebildetem Trigger (wie `backup.test.ts`). Eine wegwerfbare Supabase (SIN-337) gibt es im Repo noch nicht (`BACKUP.md`: Restore-Test offen); der Lauf gegen echte Postgres-Trigger steht aus. Die Migration wurde ohne Datenbank nur per Text geprüft.
- `content_versions` ist nicht in der nächtlichen Sicherung; sie ist aus den Zeilen nicht rekonstruierbar, aber klein. Aufnahme in `BACKUP_TABLES` wäre ein eigenes Paket.
- Änderungen an `courses.lernfeld` (jsonb) werden nicht versioniert; `units`/`questions` sind die Quelle laut Issue.

## Warum

Trigger statt Schreibfunktion, weil nur er „jede Änderung“ garantiert. Eigenbau statt Erweiterung, weil Postgres-Trigger mit jsonb alle Abhängigkeiten vermeiden.
