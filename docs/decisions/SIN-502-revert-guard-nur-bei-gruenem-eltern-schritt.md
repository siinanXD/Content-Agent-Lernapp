# SIN-502: revert-guard nimmt nur zurück, wenn derselbe Schritt davor grün war

- Issue: https://linear.app/sinan-kahraman/issue/SIN-502
- Baut auf: [SIN-252](SIN-252-gate-lockern.md), [SIN-333](SIN-333-gate-bruch-frische-laeufe.md). Auslöser: 12.10., schwankendes Leistungsbudget (SIN-500) nahm SIN-491 und SIN-493 zurück.

## Entscheidung

- Reine Logik `decideRevert` in `scripts/autonomy/revert-guard.mjs`, Netz (gh api, Linear) getrennt in `main`; der Workflow ruft sie vor dem Revert auf.
- Roter Schritt (`Job / Schritt`) auf dem Eltern-Commit rot oder nicht gelaufen → kein Revert, Bug-Issue `Bug: Gate-Bruch auf main: <Lauf> / <Job / Schritt>` (ohne Dublette).
- Höchstens 1 Revert je Stunde (Branches `claude/revert-*`, alle Stände). Zweiter roter Lauf in der Stunde oder roter Revert-Commit → kein Revert, Aufgabe mit Label `sinan`.

## Annahmen

- Fehlt der Eltern-Lauf (z. B. `nach-deploy` lief auf dem Eltern-Commit nicht), gilt der Schritt als „nicht gelaufen“: kein Revert, Gate-Bruch-Issue. Lieber ein Issue zu viel als ein unschuldiger Revert.
- Lässt sich der Abruf nicht lesen, entscheidet das Skript auf „nichts“ (kein Revert).
- Ein roter Lauf ohne erkennbaren roten Schritt führt zu „nichts“.

## Warum

Ein Revert hilft nur, wenn der Commit die Ursache ist. Schwankende oder schon vorher rote Schritte machen Reverts zu Kettenreaktionen.
