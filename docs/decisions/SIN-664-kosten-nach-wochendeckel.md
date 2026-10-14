# SIN-664: Kosten pro Kurslauf nach Wochendeckel, Zwischenstand

- Links: https://linear.app/sinan-kahraman/issue/SIN-664, `docs/decisions/SIN-661-wochendeckel-vor-start.md`, `docs/ops/content-runs/2026-10-14T10-39-21-371Z.json`
- Entscheidung: Kein Code geändert. Der Lauf vom 14.10. (nach SIN-661) liegt unter dem Deckel: `costEur` 14,89 € von 20 € (davon Reparatur 2,54 €), `stopReason` null; 52 Einheiten blieben wegen `kostendeckel` unversucht (Teilbatch-Deckel greift). Die Überschreitung vom 12.10. (21,78 €) ist in diesem einen Lauf nicht wieder aufgetreten.
- Annahmen:
  - Der Kostenbericht (`run-task cost-report`) läuft nur im Workflow `run-task.yml` mit Datenbank-Zugang; in diesem Agentenlauf nicht verfügbar. Es gibt deshalb keine Rohdatei `docs/quality/runs/cost-report-*.json` nach SIN-661 und keine Wochensumme. `docs/product-readiness.json` bleibt unverändert, ein Eintrag ohne Messung wäre erfunden.
  - Offen bleiben Akzeptanzkriterium 1 (Rohdatei) und die Wochensumme unter 40 €. Nachholen: `run-task` mit Aufgabe `cost-report` starten, Rohdatei committen, Kennung `kosten` mit Lauf-Link und Datum eintragen. Das Issue bleibt „In Review“.
- Warum: Ohne Messung kein Beleg; der Einzellauf ist ein Hinweis, kein Nachweis für die Woche.
