# SIN-862: Reparatur findet Richter-Bewertungen wieder, Obergrenze je Einheit

Links: [SIN-862](https://linear.app/sinan-kahraman/issue/SIN-862), [SIN-218](https://linear.app/sinan-kahraman/issue/SIN-218), SIN-808 (Fragen-Id ohne Präfix), SIN-861.

## Entscheidung

1. **Ursache gefunden (Code, nicht aus Logs):** `planQuestionRepair` suchte Bewertungen unter `<unit>-<q>`. Seit SIN-808 speichert `toQuestionEvaluationRecords` nur `<q>`. Folge: Jede gespeicherte Frage galt als „nicht bewertet“. Bestandene Fragen wurden mitersetzt, der Prompt bekam statt des Richter-Grunds nur „nicht bewertet“. Jetzt werden beide Formen über `frageId` auf `q.id` abgebildet (Plan und `applyRepair`).
2. **Prompt:** gibt Grund des Richters, Einheiten-Text (`kern`) und Quelle schon mit. Das war es nicht; der Grund ging durch Punkt 1 verloren.
3. **Obergrenze:** `MAX_REPAIR_ROUNDS_PER_UNIT = 4` Reparatur-Runden je Einheit über alle Läufe (gezählt aus `run_id`-Suffix `-repair<n>` in `question_evaluations`). Danach überspringt `ap15-regen-dropped.ts` die Einheit, sie bleibt verworfen. Der Bericht nennt `cappedAfterMaxRounds`.
4. **Auswertung:** `npm run quality:repair` (lesend) zählt Gründe je Runde.

## Annahmen

- Kein Datenbank-Zugang im Worker-Lauf: Die Auswertung der Gründe und die Quote im Live-Lauf liegen noch nicht vor. Beides nach Merge mit dem nächsten Fabrik-Lauf prüfen (`content_factory_runs`).
- 4 Runden = 2 Fabrik-Läufe à 2 Runden; mehr bringt laut Befund (3 von 28 in Runde 2) kaum etwas.

## Warum

Billigster Weg: Fehler beheben, der Reparatur-Kosten und Durchfallquote erklärt, und Endlos-Reparatur begrenzen, statt Richter oder Modell zu ändern.
