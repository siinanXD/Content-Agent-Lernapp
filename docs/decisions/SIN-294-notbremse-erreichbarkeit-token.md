# SIN-294 — Notbremse, Erreichbarkeits-Prüfung und Token-Ablauf

- **Links:** Linear [SIN-294](https://linear.app/sinan-kahraman/issue/SIN-294/notbremse-erreichbarkeits-prufung-der-app-und-token-ablauf-im-blick); [GitHub: `workflow_dispatch`-Eingaben (`choice`)](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs); [GitHub CLI: `gh variable set`](https://cli.github.com/manual/gh_variable_set); [GitHub REST: Variables](https://docs.github.com/en/rest/actions/variables); [cron-job.org](https://cron-job.org); Vorgänger [SIN-246](SIN-246-tages-update.md).
- **Entscheidung:**
  1. **Notbremse:** `loop-pause.yml` setzt oder löscht die vorhandene Variable `AGENT_PAUSED_UNTIL` (kein neuer Mechanismus); die Berechnung steht in `scripts/autonomy/pause.mjs` (rein, getestet). Dispatcher und Planer prüfen die Variable schon (`budget.mjs`). Die Status-Seite zeigt „Pausiert bis …“.
  2. **Erreichbarkeit:** `/api/health` prüft zusätzlich die Datenbank (eine Lesezeile aus `courses`, 4 s Zeitlimit) und antwortet `503`, wenn sie fehlt. Der Wächter ist cron-job.org (alle 5 Min, E-Mail bei Fehler), kein neuer Dienst und kein Workflow.
  3. **Token-Ablauf:** Die Tabelle `docs/autonomy/tokens.md` ist die Quelle; `scripts/autonomy/tokens.mjs` liest sie. Status-Seite: Abschnitt „Token-Ablauf“. Tages-Update: ab 14 Tagen vor Ablauf unter „Braucht dich“.
- **Annahmen:**
  1. `fortsetzen` löscht die Variable (`gh variable delete`) statt sie leer zu setzen; `gh variable set` verlangt einen Wert, und „leer“ und „nicht gesetzt“ heißen für `parsePausedUntil` dasselbe.
  2. Pause höchstens 30 Tage (720 h), Standard 24 h: ein Tippfehler auf dem Handy soll den Loop nicht für immer anhalten. Dispatcher, Planer, Nachfüllen und Kick des Status-Workflows beachten die Pause schon.
  3. Die Pause stoppt keine laufenden Worker (Abbrechen geht in den Actions von Hand); sie verhindert nur neue Starts.
  4. `AGENT_VARIABLES_TOKEN` ist schon optionales Secret des Workers (SIN-223), kein neues Secret. Ohne es schlägt `loop-pause` sichtbar fehl, statt still nichts zu tun.
  5. Ein DB-Ausfall liefert `503`, obwohl die App selbst läuft: Der Zweck ist, den Ausfall zu melden. Bei Mock-Speicher (lokal, Tests) gilt die DB als erreichbar (`db: "mock"`). Der Service-Key wird nur serverseitig genutzt und nie ausgegeben.
  6. Die Ablaufdaten von `agent-workflows` und `AGENT_VARIABLES_TOKEN` sind im Repo nicht lesbar und stehen als `unbekannt`; ich erfinde keine. Nur `cron-takt` und Figma `agents-read` (03.01.2027) kommen aus dem Issue.
  7. Die cron-job.org-Einrichtung und der Live-Test der Pause am echten Repo brauchen Sinans Zugänge und konnten hier nicht laufen. Getestet sind die Berechnung, die Auswertung durch `isPaused`, die Status-Anzeige und die Token-Warnung mit Fixtures.
- **Warum:** Drei kleine Bausteine mit vorhandenen Mitteln (Repo-Variable, cron-job.org, eine Markdown-Tabelle): keine neue Abhängigkeit, kein neuer Dienst, am Handy bedienbar.
