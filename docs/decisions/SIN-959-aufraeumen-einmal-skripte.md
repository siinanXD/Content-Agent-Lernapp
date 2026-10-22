# SIN-959 — Aufräumen: Einmal-Skripte entfernen

- Links: [SIN-959](https://linear.app/sinan-kahraman/issue/SIN-959), [SIN-935](https://linear.app/sinan-kahraman/issue/SIN-935)
- Entscheidung: `ap15-finish.ts`, `ap15-salvage.ts`, `hermes-weekly.mjs` gelöscht (kein Aufrufer in package.json, Workflows, Code). Die übrigen neun `ap*`/`sin*`-Skripte hängen an `package.json` und bleiben.
- Annahmen: Workflows `loop-pause`, `marketing`, `werbeclip` bleiben. Sie sind in `agents.json`, Tests, `status.mjs`, Diagrammen und Docs verdrahtet (Steuerung gehört zu Weg A, SIN-935), und offene Linear-Issues ließen sich hier nicht prüfen.
- Warum: Kürzester sicherer Diff; keine Steuerung angefasst.
