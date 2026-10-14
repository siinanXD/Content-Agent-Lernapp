# SIN-643: dispatch-Läufe getrennt holen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-643
- Vorgänger: SIN-362 (gleiche Lücke bei worker.yml), SIN-328, SIN-584

## Entscheidung

`collectGithub` (`scripts/autonomy/status.mjs`) holt die Läufe von `worker.yml` und `dispatch.yml` zusätzlich je Workflow (100 je Abruf).

## Annahmen

- Der Zeitplan von `dispatch.yml` feuert; die Läufe fehlten nur in der Liste der 100 jüngsten Läufe aller Workflows (PR-Ereignisse, CI, Worker). Der echte letzte Lauf war nicht prüfbar (kein Zugriff auf die Actions-Logs im Agent-Lauf).
- `dispatch.mjs` und `dispatch.yml` bleiben unverändert.

## Warum

Ohne den getrennten Abruf meldet der Wächter „Kein Lauf gefunden“ und legt einen Stillstand an, obwohl der Dispatcher läuft. Der Fixture-Test sichert Log-Auszug → `ohne-start` → Bug-Issue.
