# SIN-251 — Entscheidungs-Index im selben PR

- **Links:** Linear [SIN-251](https://linear.app/sinan-kahraman/issue/SIN-251), Vorgänger SIN-240 (`SIN-240-loop-haertung.md`), Wächter [SIN-225](https://linear.app/sinan-kahraman/issue/SIN-225); [Vercel Ignored Build Step](https://vercel.com/docs/project-configuration/git-settings#ignored-build-step) (Exit 0 = überspringen), [Vercel Limits](https://vercel.com/docs/limits) (Hobby: 100 Deployments/Tag)
- **Entscheidung:**
  1. **Index im selben PR.** Der Agent führt vor dem Push `npm run decisions:index` aus und committet `docs/DECISIONS.md`. Der CI-Schritt „Entscheidungs-Index aktuell“ (`decisions-index.mjs --check`) schlägt mit klarer Meldung fehl, wenn der Index fehlt oder veraltet ist. Der Worker-Prompt (`linear.mjs`) nennt die Regel.
  2. **`decisions-index.yml` entfällt** ganz (kein Notfall-Workflow): `npm run decisions:index` lokal ersetzt ihn, ein zweiter Weg wäre nur Abhängigkeit mehr.
  3. **Vercel.** `vercel-ignore.sh` überspringt reine Änderungen an `docs/`, `*.md`, `.github/`, `e2e/`, `scripts/autonomy/` und `scripts/decisions-index.mjs` jetzt auch auf `main`. Bisher wurde `main` immer gebaut.
  4. **Status.** Die Kontingent-Tabelle (Vercel-Deployments/Tag) und der Vorfall warnen jetzt ab ≥ 80 % statt > 80 %, wie der Wächter SIN-225.
- **Annahmen:** Konflikte im Index zwischen parallelen PRs löst `git merge origin/main` plus erneutes `npm run decisions:index` (die Datei ist erzeugt, nicht von Hand zu mergen). `HEAD^` ist auf `main` nach Squash-Merge der Vorgänger-Commit, der Vergleich stimmt also. Der Vercel-Build-Schritt konnte hier nicht live geprüft werden.
- **Warum:** Jeder Index-PR kostete CI, Gate und zwei Vercel-Deploys (Hobby: 100/Tag) und machte Lärm; ein Index im selben PR kostet nichts extra.
