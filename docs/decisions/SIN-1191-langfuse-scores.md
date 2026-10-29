# SIN-1191 · Langfuse: Richter-Scores je Frage von 6 auf 2

Stand: 2026-10-29. Entscheidung Sinan (Linear, 29.10.): Option 1. Je Frage bleiben in Langfuse nur `bestanden` und `Sicherheit`. `Quellentreue`, `Eindeutigkeit`, `Niveau`, `Sprache` stehen nur noch als Metadaten an „Prüfen · Frage n“. Die vier Verlaufskacheln dürfen wegfallen. `question_evaluations` (Supabase, Quelle des Qualitäts-Tors) erhält weiter alle Prüfpunkte.

Quelle der Abrechnung: https://langfuse.com/docs/administration/billable-units (Traces, Observations und Scores zählen je eine Unit; abgerufen im Rahmen von SIN-1048, siehe `SIN-1048-langfuse-verbrauch.md`).

## Änderungen

- `src/lib/quality/unit-traces.ts`: je Frage 2 Scores (`Sicherheit`, `bestanden`). Die Prüfpunkte standen schon in den Metadaten der Beobachtung und bleiben unverändert dort.
- Dashboard „Kurslauf: Kosten und Qualität“: Kachel „Schwächster Prüfpunkt“ entfällt (5 → 4 Kacheln). `docs/ops/langfuse-dashboard.md` und `scripts/langfuse-setup.ts` (Kommentar) stimmen mit den verbliebenen Scores überein. Die Score-Configs für die vier Prüfpunkte bleiben, weil der Richter-Lauf sie weiter als Mittelwert je Lauf schreibt (`pruefpunktScores`, wenige Units je Lauf).
- `scripts/sin260-judge-backfill.ts`: siehe nächster Abschnitt.

## Herkunft von `safetyFlag` und `language` (je ≈ 12 200 im Oktober)

Gefunden im Code (kein Zugriff auf Langfuse-Daten in diesem Lauf):

- `recordEvaluationTrace` (`src/lib/quality/langfuse-client.ts`) schreibt jeden Eintrag von `payload.scores` als Score unter dem Schlüsselnamen.
- Hauptquelle ist `scripts/sin260-judge-backfill.ts`: je Frage `scores: { ...q.scores }`, also **fünf** Scores mit den englischen Schlüsseln `sourceFidelity`, `uniqueness`, `niveau`, `language`, `safetyFlag`. Das sind Dubletten von `Quellentreue`, `Eindeutigkeit`, `Niveau`, `Sprache`, `Sicherheit` (gleiche Werte, anderer Name, anderer Pfad als `unit-traces.ts`).
- Kleine Mengen (je Lauf statt je Frage): `scripts/ap15-phase-a.ts`, `scripts/ap15-regen-dropped.ts` (je 5 Mittelwerte) und `evaluate-agent.ts` (`safetyFlag`). Unverändert, weil nur wenige Units je Lauf.

Entscheidung: Der Backfill schreibt die Werte nur noch als Metadaten (`scores: {}`, Werte in `metadata`). Annahme: Dass nur `safetyFlag` und `language` im Oktober mit ≈ 12 200 auftauchen, liegt an der Auswertung im Issue-Kommentar; die drei übrigen Schlüssel kommen aus demselben Spread und fallen mit weg. Nicht gemessen.

## Zahlen vorher/nachher

Je Frage („Prüfen · Frage n“ plus Scores), Units nach der Abrechnungsregel oben:

| | Beobachtung | Scores | Units |
| --- | --- | --- | --- |
| vorher | 1 | 6 | 7 |
| nachher | 1 | 2 | 3 |

Je Einheit mit 5 Fragen (1 Trace, 3 feste Beobachtungen „Einheit“, „Erzeugen“, „Ergebnis“, dazu die Fragen): vorher 1 + 3 + 5 × 7 = **39**, nachher 1 + 3 + 5 × 3 = **19** Units (−51 %).

Oktober (aus dem Linear-Kommentar vom 29.10., Metrics-API, nicht neu gemessen): Scores 224 003 von insgesamt ≈ 286 137 Units. Nur mit den zwei Scores je Frage ≈ 46 000 Scores, gesamt ≈ 108 000 Units (≈ 216 % von 50 000). Fällt der Backfill-Spread (`safetyFlag`, `language` und Geschwister) weg, sinkt der Wert weiter; die genaue Zahl liefert erst die Messung nach dem nächsten Monat.

Folge: Im Alltag (22–49 Units am Tag) ändert sich wenig. Der Gewinn zeigt sich bei Massenläufen. Ein Massenlauf bleibt ohne `LANGFUSE_SAMPLE_RATE` für Traces und Observations über dem Kontingent; Sampling der Scores bleibt bewusst aus, weil das Qualitäts-Tor `question_evaluations` liest.
