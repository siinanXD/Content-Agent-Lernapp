# SIN-861: setGenerated schreibt nur geänderte Einheiten

- Issue: https://linear.app/sinan-kahraman/issue/SIN-861
- Code: `src/lib/storage/generated-teil.ts`, `scripts/content-grow.ts` (`runRepair`)

## Entscheidung

- `setGenerated(id, generated, { changedUnitIds, lernfeld })`: Mit dem dritten Argument werden nur die genannten Einheiten und ihre Fragen geschrieben (Blöcke à 100). Verwaiste Fragen werden nur für diese `unit_id` gesucht und mit `.in("id", …)` blockweise gelöscht. Kein Lesen des ganzen Kurses, kein Löschen von Einheiten. Ohne das Argument bleibt alles wie bisher (Mock, Skripte).
- `content-grow` (Ende) und `ap15-regen-dropped` nutzen den Teilmodus. Scheitert die Reparatur (Exit nicht 0/3/4), gibt es eine Warnung und der Lauf macht weiter.

## Annahmen

- Die volle `courses.lernfeld`-jsonb wird weiter geschrieben (`lernfeld: true`), weil `loadCourse` sie bevorzugt und der Leser sonst veraltete Inhalte zeigt. Das Schalterchen `lernfeld: false` gibt es für Zwischenstände. Schreibt sie weiter Timeouts, folgt als nächster Schritt: Einheiten aus den Tabellen lesen statt aus der jsonb (eigenes Issue).
- Aufrufer ohne Teilmodus haben im Mock denselben Zustand wie bisher.

## Warum

Der volle Schreibvorgang pro Aufruf wuchs mit dem Kurs (700 bis 942 Einheiten) und lief in `statement timeout` und `Gateway Timeout`.
