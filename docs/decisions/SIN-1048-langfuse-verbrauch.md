# SIN-1048 · Langfuse über Gratis-Limit: Messung auf Kalendermonat, Sampling für Massenläufe

Stand: 2026-10-23. Auslöser: `loop_snapshot.quotas` meldete `langfuse_units_monat` = 61.795 von 50.000 (123 %).

## Abrechnungsregel (Quellen, abgerufen 2026-10-23)

- https://langfuse.com/pricing: „A billable unit in Langfuse is any tracing data point sent to the platform.“ Hobby: 50k Units pro Monat.
- https://langfuse.com/docs/administration/billable-units: Traces, Observations **und Scores** zählen. Auch Units aus Langfuse-Funktionen (LLM-as-a-Judge, Annotation Queues, Experimente) zählen.
- **Nicht dokumentiert** (beide Seiten schweigen): Limit je Projekt oder je Organisation; Verhalten über dem Limit (Annahme gestoppt oder nur Hinweis); ob der Zeitraum der Kalendermonat ist. Annahme: Kalendermonat (UTC), weil „pro Monat“ und die Rechnung monatlich läuft. Bei Hobby je Organisation zu rechnen ist die vorsichtigere Lesart; die Messung sieht nur das Projekt des Lern-App-Schlüssels. Bei Unsicherheit prüft Sinan die Nutzung in Langfuse unter Settings → Billing.

## Die 3 größten Verursacher

**Nicht belegt.** Der Worker-Lauf hat keine Langfuse-Schlüssel (`LANGFUSE_PUBLIC_KEY`/`SECRET_KEY` fehlen im Lauf), die Public API war nicht lesbar. Zahlen aus der API gibt es daher noch nicht; das Kriterium „3 größte Verursacher mit Zahlen“ bleibt offen und geht als Nacharbeit an einen Lauf mit Schlüsseln (`GET /api/public/metrics/daily` mit `traceName`-Filter, `GET /api/public/v2/scores`).

Aus dem Code abgeleitet (Vermutung, keine Messung): Pro Einheit schreibt `schreibeEinheitTrace` (`src/lib/quality/unit-traces.ts`) 1 Trace, 1 Root-Observation, 1 Generation, je Frage 1 Evaluator-Observation, 1 Ergebnis-Event und je Frage 5 Scores (4 Prüfpunkte, Sicherheit, bestanden = 6). Bei 5 Fragen sind das etwa 9 Observations und 30 Scores je Einheit. Scores sind damit der größte Block und wurden bisher **gar nicht gezählt** (Messung nur Traces + Observations). Die Content-Pipeline (`grow-traces.ts`) ist also sehr wahrscheinlich der Hauptverursacher.

## Änderungen

1. **Messung** (`scripts/autonomy/status.mjs`): Kalendermonat (UTC) statt 30 Tage rollierend; Scores (`/api/public/v2/scores`, `meta.totalItems`) werden mitgezählt. Der angezeigte Wert steigt dadurch zunächst, weil Scores neu dazukommen, und fällt am Monatsersten.
2. **Sampling** (`LANGFUSE_SAMPLE_RATE`, 0 bis 1, leer = 1): nur Einheiten-Traces der Massenläufe (`grundbestand`, `neuesModul`) werden gesampelt, stabil je Einheits-ID. Reparatur und Modellvergleich schreiben immer vollständig. Die Richter-Scores bleiben vollständig, weil das Qualitäts-Tor sie aus `question_evaluations` (Supabase) liest, nicht aus Langfuse. Folge: Für nicht gesampelte Einheiten fehlt die `trace_id` in `question_evaluations`.
3. **Nicht gebaut:** Wiederholungsversuche erzeugen keine eigene Observation (schon so); Evals-Tracing nur bei Bedarf: nicht angefasst, ohne Messung kein Beleg.

## Aktivierung

`LANGFUSE_SAMPLE_RATE` ist ohne Wert aus (alles wird geschrieben). Zielwert: Hochrechnung des Monats unter 80 %. Erst mit den API-Zahlen wählbar; Richtwert: Anteil der Massenläufe am Verbrauch `a`, Rate `r` so wählen, dass `1 − a·(1 − r)` ≤ 0,65 (von 123 % auf unter 80 % braucht mindestens 35 % weniger).
