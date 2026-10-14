# SIN-642 Gate-Bruch bildvergleich: Revideo-Typen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-642
- Verwandt: SIN-327 (Bildvergleich), SIN-483 (Revideo-Schnitt als eigenes Paket)

## Entscheidung

`video/schnitt/` bleibt ein eigenes Paket und steht in `tsconfig.json` unter `exclude` (steht auf `main` seit #362). `next build` prüft dadurch `szene.tsx` nicht, und `@revideo/2d/lib/jsx-runtime` wird im App-Build nicht gebraucht. Keine Revideo-Abhängigkeit in der App.

## Annahmen

- `main` baut grün (`npm run build`, `npm run typecheck` lokal geprüft). Der Fehler in #361/#362 kam vom älteren `main-stand`, der in `visual.yml` mitgebaut wird und das `exclude` noch nicht hatte. Beide PRs bekommen es mit dem Merge von `main`.
- Der Lauf `visual.yml` auf `main` selbst konnte hier nicht eingesehen werden (kein `gh`-Zugriff).

## Warum

Weniger Abhängigkeiten: ein Ausschluss statt Revideo in den App-Paketen.
