# SIN-257: Lighthouse und axe über alle Routen

- **Links:** Linear [SIN-257](https://linear.app/sinan-kahraman/issue/SIN-257), [axe-core Regeln](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md), [Lighthouse](https://github.com/GoogleChrome/lighthouse), [WCAG 2.5.8 Zielgröße](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Entscheidung:** Die Routenliste liegt in `e2e/routes.ts` (alle 15 Seiten unter `src/app`). `e2e/a11y.spec.ts` prüft sie mit axe (Tags wcag2a/2aa/21a/21aa/22aa) und lässt jede Verletzung scheitern, nicht nur „critical/serious“. Neu `e2e/tastatur.spec.ts`: Tab-Durchlauf je Route, sichtbarer Fokus (Outline oder Box-Shadow) und Zielhöhe ≥ 44 px. `scripts/lighthouse-gate.mjs` liest die Routen aus `src/app`, misst Performance, Barrierefreiheit, Best Practices und SEO (mobil, Schwelle 0,9 je Kategorie) und schreibt mit `--out` eine JSON-Messung mit Datum. Keine neuen Pakete, kein Produktcode geändert, CI-Workflow unverändert (axe und Tastatur laufen dort schon über `npx playwright test`).
- **Annahmen:**
  - Die Sandbox dieses Laufs hatte kein Chromium und keinen Download (Installation nicht freigegeben). Es wurde nichts gemessen. `docs/product-readiness.json` bleibt deshalb unverändert: Einträge für `qual-lighthouse`, `qual-axe`, `qual-wcag` kommen erst mit echtem Messwert und Datum (`npm run build && npm start -- --port 43123`, dann `npm run test:lighthouse -- --out messung.json`).
  - Befunde aus dem ersten CI-Lauf werden im selben PR repariert (höchstens 3 Runden).
  - Routen ohne Zustand (`/ergebnis`, `/einheit/unit-03`) zeigen ihren Leer-/Fehlerzustand; auch der wird geprüft.
  - Links im Fließtext (`display: inline`) sind nach WCAG 2.5.8 vom 44-px-Maß ausgenommen.
  - Lighthouse läuft nicht in der CI (Laufzeit, Streuung der Performance-Werte); es ist ein manuell/lokal ausgeführtes Messskript.
- **Warum:** „Lighthouse ≥ 90, axe ohne Fehler, WCAG 2.2 AA“ war nur für vier Routen und nur für die Kategorie Barrierefreiheit geprüft. Dieselbe Routenliste für axe und Tastatur verhindert, dass eine neue Seite unbemerkt fehlt.
