# Tokens mit Ablaufdatum (SIN-294)

Nur Namen, Orte, Ablauf und Rechte. **Nie Werte** in dieses Dokument oder ins Repo.

Die Status-Seite („Loop-Status“) liest die Tabelle und zeigt „läuft in X Tagen ab“. Ab 14 Tage vorher steht der Token im Tages-Update unter „Braucht dich“. Ablauf als `TT.MM.JJJJ`; `unbekannt` heißt: Sinan trägt das Datum nach (es ist im Repo nicht lesbar). Wird ein Token erneuert, hier das neue Datum eintragen.

| Name | Ort | Ablauf | Rechte |
| --- | --- | --- | --- |
| cron-takt | GitHub (fein-granular), nur in cron-job.org hinterlegt | 03.01.2027 | Repo `Content-Agent-Lernapp`, Actions: Read and write |
| Figma agents-read | Secret `FIGMA_ACCESS_TOKEN` (GitHub, Cloud-Agent) | 03.01.2027 | Figma-Datei nur lesen |
| agent-workflows | Secret `AGENT_WORKFLOW_TOKEN` (GitHub, Infisical) | unbekannt | Repo: Contents RW, Pull requests RW, Issues RW, Workflows RW, Metadata R (SIN-234: Ablauf 1 Jahr) |
| AGENT_VARIABLES_TOKEN | Secret `AGENT_VARIABLES_TOKEN` (GitHub), setzt und löscht `AGENT_PAUSED_UNTIL` | unbekannt | Repo: nur Variables RW |
