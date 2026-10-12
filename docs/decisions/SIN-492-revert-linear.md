# SIN-492: Zurückgenommenes Issue in Linear wieder öffnen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-492
- Code: `scripts/autonomy/revert-linear.mjs`, Job `linear` in `.github/workflows/revert-guard.yml`

## Entscheidung

Nach jedem CI-Lauf auf main prüft ein Skript, ob der Commit der gemergte Revert-PR von revert-guard ist (Branch `claude/revert-*`). Dann: Linear-ID aus dem Titel, Issue auf „Todo“, Kommentar mit Revert-PR, Original-PR und rotem Lauf, Ereignis `REVERT` (Agent `pruefen`) in `loop_events`. Kommt dasselbe Issue ein zweites Mal zurück, bekommt es das Label `needs-human`, der Status bleibt.

## Annahmen

- Die Zahl der Rücknahmen wird an den eigenen Kommentaren („revert-guard: zurückgenommen …“) gezählt; das ist idempotent über den Revert-PR-Link.
- Fehlende Secrets oder API-Fehler sind nie fatal (Warnung im Log).
- Eigenbau, weil es nur wenige Aufrufe auf vorhandene Linear-Helfer sind; keine neuen Abhängigkeiten.

## Warum

Ohne Wiederöffnen zählt zurückgenommene Arbeit als erledigt.
