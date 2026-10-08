# SIN-394: Kennzahl „Fragen bewertet" — Nenner und Zähler aus demselben Stand

**Entscheidung:** Filter-Abfrage statt SQL-Join, weil REST API keine JOINs unterstützt.

**Links:**  
- Linear: [SIN-394](https://linear.app/sinan-kahraman/issue/SIN-394)

## Ursache

Die Kennzahl `fragenBewertet` zählte alle Reihen aus `question_quality_latest` (2121), aber einige dieser Bewertungen gehörten zu Fragen, die inzwischen gelöscht oder verschoben wurden. Die `questions`-Tabelle war Quelle der Wahrheit (1852 Fragen aktuell).

Die Migrations zeigen: `question_evaluations` ist append-only, löscht oder ändert nie (SIN-216). Eine Frage kann also:
1. Aus `questions` gelöscht werden
2. Ihre Bewertungen bleiben in `question_evaluations` 
3. Die View `question_quality_latest` zeigt immer noch die letzte Bewertung

Das Primary Key Schema `(course_id, unit_id, id)` in `questions` und die Abfrage auf `(course_id, unit_id, question_id)` in Evaluationen müssen übereinstimmen.

## Lösung

Lade alle aktuellen Fragen aus `questions` und filtere `question_quality_latest` auf existierende (course_id, unit_id, question_id)-Tupel. Weil die REST API keine JOINs unterstützt, wird der Filter in JavaScript angewendet.

**Änderungen:**
- `scripts/autonomy/content-metrics.mjs` neue Funktion `ratedQuestions` (je Frage höchstens eine Bewertung, nur vorhandene Fragen): 
  - Neue Zeile: Lade alle Fragen aus `questions`-Tabelle
  - Neue Zeile: Baue Set von existierenden (course_id:unit_id:question_id)
  - Ändere Variable `fragenBewertet` auf Filter-Ergebnis
  - `fragenGesamt` aus `questions.length` statt `countRows` (eine Abfrage)
  - `passRateByModule` und `offeneVerworfene` auf gefilterte Bewertungen anwenden

**Annahmen:**
- Fragen-IDs sind nur eindeutig mit (course_id, unit_id)
- Evaluationen sind append-only und werden nie aus der DB entfernt
- `question_quality_latest` gibt neueste Bewertung pro (course_id, unit_id, question_id) zurück

## Test

Unit-Test `src/lib/autonomy/content-metrics.test.ts`: Mehrfachbewertung einer Frage und Bewertung einer gelöschten Frage; erwartet bewertet = 2, gesamt = 3 (`ratedQuestions`).
