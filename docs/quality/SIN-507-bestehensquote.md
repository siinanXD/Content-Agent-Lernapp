# SIN-507: Richter-Bestehensquote Metall (94,9 % → 86,1 %)

Stand 12.10.2026. Nur Analyse des Codes und der Zahlen aus dem Issue. **Kein Live-Lauf in diesem Worker** (keine Supabase-Schlüssel); die Aufschlüsselung entsteht mit `npm run quality:quote -- --out docs/quality/SIN-507-quote.md` und ist **nicht gemessen**.

## Ursache in einem Satz

Die zwei Quoten sind nicht vergleichbar: Die Zählung nahm je Frage die Bewertung, die in `question_id`-Reihenfolge zuletzt kam, und dieselbe Frage steht unter zwei Schreibweisen (`<id>` und `<unit_id>-<id>`) in `question_evaluations`, daher 4.376 bewertete IDs bei 3.497 Fragen.

Ob darüber hinaus echte Qualität gefallen ist, entscheidet erst die Aufschlüsselung (Abschnitt „Prüfen“).

## Befund

1. **Zwei ID-Formate.** Der Bewertungslauf (`unitsToEvalItems`, `src/lib/quality/judge-backfill.ts`) schreibt `question_id = "<unit_id>-<id>"`. Der Weg über den Kurslauf (`evaluate-agent`, `unit-traces`) benutzt die Frage-ID aus der Einheit, also `<id>`. `questions.id` ist `<id>`. SIN-409 hat den Leser auf das Präfix erweitert, aber nicht den Fall behandelt, dass beide Schreibweisen für dieselbe Frage existieren.
2. **View zählt Texte, nicht Fragen.** `question_quality_latest` gruppiert nach `(course_id, unit_id, question_id)` als Text. Hat eine Frage Zeilen unter beiden Schreibweisen, liefert die View zwei „letzte“ Zeilen. Das erklärt 4.376 > 3.497 ohne gelöschte Fragen.
3. **Falsche Zeile gewinnt.** `ratedQuestions` (`scripts/autonomy/content-metrics.mjs`) las die View sortiert nach `question_id` und überschrieb pro Frage blind. Bei zwei Schreibweisen gewann die alphabetisch spätere, nicht die neuere Bewertung. Die 94,9 % vom 09.10. (1.757 von 1.852) und die 86,1 % vom 12.10. mischen deshalb alte und neue Bewertungen.
4. **Der Join liefert 0**, weil der Vergleich mit `questions.id` den Präfix nicht kannte (SIN-409, seither behoben für das Präfixformat).
5. **Mögliche echte Ursachen, nur mit Daten prüfbar:** Richter mit festem Schema (SIN-490: fehlende Felder fallen nicht mehr auf `heuristicScores` zurück, das kann Quoten senken), neue Lernfelder LF3 bis LF7 (andere Themen, höheres Niveau), WISO-Lauf. Jede davon zeigt sich als Gefälle in `prompt_version`, `judge_model` oder Modul.

## Was geändert wurde

- `scripts/autonomy/quality-quote.mjs` (`npm run quality:quote`, nur GET): vereinheitlicht die ID, wählt je vorhandener Frage die **neueste** Bewertung aus allen Zeilen von `question_evaluations` und zählt Zeilen ohne Frage, Fragen mit zwei Schreibweisen und Fragen ohne Bewertung getrennt aus.
- `ratedQuestions` wählt jetzt ebenfalls die neueste Bewertung (`created_at` im Select), damit die Content-Landkarte dieselbe Zahl nutzt.
- Aufschlüsselung im Skript: Modul, Fragetyp, `prompt_version`, `judge_model`, Datum; Durchfaller nach Kriterium (quellentreue, eindeutigkeit, niveau, sprache); Top 10 `reason`.

## Prüfen (nach dem Merge, durch Lauf mit Zugang)

1. `npm run quality:quote -- --out docs/quality/SIN-507-quote.md` ausführen und die Datei einchecken.
2. Zeile „Fragen mit mehr als einer ID-Schreibweise“ lesen: ist sie groß, war das der Messfehler.
3. Quote nach `prompt_version`/`judge_model` vergleichen: fällt sie nur bei den Zeilen vom 10. bis 12.10. (nach SIN-490), liegt es am Richter-Schema. Fällt sie nur in LF3 bis LF7, liegt es am Generator oder Niveau dieser Module.

## Empfehlung

- **Zuerst nichts an Prompt oder Schwelle ändern.** Erst die gemessene Quote nach Bereinigung ansehen; Schwellen nie senken, um eine Quote zu erreichen.
- Zeigt sich ein Gefälle bei der neuen `prompt_version`/dem Schema-Richter: Goldset-Vergleich (`npm run quality:calibrate`) gegen den alten Richter, bevor weitere Fragen verworfen werden.
- Zeigt sich ein Gefälle nur in LF3 bis LF7 mit Kriterium `niveau` oder `quellentreue`: Generator-Prompt oder Quellenauswahl dieser Module prüfen (Folge-Issue je Modul über die Planer-Regel `bestehensquote`).
- Schreibweg langfristig vereinheitlichen (eine ID-Form): eigenes Issue, weil Altzeilen sonst neu bewertet würden (Kosten, siehe SIN-409).
