# SIN-538: API-Tests mit Newman

- Issue: https://linear.app/sinan-kahraman/issue/SIN-538
- Code: `docs/api/postman-collection.json`, `scripts/api-test.mjs`, `package.json` (`api:test`)

## Entscheidung

- Die vorhandene Postman-Collection bekommt Prüfungen (Status, JSON, `courseId`, Fehlercodes) und zwei Negativfälle (400 ohne `keyword`, 404 unbekannter Kurs). Neu ist ein Health-Aufruf am Anfang.
- Ausführer ist [Newman](https://github.com/postmanlabs/newman) (Apache-2.0, über 7.000 Sterne, Postmans eigener CLI-Läufer), als Dev-Abhängigkeit. Eigenbau wäre mehr Code und würde die Collection nicht nutzen.
- `npm run api:test -- --serve` startet `next start` selbst (wie `perf:budget`), läuft mit Mock-Speicher ohne Keys.
- Publish gilt als bestanden bei jedem Status unter 500: die Qualitäts-Schwelle darf mit 422 ablehnen.

## Annahmen und Grenzen

- Der Linear-Auftrag war im Worker nicht lesbar (`auftrag.ts` brauchte eine Freigabe); umgesetzt nach Issue-Titel.
- Den CI-Schritt hinter `Playwright` darf der Worker nicht anlegen (Workflow-Änderungen sind ihm gesperrt, und sie sind `risk:medium`). Zeile für `ci.yml`, nach dem Schritt „Smoke + accessibility": `- name: API-Tests (Newman)` mit `run: npm run api:test -- --serve` und `env: COURSE_STORAGE: mock`.
- `npm audit` meldet für Newmans Abhängigkeiten Funde; sie laufen nur in CI und lokal, nie in der ausgelieferten App.
