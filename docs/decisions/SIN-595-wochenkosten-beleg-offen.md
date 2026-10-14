# SIN-595: Wochenkosten der Content-Fabrik, Beleg für Lauf ≤ 20 € steht aus

- Links: https://linear.app/sinan-kahraman/issue/SIN-595, `docs/decisions/SIN-588-kosten-beleg-offen.md`, `docs/decisions/SIN-569-kosten-deckel-befund.md`, `docs/quality/runs/cost-report-2026-10-13.json`, `docs/ops/content-runs/2026-10-12T09-44-47-533Z.json`
- Entscheidung: Kein Eintrag in `docs/product-readiness.json`. Im Repo liegt weiter nur der Bericht vom 13.10. (höchster Lauf 21,78 €, vor dem Teilbatch-Stichtag). Ein neuerer `content-grow`-Lauf mit Rohdaten ist nicht vorhanden. Kein neuer Code.
- Annahmen:
  - Der Lauf vom Mi 14.10. 05:47 UTC ist im Repo noch nicht als Bericht abgelegt; der Agent hat keinen Zugriff auf Actions-Läufe oder das Ledger und startet keinen Live-Lauf (API-Kosten, Freigabe).
  - Offen bleibt: (1) `run-task` → `cost-report` starten, (2) Bericht lesen, (3) bei `ok: true` Lauf-URL und `costEur` unter `gelaufen.betrieb-kosten` eintragen, (4) bei Überschreitung Ursache in der Schätzung benennen und Schwelle anpassen.
- Warum: Ein Beleg ohne Messung wäre erfunden.
