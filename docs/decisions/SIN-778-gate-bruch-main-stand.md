# SIN-778 Gate-Bruch bildvergleich: main-stand im Typecheck

- Issue: https://linear.app/sinan-kahraman/issue/SIN-778
- Verwandt: SIN-642 (gleicher Fehler, anderer Pfad), SIN-519, SIN-327

## Entscheidung

`main-stand` kommt in `exclude` der `tsconfig.json`. `visual.yml` checkt main als `main-stand/` in den PR-Ordner aus; `exclude: ["video/schnitt"]` gilt nur für den Stamm, `**/*.tsx` fand daher `main-stand/video/schnitt/szene.tsx` und `next build` im PR scheiterte an `@revideo/2d/lib/jsx-runtime`.

## Annahmen

- Der Fehler tritt im ersten `npm run build` des Schritts auf (PR-Stand), nicht im Build von `main-stand` selbst (dort greift das eigene `exclude`).
- Lauf auf CI nicht einsehbar (kein `gh`-Zugriff); die Ursache folgt aus `include`/`exclude`.

## Warum

Eine Zeile statt Revideo in der App oder Umbau des Workflows.
