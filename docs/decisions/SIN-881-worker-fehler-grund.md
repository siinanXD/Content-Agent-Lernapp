# SIN-881: Worker-`fehler` trägt immer einen Grund

- Issue: https://linear.app/sinan-kahraman/issue/SIN-881
- Entscheidung: `leitstand.mjs` baut bei `worker` + `fehler` ohne `--grund` selbst einen (`workerGrund`): Claude-Limit („Kontingent“), Schritt-Ergebnis von claude/claude2, Fehlerzeile aus dem execution_file (geschwärzt, max. 300 Zeichen), sonst „kein Diff“. `buildEvent` setzt als letzte Stufe einen Standardgrund, damit die Spalte `grund` nie leer bleibt.
- Annahmen: Die Run-Logs der vier Läufe vom 20.10.2026 waren in dieser Sitzung nicht lesbar (`gh` ohne Freigabe); die Ursache ist dort noch nachzutragen. `fehler` bleibt „kein PR“; ob Content-Aufträge ohne PR als `ok` gelten, hängt an dieser Diagnose und ist hier nicht entschieden.
- Warum: Ein roter Leitstand ohne Grund lässt Limit, Abbruch und unklaren Auftrag nicht unterscheiden. Die Ableitung im Skript ist testbar, im YAML nicht.
