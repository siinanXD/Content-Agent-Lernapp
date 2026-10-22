# SIN-862 — Reparatur-Audit (22.10.2026)

## Umfang

Read-only-Auswertung aus der produktiven Tabelle `question_evaluations`. Kurs-ID `e22073de-7020-4380-9002-c70d46c25e25` entspricht `Maschinen- und Anlagenführer`. Prompt-Version: `2026-10-v2`, Richter: `gpt-5.4-mini`. Zeitraum: 20.10.2026 22:30 bis 21.10.2026 22:30 UTC. Es wurden nur Bewertungen aus `-repair1` und `-repair2` betrachtet. Kein neuer kostenpflichtiger Lauf wurde gestartet.

## Reproduzierbare Abfrage

Die folgende ausschließlich lesende Abfrage wurde am 22.10.2026 erneut ausgeführt und bestätigt sämtliche Zählwerte der Tabelle. Das feste Zeitfenster verhindert, dass eine spätere Ausführung unbemerkt andere Daten misst.

```sql
with rows as (
  select substring(run_id from '-repair([12])') as round,
         passed, reason, sicherheit_flag
  from public.question_evaluations
  where course_id = 'e22073de-7020-4380-9002-c70d46c25e25'
    and created_at >= timestamptz '2026-10-20 22:30:00+00'
    and created_at < timestamptz '2026-10-21 22:30:00+00'
    and run_id ~ '-repair[12]'
)
select round, count(*) as evaluations,
       count(*) filter (where passed) as passed,
       count(*) filter (where not passed) as failed,
       count(*) filter (where not passed and reason like '%source_fidelity_fail%') as source_fidelity_failed,
       count(*) filter (where sicherheit_flag) as safety_flags
from rows group by round order by round;
```

Der zusätzliche aktuelle 24-Stunden-Abruf am 22.10.2026 lieferte keine Reparaturbewertungen. Er belegt deshalb keine neue Bestehensquote des noch nicht aktivierten Prompt-Fixes.

## Ergebnis

| Runde | Bewertungen | Bestanden | Durchgefallen | Quote | Quellentreue-Fehler | Niveau-Fehler | Safety-Flags |
|---|---:|---:|---:|---:|---:|---:|---:|
| repair1 | 176 | 136 | 40 | 77,3 % | 35 von 40 Durchfällen | 11 | 24 |
| repair2 | 44 | 19 | 25 | 43,2 % | 25 von 25 Durchfällen | 8 | 18 |

Safety-Flags sind eine separate Kennzeichnung und nicht automatisch ein Durchfallgrund. Die beiden Runden sind keine gepaarten Stichproben: repair2 enthält nur die Fragen, die in diesen Läufen erneut bewertet wurden.

## Befund

- In Runde 1 waren 35/40 Durchfälle mit `source_fidelity_fail` markiert (87,5 %).
- In Runde 2 waren alle 25 Durchfälle mit `source_fidelity_fail` markiert.
- `buildRepairPrompt` übergab den Richter-Grund, aber keinen konkreten Textauszug aus der amtlichen Quelle.
- `MAX_REPAIR_RUNDEN = 2` und `repairZiele` begrenzen die Reparatur bereits auf zwei eindeutige `-repair<n>`-Läufe je Einheit. Diese Obergrenze bleibt bestehen; nach Runde 2 werden Einheiten nicht endlos weiter repariert.

## Reparatur

Der begleitende Code-Fix ergänzt Quellenauszüge für durchgefallene Fragen im Reparatur-Prompt. Der Prompt enthält weiterhin den Richter-Grund und weist das Modell an, den Auszug als Daten statt als Anweisungen zu behandeln. Die Quelle wird nur zur Laufzeit geladen und nicht gespeichert. Ein Unit-Test prüft, dass Quellenauszug und Richter-Grund im Prompt enthalten sind.

## Abnahmegrenze

Die Auswertung begründet die harte Obergrenze von zwei Reparatur-Runden: Die zweite Runde fällt in dieser Stichprobe unter 50 % Bestehensquote und wird überwiegend durch fehlende Quellenbelege verworfen. Ob der neue Quellenauszug die Quote verbessert, muss ein zukünftiger regulärer Lauf belegen; dieser Lauf wurde hier nicht ausgelöst.
