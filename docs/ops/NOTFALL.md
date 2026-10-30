# Notfallplan: falscher Inhalt ist live (SIN-632)

Gilt für Einheiten und Fragen. Reihenfolge: erst ausblenden, dann zurücksetzen, dann Ursache.

## 1. Ausblenden (Minuten)

- Einzelne Frage: neue Zeile in `question_evaluations` mit `passed = false` (die letzte Bewertung zählt, `src/lib/learner/discarded.ts` filtert die Frage dann aus allen Lernwegen). Nur hinzufügen, nie löschen.
- Ganze Einheit: Wenn das Ausblenden nicht reicht, gleich zu Schritt 2 (Zurücksetzen); im Lernpfad prüfen, dass der falsche Text weg ist.
- Weitere Inhalte stoppen: Label `no-automerge` an offene Inhalts-PRs, Content-Fabrik (`content-grow.yml`) unter GitHub → Actions deaktivieren.

## 2. Zurücksetzen

Jede Änderung an `units`/`questions` steht in `content_versions` (Trigger, Migration `20261023010000`). Mit Service-Key des Ziels:

```bash
export SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…
npm run inhalte:zuruecksetzen -- liste --kurs <course_id> --einheit <unit_id>     # Versionen mit Nummer, Grund, Issue, Lauf
npm run inhalte:zuruecksetzen -- --kurs <course_id> --einheit <unit_id> --ab <Version>   # Plan ansehen
npm run inhalte:zuruecksetzen -- --lauf <run_id> --apply --issue SIN-xxx                 # ganzen Lauf umkehren
```

- Ohne `--apply` nur Plan. `--ab n` kehrt alle Versionen der Einheit (samt Fragen) ab Nummer `n` um; `--lauf` alle Versionen mit dieser `run_id`.
- Das Zurücksetzen schreibt selbst Versionen (Grund „Zurückgesetzt …“) und ist damit umkehrbar.
- Danach `npm run quality:judge-backfill`, weil sich der Inhalts-Hash der Fragen ändert, und die Einheit im Lernpfad ansehen.
- Reicht `content_versions` nicht (Tabelle leer, Datenverlust): Wiederherstellung aus der nächtlichen Sicherung, `docs/ops/BACKUP.md`.

## 3. Ursache

Linear-Issue anlegen (Label `bug`): welcher Lauf (`run_id`), welche Versionsnummern, was hat den Fehler erzeugt, welche Regel im Wächter (`src/lib/review/`) fehlte. Behobenen Fehler als eine Zeile in `docs/autonomy/LEHREN.md`.

## Grenzen

- Versionen entstehen ab Anwendung der Migration; frühere Änderungen sind nur über die Sicherung erreichbar.
- Der Grund (`grund`, `issue`, `run_id`) steht nur, wenn der schreibende Lauf ihn vorher setzt (`setzeKontext`, gilt 10 Minuten); sonst „ohne Angabe“. Die Version selbst entsteht immer.
- Schreibt `setGenerated` einen Kurs neu, legt es nur geänderte Zeilen als Version an (upsert statt Löschen und Neuanlegen).
- Rücksetzen gegen Wegwerf-Supabase (SIN-337): noch offen, siehe Entscheidung `docs/decisions/SIN-632-inhalte-versionen.md`.
