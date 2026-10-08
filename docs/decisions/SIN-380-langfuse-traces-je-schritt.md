# SIN-380: Content-Fabrik schreibt Langfuse-Traces je Schritt

## Links
- [Langfuse JS/TS SDK](https://langfuse.com/docs/observability/sdk/overview)
- [SIN-380 Linear Issue](https://linear.app/sinan-kahraman/issue/SIN-380/langfuse-content-fabrik-schreibt-traces-erst-am-laufende-keine-trace)

## Entscheidung

`scripts/content-grow.ts` schreibt Traces jetzt während des Laufs über `src/lib/quality/grow-traces.ts`:

- Nach dem Abschicken eines Batches: Trace „Fragen erzeugen“ (Batch-ID, Modell, Einheiten). Nach `pollBatchUntilDone`: zweiter Trace mit Tokens und Kosten.
- Je `judge()`-Aufruf ein Trace „Fragen prüfen“ mit Prüfpunkt-Scores. Die Trace-ID steht in `EvaluateResult.langfuseTraceId` und damit in `question_evaluations.langfuse_trace_id`.
- Nach jedem Schritt `flushLangfuseOtel()`.
- Kosten (`recordRunCost`: `pipeline_run_costs` und Kosten-Trace) werden auch bei einem Fehler im Lauf geschrieben, nicht nur am normalen Ende.
- Die Sammel-Traces „erzeugen“ und „prüfen“ am Laufende entfallen; „Veröffentlichen“ bleibt am Ende.

## Annahmen

- Der OTel-Weg schreibt abgeschlossene Observationen. „Abschließen“ heißt daher ein zweiter Trace derselben Session statt Update des ersten.
- Gab es 0 Zeilen in `pipeline_run_costs`, lag das am Abbruch vor dem Lauf-Ende; die Ursache am Laufende selbst (z. B. fehlende Tabelle) ist damit nicht ausgeschlossen. `migrate.yml` (SIN-374) prüft die Tabelle.
- Traces enthalten nur Kennungen und Zahlen, keine Prompts, keine Personendaten.

## Warum

Sichtbarkeit während des Laufs und Rückverfolgung von Bewertung zu Trace; kleinster Eingriff ohne neue Abhängigkeit.
