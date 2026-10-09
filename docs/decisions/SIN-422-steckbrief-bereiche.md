# SIN-422: Steckbrief zeigt Bereiche statt einer Spur

Links: [SIN-422](https://linear.app/sinan-kahraman/issue/SIN-422/pr-steckbrief-bereiche-statt-einer-spur-frontend-backend-datenbank), [SIN-421](https://linear.app/sinan-kahraman/issue/SIN-421/leitstand-push-mitteilungen-aufs-iphone-braucht-dich-alarm-tages)

## Entscheidung

`bereicheAusDateien` in `scripts/autonomy/steckbrief.mjs` teilt die Dateien eines PR in sieben Bereiche ein (Datenbank, Infrastruktur, Deployment, Backend, Frontend, Inhalte, Doku und Tests), sortiert nach Tragweite, höchstens 6 Zeilen. `BEREICHE` ist exportiert, damit der Leitstand dieselbe Einteilung nutzt. `laneFromFiles` bleibt für Dispatcher und Bündeln.

## Annahmen

- Tests (`*.test.*`, `*.spec.*`, `tests/`, `e2e/`) zählen immer zu „Doku und Tests“.
- Dateien ohne Treffer (z. B. `tsconfig.json`, `eslint.config.mjs`) zählen zu Infrastruktur.
- Bei mehr als 6 Bereichen entfällt der unwichtigste („Doku und Tests“).
- Eigener Satz im PR-Text: Abschnitt `## Bereiche`, Zeilen `Bereich: Satz`; unbekannte Namen werden ignoriert.

## Warum

Ein PR mit Migration und neuer Seite hieß bisher nur „Frontend“; Sinan will sehen, wo sich etwas ändert.
