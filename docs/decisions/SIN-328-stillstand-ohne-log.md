# SIN-328 — Stillstand ohne Log: Ursache `ohne-start` statt `unbekannt`

- **Links:** Linear [SIN-328](https://linear.app/sinan-kahraman/issue/SIN-328/stillstand-ursache-nicht-erkennbar); Vorgänger [SIN-291](SIN-291-selbst-diagnose.md); [GitHub: Workflow-Läufe](https://docs.github.com/en/rest/actions/workflow-runs).
- **Entscheidung:** `collectLogs` (status.mjs) liefert auch für Workflows ohne roten letzten Lauf eine Zeile `Kein roter Lauf: <workflow>. <Stand>` (oder „Kein Lauf gefunden“). `diagnose.mjs` kennt dafür die Ursache `ohne-start` („Läufe ohne Fehler, aber kein Worker gestartet“) mit Hinweis auf den Dispatcher. Bei leerer Schlange wird sie ignoriert.
- **Annahmen:** Die Logs des Vorfalls waren leer („Keine Logs der letzten Läufe“), weil die letzten Läufe grün, abgebrochen oder nicht vorhanden waren. Die konkrete Ursache der 400 Min ohne Worker war ohne Zugriff auf die Läufe nicht prüfbar; der neue Pfad macht sie beim nächsten Vorfall sichtbar.
- **Warum:** Ein Bug-Issue „Ursache nicht erkennbar“ ist nicht bearbeitbar. Mit dem Stand der letzten Läufe und einem Dispatcher-Hinweis ist es das.
