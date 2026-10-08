# SIN-371 — Bewertungslauf: 0 von 1745 Fragen bewertet

**Links:** SIN-348, SIN-369 (Voraussetzungen), SIN-260 (`scripts/sin260-judge-backfill.ts`), SIN-363/364 (Secrets, Schema-Cache), `.github/workflows/run-task.yml`

## Entscheidung

Die Ursache lässt sich ohne Live-Zugang nicht belegen. Dieser Worker läuft ohne Secrets, `gh` und Websuche gesperrt, die Logs der `run-task`-Läufe sind nicht lesbar. Statt zu raten, wird der Lauf diagnosefähig gemacht, damit der nächste Lauf die Ursache nennt:

1. `liveJudgeChunkWithUsage` wirft jetzt `OpenAI <Status> (<Modell>): <Fehlertext>`. Bisher stand nur `OpenAI 400`, Modellname, Parameter oder Kontingent waren nicht erkennbar.
2. Das Skript fängt Fehler je Kurs, schreibt `FEHLER Kurs <id>: …`, gibt „Bewertet: N Fragen, Fehler in M Kursen“ aus und endet bei Fehlern mit Exit-Code 1. Vorher brach der erste Fehler den Lauf ohne Zusammenfassung ab.
3. `migrate` verlangt jetzt auch `question_evaluations` und `judge_runs` (`REQUIRED_TABLES`) und meldet fehlende Tabellen beim Namen.

## Geprüft (Code)

- Kennzahl `fragen_bewertet` = Zeilen in `question_quality_latest`; geschrieben wird nur von `appendQuestionEvaluations`. 0 heißt: kein Insert gelang.
- Die Kette Kurs laden → Fragen → Richter → Insert ist in sich stimmig (Tests grün); Kostendeckel (19 €) ist nicht die Ursache, er greift erst nach dem ersten Chunk.
- Wahrscheinliche Kandidaten, nach Reihenfolge im Lauf: fehlendes Secret (`OPENAI_API_KEY`, dann „Blocker“ ohne Bewertung), Richter-Modell `JUDGE_MODEL = gpt-5.4-mini` wird von OpenAI abgelehnt (`OpenAI 4xx`), Tabelle `question_evaluations` oder Spalte `content_hash` fehlt bzw. nicht im Schema-Cache (SIN-363/364).

## Annahmen

- Das Richter-Modell konnte hier nicht gegen die OpenAI-Docs geprüft werden (Websuche gesperrt). Ändert sich der Name, ist das ein eigenes Issue nach Blick in den Fehlertext.
- Kein Lauf mit Bewertung belegt: Zahl im PR „nicht verfügbar“. Nächster Schritt: `run-task` mit `judge-backfill` starten, Log lesen.

## Warum

Ein stiller Fehlschlag kostet Läufe, ohne Ursache zu liefern. Raten (z. B. Modellname ändern) ohne Beleg verstößt gegen die Regel, Modellnamen nicht aus dem Gedächtnis zu nutzen.
