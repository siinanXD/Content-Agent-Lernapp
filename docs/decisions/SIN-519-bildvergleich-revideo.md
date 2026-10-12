# SIN-519 — Gate-Bruch bildvergleich: Revideo-JSX im Build

**Links:** [Linear SIN-519](https://linear.app/sinan-kahraman/issue/SIN-519), `.github/workflows/visual.yml`, `tsconfig.json`, `video/schnitt/`

## Entscheidung

1. **Ursache:** `video/schnitt/szene.tsx` (Revideo, eigenes Paket ohne Installation im Haupt-`npm ci`) wurde vom Typecheck des Next-Builds miterfasst (`**/*.tsx`). Fehler: „This JSX tag requires the module path '@revideo/2d/lib/jsx-runtime'“.
2. **Behebung:** `video/schnitt` steht seit #321 (SIN-518) in `exclude` der `tsconfig.json`. `npm run build` auf aktuellem `main` läuft grün (lokal geprüft). Der Bildvergleich baut die Referenz aus `main`; PRs, die vor #321 von `main` abzweigten, brachen im Schritt „Bauen (PR und main)“.
3. Kein weiterer Code nötig; die PRs #318 und #320 heilen durch den automatischen Merge von `main`.

## Annahmen

- Die Fehlerzeile stammt aus dem Zeitraum zwischen SIN-483 (Revideo-Schnitt) und #321.

## Warum

Weniger Änderung ist besser: ein zweiter Eingriff (z. B. Revideo in die App-Abhängigkeiten) würde die Absicht von SIN-483 (eigenes Paket) aufheben.
