# Tokens mit Ablaufdatum (SIN-294)

Nur Namen, Orte, Ablauf und Rechte. **Nie Werte** in dieses Dokument oder ins Repo.

Die Status-Seite („Loop-Status“) liest die Tabelle und zeigt „läuft in X Tagen ab“. Ab 14 Tage vorher steht der Token im Tages-Update unter „Braucht dich“. Ablauf als `TT.MM.JJJJ`; `unbekannt` heißt: Sinan trägt das Datum nach (es ist im Repo nicht lesbar). `ca.` heißt: das genaue Datum ist per GitHub-API (`GET /user`) nicht lesbar, die Angabe ist die Mitte des Zeitraums. Wird ein Token erneuert, hier das neue Datum eintragen; das `sinan`-Issue „GitHub-Tokens erneuern“ (fällig 20.12.2026, SIN-310) schließt sich dann selbst.

Alle GitHub-Fine-grained-Tokens wurden Anfang Oktober 2026 mit 90 Tagen Laufzeit angelegt.

| Name | Ort | Ablauf | Rechte |
| --- | --- | --- | --- |
| cron-takt | GitHub (fein-granular), nur in cron-job.org hinterlegt | ca. 03.01.2027 | Repo `Content-Agent-Lernapp`, Actions: Read and write (Zeitraum 02.–04.01.2027) |
| Figma agents-read | Secret `FIGMA_ACCESS_TOKEN` (GitHub, Cloud-Agent) | 03.01.2027 | Figma-Datei nur lesen |
| agent-workflows | Secret `AGENT_WORKFLOW_TOKEN` (GitHub, Infisical) | 03.01.2027 | Repo: Contents RW, Pull requests RW, Issues RW, Workflows RW, Metadata R (Ablauf laut GitHub) |
| AGENT_VARIABLES_TOKEN | Secret `AGENT_VARIABLES_TOKEN` (GitHub), setzt und löscht `AGENT_PAUSED_UNTIL` | ca. 03.01.2027 | Repo: nur Variables RW (Zeitraum 02.–04.01.2027) |
