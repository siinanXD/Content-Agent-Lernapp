# SIN-1043: Vercel-Vorschau nur bei UI-Änderungen

Vorlage: Leitstand `scripts/vercel-ignore.mjs` (SIN-1042). `ignoreCommand` in `vercel.json` überspringt Builds, wenn seit dem letzten Deploy (`VERCEL_GIT_PREVIOUS_SHA`, sonst `HEAD^`) keine UI-Datei geändert wurde: `src/app/**`, `src/components/**`, `public/**`, `content/**`, `package*.json`, `next.config.*`, `vercel.json`, `*.css`. `main` baut immer; ist der Diff nicht lesbar, wird gebaut. Der PR-Crawler (SIN-906) braucht Vorschauen nur bei UI-PRs.

Annahme: `content/` zählt zur UI, weil Seiten daraus gebaut werden könnten (heute nur `content/legal`). `src/lib/**` löst keinen Build aus; wirkt eine Änderung dort auf Seiten, ändert sie meist auch `src/app`. Ausbauen, falls Vorschauen fehlen.
