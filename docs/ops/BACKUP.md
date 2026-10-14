# Sicherung und Wiederherstellung (SIN-293)

Der Workflow `backup.yml` sichert jede Nacht (02:23 UTC, zusätzlich per cron-job.org auslösbar) alle Inhalte aus Supabase.

## Was gesichert wird

`courses` (ohne Mock), `shared_modules`, `course_shared_modules`, `sources`, `plans`, `units`, `questions`, `evaluations`, `question_evaluations`. Module stehen im Plan (`plans.payload`) und in den Einheiten-IDs (`M0-01`). **Nicht** gesichert: `learning_progress`, Gruppen, Demo-Anfragen, Kosten-Tabellen (Personenbezug oder rekonstruierbar).

Ablage: privater Supabase-Storage-Bucket `backups`, Datei `JJJJ-MM-TT.json.gz`. Aufbewahrung: 14 Tage täglich, ältere nur der Montag. Die jüngste Sicherung wird nie gelöscht.

Nach dem Hochladen lädt der Workflow die Datei wieder herunter und prüft sie (Version, Zähler, Fremdschlüssel). Erst dann wird aufgeräumt. Rot = Meldung über die Status-Seite (@siinanXD). Auch „keine erfolgreiche Sicherung seit 36 h“ wird gemeldet. Status-Seite und Tages-Update zeigen „Letzte Sicherung hh:mm UTC, n Fragen“.

## Prüfen

```bash
node --import tsx scripts/backup.ts verify --latest        # liest den neuesten Stand aus dem Bucket
node --import tsx scripts/backup.ts verify datei.json.gz
```

## Wiederherstellen

Immer zuerst in ein **Ziel, das nicht die Produktion ist** (Supabase-Branch oder lokale DB mit angewendeten Migrationen aus `supabase/migrations/`):

```bash
export SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…                 # nur für --latest (Quelle)
export RESTORE_SUPABASE_URL=… RESTORE_SUPABASE_SERVICE_ROLE_KEY=… # Ziel
node --import tsx scripts/backup.ts restore --latest --dry-run     # nur prüfen
node --import tsx scripts/backup.ts restore --latest               # schreiben + Gegenprobe der Zeilenzahlen
```

- Das Skript schreibt nur per `upsert` in Fremdschlüssel-Reihenfolge und löscht nie.
- Zeigt das Ziel auf `SUPABASE_URL` (Produktion), bricht es ab, außer mit `--allow-production`. Das ist der Notfallweg nach einem Datenverlust: erst Branch-Probe, dann Produktion.
- Nach dem Restore: `node scripts/verify-supabase-schema.mjs` mit den Ziel-Schlüsseln.

## Teststand

- Automatisiert (`src/lib/backup/backup.test.ts`): Export → gzip → Prüfung → Wiederherstellung in eine leere In-Memory-Datenbank, Reihenfolge der Fremdschlüssel, zweiter Lauf ohne Änderung, kaputte Dateien, Aufbewahrung.
- Echter Restore (SIN-337): Workflow `restore-test.yml` (monatlich am 1. um 04:17 UTC und per `workflow_dispatch`) startet eine wegwerfbare lokale Supabase im Runner, spielt die Migrationen ein, stellt die jüngste Sicherung wieder her (erst `--dry-run`), macht die Gegenprobe der Zeilenzahlen und prüft das Schema. Die Produktion wird nur gelesen. Ergebnis: Job-Zusammenfassung und Ereignis `restore-test` in `loop_events` (Spalte `grund` mit Zeilenzahlen und Dauer). Rot oder 40 Tage ohne Lauf = Alarm über die Status-Seite.
- **Offen: erster grüner Lauf.** Nach dem Merge `restore-test` einmal von Hand starten und Datum, Zahlen und Ergebnis hier eintragen; dann diese Zeile streichen:

  | Datum | Ziel | Zeilen (Fragen / Einheiten) | Ergebnis |
  | --- | --- | --- | --- |
  | – | lokale Supabase im Runner | – | noch kein Lauf |

## Grenzen

Die Sicherung liegt im selben Supabase-Projekt. Sie schützt vor falschen Migrationen, Aufräumfehlern und Löschungen, nicht vor dem Verlust des ganzen Projekts. Dafür bräuchte es einen zweiten, privaten Ablageort. Das Repo ist öffentlich, deshalb liegt die Sicherung weder im Repo noch in Artefakten.
