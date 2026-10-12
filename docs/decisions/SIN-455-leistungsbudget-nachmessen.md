# SIN-455: Leistungsbudget sichtbar machen, Ausreißer einmal nachmessen

- **Links:** Linear [SIN-455](https://linear.app/sinan-kahraman/issue/SIN-455); Vorgänger [SIN-329](SIN-329-lighthouse-aufwaermlauf.md) (Aufwärmlauf, Median aus 7), [SIN-322](SIN-322-ci-gates-entsperren.md) (10 % Toleranz auf LCP und TBT), SIN-300 (Budget).
- **Befund:** Seit 05.10. scheiterten 13 von 100 CI-Läufen nur am Schritt „Leistungsbudget (Lighthouse)“ und liefen beim zweiten Versuch grün. Folgen: Reparatur-Runden und Revert-PRs für fehlerfreie Commits (#259 nahm die Doku-Änderung #255 zurück). Welche Route und welcher Wert riss, war nicht lesbar (Logs nur über Blob-Speicher, Anmerkung „exit code 1“).
- **Entscheidung:**
  1. Jede Route schreibt eine `::notice`-Anmerkung mit allen Messwerten und Grenzen, jede Verletzung eine `::error`-Anmerkung. Damit sind die Werte über die Check-API lesbar, auch ohne Log.
  2. Reißt eine Route die Grenze, wird sie einmal nachgemessen (Aufwärmlauf plus Median aus `runs` Läufen). Rot nur, wenn auch die Nachmessung reißt. Die erste Messung steht als `::warning` im Lauf.
- **Grenzen und Toleranz bleiben unverändert** (AGENTS.md: nie anheben, um einen Merge durchzubekommen).
- **Warum:** Eine echte Verschlechterung reißt beide Messungen und bleibt rot. Zufälliges Rauschen des CI-Rechners trifft selten zweimal hintereinander. Mehr Läufe pro Messung (SIN-329) haben das Rauschen nicht genug gesenkt.

## Annahmen

- Lokal nicht messbar: Der Build braucht Google Fonts, die der Proxy hier sperrt. Die Ursache (welche Route) zeigen die neuen Anmerkungen beim nächsten Ausreißer.
- Zeigen die Warnungen immer dieselbe Route knapp an der Grenze, ist die Seite zu verbessern (wie SIN-345), nicht das Gate.
- Mehrkosten: nur bei einem Ausreißer etwa 1 bis 2 Minuten mehr CI-Zeit.
