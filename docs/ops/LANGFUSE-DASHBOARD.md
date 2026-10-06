# Langfuse-Dashboard: Frage-Bewertung und Kosten (SIN-258)

Langfuse Cloud EU (`https://cloud.langfuse.com`, Projekt „Content AGent“). Die Daten kommen aus der Pipeline, nichts muss von Hand eingetragen werden. Die Kosten stehen zusätzlich im Ledger (Supabase, Tabelle `pipeline_run_costs`).

## Was die Pipeline meldet

| Trace-Name | Quelle | Scores |
| --- | --- | --- |
| `pipeline-run-content-grow` | Ende jedes Content-Fabrik-Laufs | `costEur`, `costUsd`, `capEur`, Token (Claude Eingabe/Ausgabe/Cache, OpenAI Eingabe/Ausgabe) |
| `ap23-content-grow`, Quality-Gate-Traces | Richter-Ergebnis je Lauf | `sourceFidelity`, `uniqueness`, `niveau`, `language`, `safetyFlag` |

Metadaten: `runId`, `courseId`, `runKind`. Keine Prompts, keine Personendaten. Ist der Lauf wegen des Deckels gestoppt, ist die Bewertung `passed = false` und der Trace trägt den Wert `costEur ≥ capEur`.

## Dashboard anlegen (einmalig, Langfuse → Dashboards → New dashboard)

1. **Kosten je Lauf**: Widget „Scores“, Score `costEur`, Aggregation Mittelwert und Maximum, Gruppierung nach Trace-Name, Zeitachse Tag.
2. **Deckel-Abstand**: Widget „Scores“, Scores `costEur` und `capEur` im selben Diagramm. Ziel: `costEur` bleibt unter `capEur` (20 €).
3. **Token**: Widget „Scores“, `claudeInputTokens`, `claudeOutputTokens`, `openaiInputTokens`, `openaiOutputTokens` als gestapelte Balken.
4. **Frage-Bewertung**: Widget „Scores“, `sourceFidelity`, `uniqueness`, `niveau`, `language` als Mittelwert je Tag. `safetyFlag` als Summe (soll 0 sein).
5. Filter für alle Widgets: Umgebung `production` (Variable `LANGFUSE_TRACING_ENVIRONMENT`).

Die Bewertung je einzelner Frage steht in Supabase (`question_evaluations`, View `question_quality_latest`), nicht in Langfuse.

## Ohne Live-Keys

Fehlen `LANGFUSE_PUBLIC_KEY` und `LANGFUSE_SECRET_KEY`, schreibt der Lauf keinen Trace. Das Ledger wird weiter geschrieben (Supabase) bzw. im Mock-Speicher gehalten (`COURSE_STORAGE=mock`, Tests).

## Kennzahl im Planer

`kosten_pro_lauf` zeigt Durchschnitt, letzten und höchsten Lauf der letzten 20 Einträge aus `pipeline_run_costs`. Ohne Supabase-Zugang steht dort „nicht verfügbar“.
