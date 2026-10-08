# SIN-361 — Wächter: übersprungene PR-Ereignis-Läufe von dispatch zählen nicht

- **Links:** Linear [SIN-361](https://linear.app/sinan-kahraman/issue/SIN-361/stillstand-laufe-ohne-fehler-aber-kein-worker-gestartet); Vorgänger [SIN-328](SIN-328-stillstand-ohne-log.md); [GitHub: Workflow-Läufe](https://docs.github.com/en/rest/actions/workflow-runs).
- **Entscheidung:** `collectLogs` (status.mjs) ignoriert Läufe mit Ergebnis `skipped` oder Ereignis `pull_request`. `dispatch.yml` hört auch auf PR-Ereignisse (Done/Blocker); der Dispatcher-Job wird dort übersprungen, der Lauf steht aber als letzter Lauf da und verdeckte den Zeitplan. Fixture-Test mit dem Log-Auszug aus SIN-361 ergänzt.
- **Annahmen:** Der Lauf #37704492311 (skipped) war ein solcher PR-Lauf; die Logs des Zeitplans waren ohne Zugriff nicht prüfbar. Ist der Zeitplan wirklich tot, meldet der Wächter nun „Kein Lauf gefunden (Zeitplan feuert nicht?)“.
- **Warum:** Der Wächter soll den Dispatcher am echten Zeitplan-Lauf messen, nicht an einem absichtlich übersprungenen.
