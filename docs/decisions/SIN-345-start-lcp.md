# SIN-345: `/start` LCP unter das Budget

Links: [Linear SIN-345](https://linear.app/sinan-kahraman/issue/SIN-345/gate-bruch-start-lcp-2756-ms-uber-budget-blockiert-4-prs), Vorgänger SIN-329 (Aufwärmlauf), SIN-311 (LCP), SIN-315 (Willkommen).

## Entscheidung

- `/start` leitet beim ersten Start serverseitig nach `/willkommen` (`redirects()` in `next.config.ts`, Bedingung: Cookie `cal-onboarded` fehlt). Vorher wechselte die Seite erst nach Laden und Hydration per `router.replace`.
- Das Cookie setzt das Inline-Skript im `<head>` (`src/app/layout.tsx`), sobald die Einwilligung beantwortet ist. `/willkommen` springt bei beantworteter Einwilligung ohne Cookie (Bestandsnutzer) vor dem ersten Bild zurück nach `/start`.
- Grenzen und Toleranz in `performance-budget.json` unverändert.

## Annahmen

- Gemessen wird in Wahrheit `/willkommen` (die Schlagzeile `h1.text-[40px]`), nicht `/start`: Der Messlauf hat leeren Speicher, die Seite wechselte per JS. Dokument, CSS und JS wurden dadurch zweimal geladen, daher der Aufschlag von rund 700 ms gegenüber `/` (Lauf vorher: 2788 und 2755 ms).
- `display: "optional"` für Geist getestet: keine Verbesserung (2609 bis 2755 ms), nicht übernommen. Auch ein früheres Inline-Skript auf `/start` brachte nur 2643 ms.
- Nach der Änderung 3 lokale Läufe `npm run perf:budget -- --serve`: `/start` 2006, 2011, 2108 ms (Grenze 2500).
- Das Cookie enthält keine Personendaten, nur „Einwilligung beantwortet“.

## Warum

Ein HTTP-Redirect kostet nur einen Roundtrip statt ein zweites Dokument samt Skripten. Es ist die kleinste Änderung, die weder Grenzen noch Design berührt.
