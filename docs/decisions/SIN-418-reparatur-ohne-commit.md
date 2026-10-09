# SIN-418: Reparatur ohne Commit lässt PR nicht mehr liegen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-418
- Betrifft: `.github/workflows/repair.yml`, `scripts/autonomy/status.mjs`, `scripts/autonomy/diagnose.mjs`

## Entscheidung

1. `repair.yml`: Nach Claudes Lauf wird der PR-Head-SHA mit dem des roten `ci`-Laufs verglichen. Unverändert → `gh run rerun` auf den roten `ci`-Lauf. Das löst `workflow_run` erneut aus; `repair` zählt die nächste Runde, nach Runde 3 setzt es `needs-human`. Scheitert der Rerun, setzt der Schritt `needs-human` selbst.
2. Wächter: Offener Agenten-PR mit roter `ci`, Head-Commit älter als 30 Min, ohne `needs-human`/`no-autorepair`/`gate-bruch` und ohne aktiven `repair`-Lauf → Meldung und Rerun des roten `ci`-Laufs. Ein Anstoß je Commit (Merker `repairKicks` im Status-Issue).

## Annahmen

- Der Rerun läuft mit `AGENT_WORKFLOW_TOKEN`, daher keine neuen `permissions` im Workflow.
- Commit-Zeit statt `updated_at` des PRs, weil Labels und Kommentare `updated_at` verschieben.

## Warum

Ohne neuen Commit startet `ci` nicht neu; `repair` hängt an `ci` und bleibt stumm (PR #227, 00:42 bis 01:50). Rerun statt Neuaufbau der Runden-Logik hält die Stopp-Regel (3 Runden) an einer Stelle.
