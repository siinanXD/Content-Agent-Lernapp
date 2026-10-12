# SIN-500: Leistungsbudget `/` – Prefetch der Startseiten-Links aus

- Issue: https://linear.app/sinan-kahraman/issue/SIN-500
- Verwandt: `docs/decisions/SIN-327-*` (Leistungsbudget), SIN-455 (Nachmessung)
- Doku: `node_modules/next/dist/docs/` (Link `prefetch`)

## Entscheidung

- Alle `Link` in `src/app/page.tsx` bekommen `prefetch={false}`. Die Grenze in `performance-budget.json` bleibt bei 190 KB.

## Messung (lokal, `npm run perf:budget -- --serve`)

- Vorher: `/` 203,8 KB (Grenze 190), in einem Lauf mit 1 Messung 178,1 KB. Der Unterschied von rund 26 KB ist ein Chunk, der nur manchmal in die Messung fällt.
- Nachher: `/` 178,1 KB, drei Läufe in Folge. Alle anderen Routen unverändert im Budget.

## Annahmen

- Ursache: Der Viewport-Prefetch der App-Router-Links (`/anmelden`, `/demo`, `/ausbilder`, Rechtstexte) lädt je nach Zeitpunkt JS der Zielseiten nach. Der Nachweis ist die Messung vorher/nachher, nicht ein Chunk-Vergleich (Playwright-Skript lief hier nicht).
- Folge: Navigation von der Startseite startet das Laden erst beim Klick. Für eine statische Startseite hinnehmbar.

## Warum

Die Grenze nie anheben (AGENTS.md); der Grund für die Streuung ist das Nachladen, nicht gewachsener Code.
