# SIN-409: Kennzahl „Fragen bewertet“ blieb 0 wegen abweichender Frage-ID

**Links:** [SIN-409](https://linear.app/sinan-kahraman/issue/SIN-409), Vorgänger SIN-371, SIN-386, SIN-394, SIN-402; `scripts/autonomy/content-metrics.mjs` (`ratedQuestions`), `src/lib/quality/judge-backfill.ts` (`unitsToEvalItems`)

## Entscheidung

Der Leser (`ratedQuestions`) erkennt `question_id` mit Einheiten-Präfix und ordnet sie der Frage in `questions` zu. Der Schreibweg bleibt unverändert.

## Ursache

`unitsToEvalItems` setzt `EvalItem.id = "<unit_id>-<frage-id>"`; diese ID wird als `question_evaluations.question_id` geschrieben. `questions.id` enthält nur `<frage-id>`. Der Abgleich in `ratedQuestions` (SIN-394) verglich `course_id:unit_id:id` exakt und fand deshalb nie einen Treffer: Bewertungen wurden geschrieben, aber nie gezählt (0 von 1852, keine Bestehensquote). Schreiben, Schema-Cache und RLS wurden nicht als Ursache gefunden (Service-Role liest die View).

## Annahmen

- Der Lauf wurde in diesem Worker nicht gestartet: keine Live-Secrets (Supabase, OpenAI). Kosten und Bestehensquote sind **nicht gemessen**; `docs/product-readiness.json` bekommt keinen Eintrag, bis ein echter Lauf (`run-task`, Aufgabe `judge-backfill`) und der nächste Planer-Bericht Zahlen liefern.
- Schreibweg nicht geändert: bestehende Zeilen (append-only) und der Hash-Abgleich in `planBackfill` nutzen die Präfix-ID; eine Umstellung würde alle Fragen neu bewerten und Kosten erzeugen.
- Liegt die Quote nach dem Lauf unter dem Goldset-Zielwert 0,9, entsteht je Modul ein Folge-Issue (Planer-Regel `bestehensquote`).

## Warum

Kleinste Änderung, die vorhandene Daten sofort sichtbar macht, ohne Neubewertung (Kosten) und ohne Schemaänderung.
