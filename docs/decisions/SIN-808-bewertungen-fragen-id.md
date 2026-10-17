# SIN-808: Richter-Bewertungen passen nicht zu den Fragen-IDs (Industriemechaniker)

- Issue: https://linear.app/sinan-kahraman/issue/SIN-808
- Davor: `SIN-768-industriemechaniker-veroeffentlichen.md`, `SIN-796` (Workflow `content-publish`), `SIN-395-verworfene-fragen.md`, `SIN-260-bewertungslauf.md`
- Freigabe API-Kosten: SIN-797; Deckel 20 € je Lauf (`BACKFILL_STOP_EUR` = 19 €)

## Ursache

Der Richter bekommt jede Frage als `EvalItem` mit `id = "<unitId>-<q.id>"` (`unitsToEvalItems`, `flattenSeedQuestions`) und gibt diese Kennung als `questionId` zurück. `toQuestionEvaluationRecords` schrieb sie unverändert in `question_evaluations.question_id`. `questions.id` ist aber nur `q.id`. Alle Leser (`dropDiscardedQuestions`, Prüfung in `veroeffentlichen.ts`) vergleichen `(unit_id, q.id)`. Bewertungen aus dem Backfill trafen so nie eine Frage: Verworfene Fragen wurden nicht ausgeblendet und `content-publish` fand keine Bewertung.

## Entscheidung

1. Eine Kennung je Frage: `frageId`/`frageSchluessel` (`question-evaluations.ts`). Geschrieben wird `q.id`; Leser (`latestPerQuestion`, `discarded.ts`, `planBackfill`, `veroeffentlichen.ts`) nehmen Altzeilen mit Einheiten-Präfix mit. Keine Migration, keine Änderung an bestehenden Zeilen.
2. Zuordnung über Inhalts-Hash ohne API-Kosten: `ordneBewertungenZu` (`judge-backfill.ts`) kopiert die jüngste Bewertung mit gleichem `content_hash` auf die heutige Frage (append-only, Run `…-zuordnung`). Läuft in `scripts/sin260-judge-backfill.ts` vor der Planung, auch im `--dry-run` (zählt, schreibt nicht).
3. Regel `sicherheit_flag`: Eine Frage mit Flag in der letzten Bewertung wird ausgeblendet, auch wenn sie bestanden ist (`discardedQuestionKeys`). Die menschliche Stichprobe bleibt Sache von Sinan; ausgeblendete Fragen werden nie automatisch freigegeben.
4. `content-publish` prüft, was Lernende sehen: ausgeblendete Fragen (nicht bestanden oder Flag) zählen nicht; jede sichtbare Frage braucht eine Bewertung; ohne sichtbare Frage ist der Kurs nicht freigabefähig.

## Annahmen

- Die 1.023 verschiedenen `content_hash` der Altbewertungen stammen aus Fragen, deren Inhalt sich nicht geändert hat; was keinen Treffer hat, wird vom Backfill nachbewertet (Kosten im Deckel).
- Dieser Lauf hatte keinen Supabase-Zugang: Zählungen im Kurs und der Echtlauf des Backfills (`COURSE_STORAGE=supabase npm run quality:judge-backfill`) sowie der Trockenlauf `content-publish` stehen noch aus.

## Warum

Ein Schlüssel an einer Stelle statt Umbenennen der Datenbank: der Fehler lag im Schreiben, die Altdaten bleiben lesbar, und derselbe Code schützt Industriekaufmann.
