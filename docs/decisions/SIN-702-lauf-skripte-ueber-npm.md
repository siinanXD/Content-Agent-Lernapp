# SIN-702: Lauf-Skripte über npm run

- Issue: https://linear.app/sinan-kahraman/issue/SIN-702 (blockiert SIN-644)
- Entscheidung: npm-Skript `safety-sample` (`node --import tsx scripts/safety-sample.mjs`). Der Worker startet es über das schon erlaubte `Bash(npm run:*)`; `--allowedTools` in `worker.yml` bleibt unverändert, kein neues Muster. Der Worker-Prompt (`linear.mjs`) verweist fürs Lesen auf Read/Grep/Glob statt sed/grep/ls.
- Annahme: Das Skript braucht für `--live --json` keine Secrets (URL aus `docs/autonomy/config.json`); es bricht bereits mit Exit 1/2 und Meldung ab, wenn Quelle, Einheiten oder Abrufdatum fehlen.
- Warum: weniger Allowlist-Einträge, ein Weg für alle Lauf-Skripte.
- Offen: Label `needs-human` an SIN-644 entfernen und auf Todo setzen (nicht aus diesem Lauf möglich).
