# SIN-391 — Live-Check rot: fehlgeschlagene Prüfungen nennen

**Links:** SIN-319 (Live-Check), `scripts/autonomy/live-check.mjs`, `.github/workflows/nach-deploy.yml`, `docs/ops/live-checkliste.md`

## Entscheidung

- `buildReport` hängt die roten Kennungen an die Zusammenfassung: `Live-Check 14:14: 76/77 ROT (UI-12)`. Jede Kennung einmal (Handy und Desktop zählen als eine), höchstens 5, danach „+N weitere“. „Nur Hinweis“-Prüfungen (SE-01) zählen nicht.
- `NOTE_RE` liest den Klammerzusatz; die Zeile im Loop-Status zeigt ihn an.
- `nach-deploy.yml` bleibt unverändert: `report` schreibt `::error::<Zusammenfassung>` und den Step-Output `summary` schon aus `report.summary`; der Status-Wächter liest die Annotation über `collectLiveCheck`. Keine neuen Rechte oder Secrets.
- Keine Prüfung abgeschaltet, keine Schwelle gelockert.

## Annahmen

- Wie viele Prüfungen aktuell rot sind, ist aus der Agenten-Umgebung nicht lesbar (Logs und Artefakte gesperrt). Laut Issue 1 bis 2 von 77; der nächste Lauf nach dem Merge nennt sie.

## Warum

Ohne Kennung kann kein Korrektur-Issue angelegt werden, und dauerhaftes Rot droht gute Deploys zurückzusetzen.
