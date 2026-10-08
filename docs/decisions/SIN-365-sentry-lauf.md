# SIN-365 — Produktreife Sentry: Lauf mit echten Daten

- **Links:** Linear [SIN-365](https://linear.app/sinan-kahraman/issue/SIN-365), [SIN-289](SIN-289-sentry-fabrik-status.md) (Werkzeug gebaut), [SIN-259](SIN-259-sentry-anbindung.md); Sentry [Issues-API](https://docs.sentry.io/api/events/list-a-projects-issues/), [EU-Region](https://de.sentry.io)
- **Entscheidung:** Den Planer-Workflow (`.github/workflows/planner.yml`) mit den Sentry-Secrets (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) manuell starten, um zu prüfen, dass:
  1. Die Sentry-Kennzahlen korrekt abgerufen werden (`sentry` = Anzahl ungelöster Fehler, `sentry_kritisch` = Anzahl kritischer Fehler in den letzten 7 Tagen)
  2. Keine offenen kritischen Fehler (`sentry_kritisch == 0`) vorhanden sind
  3. Das Ergebnis in `docs/product-readiness.json` mit Datum und Beleg eingetragen wird
- **Annahmen:**
  - Sentry-Projekt ist in der EU konfiguriert (ingest.de.sentry.io)
  - Die Secrets sind in den GitHub Actions Secrets verfügbar
  - Der Planer-Workflow läuft ohne Fehler und generiert die Kennzahlen
- **Blocker:** Dieser Branch kann die Secrets nicht direkt abrufen (sie sind in GitHub Actions geschützt). Sinan muss den Planer-Workflow über das GitHub UI oder die CLI starten: `gh workflow run planner.yml --ref claude/sin-365-sentry-verify` oder im Workflow-UI die manuelle Ausführung triggern. Der Agent kann danach die Ergebnisse aus der Workflow-Ausgabe in die product-readiness.json eintragen.
- **Warum:** Die Sentry-Anbindung (SIN-289) ist gebaut, wurde aber noch nie mit echten Daten gemessen. Das ist ein Produktreife-Kriterium (`betrieb-sentry`). Der Lauf verifiziert, dass das System Fehler korrekt erfasst und meldet.
