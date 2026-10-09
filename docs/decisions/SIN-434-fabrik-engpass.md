# SIN-434 — Content-Fabrik: Ursache für wenige Einheiten je Lauf ausweisen und Engpass beheben

- **Links:** Linear [SIN-434](https://linear.app/sinan-kahraman/issue/SIN-434), [SIN-406](SIN-406-fabrik-durchsatz.md) (Durchsatz), [SIN-431](SIN-431-indkfl-fabrik.md) (zweite Map), [SIN-378](SIN-378-fabrik-lauf-nachweis.md); Anthropic [Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)
- **Befund (Beleg: `docs/ops/content-runs/2026-10-08T09-08-54-902Z.json`, der einzige Live-Bericht im Repo):**
  - Erzeugt 20, bestanden 16, verworfen 4 (Richter unter Schwelle), nicht geliefert 0, ein Modul (ZP), kein Zeitlimit, kein Kostendeckel (2,43 € von 19 €).
  - Dieser Lauf lief vor SIN-406 (Ein-Modul-Plan). Seitdem gab es keinen Live-Lauf (Zeitplan wöchentlich, montags); die Wirkung von SIN-406 ist also noch nicht gemessen. „16 neu“ ist der alte Ein-Modul-Wert, kein Zeichen, dass SIN-406 nichts bringt.
  - **Größter Engpass im Code: die Kostenschätzung.** `eurPerUnit` teilte die *Gesamtkosten* des Laufs (2,43 €, davon 1,62 € Reparatur) durch die erzeugten Einheiten: 0,12 € je Einheit. Die Reparatur zieht die Planung aber schon als `spent` vom Stopp-Wert ab; sie zählte doppelt. Folge: `affordableUnits(0, 0,1215)` = 125 Einheiten je Lauf, obwohl Erzeugen und Richter nur ca. 0,04 € je Einheit kosten (ca. 340 Einheiten passen unter 19 €). Der Lauf nutzte höchstens 37 % der möglichen Menge, das Geld blieb ungenutzt.
  - Weitere Bremsen, nicht behoben:
    - Ein Lauf bedient eine Map (SIN-431), Metall kommt nur jeden zweiten Lauf. Gewollt, damit Industriekaufleute nicht warten.
    - Lücken in begonnenen Modulen (Phase A) plant die Fabrik nicht; die holt nur die Reparatur (AP-21), und die kennt nur ihre feste Liste verworfener Einheiten.
    - Wöchentlicher Zeitplan (D-46).
  - Eine Batch-Obergrenze gibt es nicht (Anthropic erlaubt bis 100.000 Anfragen je Batch); das Zeitlimit des Jobs (350 Min.) hat bisher nicht getroffen.
- **Entscheidung:**
  1. Lauf-Bericht (`RunReport`, `linearSummary`, JSON in `docs/ops/content-runs/`) nennt je Lauf erzeugt, bestanden, verworfen (mit Einheiten-IDs) und `nichtVersucht` mit Grund: `kostendeckel`, `zeitlimit`, `begonnene-module`, `andere-map` (offene Einheiten je Grund, Funktion `nichtVersucht`).
  2. Zeitlimit des Batches (`pollBatchUntilDone`) ist jetzt ein Stopp mit Grund im Bericht (nichts wird veröffentlicht, wie bisher), statt als Absturz ohne Bericht zu enden.
  3. Engpass behoben: `unitCostHistory` zieht die Reparaturkosten ab, bevor `eurPerUnit` rechnet. Qualitäts-Schwelle (`QUALITY_THRESHOLDS`, `MIN_PASSED_QUESTIONS`), `RUN_CAP_EUR` 20, `RUN_STOP_EUR` 19, `COST_MARGIN` 1,25 und `BUDGET_EUR` bleiben unverändert (Tests aus SIN-406).
- **Annahmen:**
  - Die Kosten je Einheit bleiben bei ca. 0,04 € (Preis, Modell, Prompts unverändert). Stimmt das nicht, hebt der nächste Bericht die Schätzung an; der Stopp bei 19 € greift weiterhin hart (`assertWithinRunCap`).
  - Die 4 parallelen Richter-Chunks aus SIN-406 bleiben.
  - Nachweis: nächster Live-Lauf, Felder `generated`, `nichtVersucht`, `costEur` im Bericht. Bleibt `nichtVersucht` bei `begonnene-module` groß, ist die Reparatur-Abdeckung der nächste Engpass (eigenes Issue).
- **Warum:** Ein Rechenfehler in der Planung begrenzte die Menge, nicht Geld, Zeit oder Qualität. Ihn zu beheben kostet keine Schwelle und lockert keinen Deckel.
