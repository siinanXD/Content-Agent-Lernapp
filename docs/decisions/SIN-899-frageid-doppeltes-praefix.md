# SIN-899: frageId entfernt das Einheiten-Präfix wiederholt

- Links: SIN-899, SIN-808 (`frageId`/`frageSchluessel`)
- Entscheidung: `frageId` kürzt `${unitId}-` so lange, bis keins mehr am Anfang steht (nicht leer). Beide Seiten (Frage, Bewertung) nutzen dieselbe Funktion.
- Annahme: Kein echtes `q.id` beginnt selbst mit `${unitId}-` und braucht das Präfix zur Unterscheidung.
- Warum: Frage `LF5-4-u8-q1` und Bewertung `LF5-4-u8-LF5-4-u8-q1` ergeben so denselben Schlüssel; kürzester Diff.
