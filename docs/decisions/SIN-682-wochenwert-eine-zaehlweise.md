# SIN-682: Ein Wochenwert für Planer und cost-report, Beleg offen

- Links: https://linear.app/sinan-kahraman/issue/SIN-682, `docs/decisions/SIN-672-wochendeckel-zaehlt-alle-laeufe.md`, `docs/decisions/SIN-661-wochendeckel-vor-start.md`, `docs/decisions/SIN-645-wochenkosten-unter-40.md`
- Ursache der Abweichung 40,55 € (kosten_woche) gegen 39,10 € (Planer-Bericht):
  - `costResult` (`run-task.mjs`, Lauf `cost-report`) rechnete die 7-Tage-Summe noch mit einer eigenen Kopie der Formel; SIN-672 hatte nur Planer und Fabrik auf `weekCost` gestellt.
  - Die Planer-Kennzahl las die letzten 100 Zeilen, `cost-report` die letzten 200. Bei vielen kleinen Zeilen (judge-backfill, goldset-regression) fällt bei 100 ein Teil der Woche heraus.
  - Beide Werte wurden zu verschiedenen Zeitpunkten gemessen; in der Zwischenzeit kamen Ledger-Zeilen hinzu bzw. fielen aus dem 7-Tage-Fenster.
- Entscheidung: `costResult` nutzt `weekCost` (`scripts/autonomy/week-cost.mjs`); Planer und `cost-report` laden beide `LEDGER_LIMIT` (200) Zeilen. Test in `src/lib/autonomy/run-task.test.ts`: gleiche Zeilen ergeben denselben Wochenwert, ein Lauf knapp außerhalb von 7 Tagen zählt nicht.
- Annahmen:
  - Die genauen Ledger-Zeilen vom Messzeitpunkt liegen dem Agenten nicht vor (kein Zugriff auf `pipeline_run_costs`). Die drei Punkte oben sind die Unterschiede im Code, nicht eine Zeile-für-Zeile-Nachrechnung der 1,45 €.
  - Über 200 Läufe pro Woche würden beide Werte gleichermaßen zu klein; heute weit entfernt.
- Beleg in `docs/product-readiness.json` bleibt unverändert: Der Agent startet keinen bezahlten Live-Lauf und hat keine Secrets; ein Eintrag ohne Messung wäre erfunden. Der höchste Einzellauf im Ledger seit den Teilbatches ist 14,89 € (14.10., Bericht `docs/ops/content-runs/2026-10-14T10-39-21-371Z.json`, unter 20 €). Der Bericht vom 13.10. nennt 21,78 € (Lauf vom 12.10. vor den Teilbatches); `cost-report` zählt seit `TEILBATCH_SEIT` nur neuere Läufe für das Ziel.
- Folge-Hinweis an den Planer: `run-task cost-report` (Aufgabe `betrieb-kosten`) ausführen, Lauf-Link, Ø und höchsten Lauf eintragen. Erst dann das Issue auf „Done“.
- Warum: Kleinste Änderung, die beide Auswertungen auf dieselbe Zählweise und dasselbe Fenster bringt.
