# SIN-862 — Reparatur-Audit (22.10.2026)

## Umfang

Read-only-Auswertung aus der produktiven Tabelle `question_evaluations`. Kurs-ID `e22073de-7020-4380-9002-c70d46c25e25` entspricht `Maschinen- und Anlagenführer`. Prompt-Version: `2026-10-v2`, Richter: `gpt-5.4-mini`. Zeitraum: letzte 24 Stunden. Es wurden nur Bewertungen aus `-repair1` und `-repair2` betrachtet. Kein neuer kostenpflichtiger Lauf wurde gestartet.

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
