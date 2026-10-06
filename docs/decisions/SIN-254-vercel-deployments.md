# SIN-254 — Vercel Hobby: Deployments nahe am Limit

- **Links:** Linear [SIN-254](https://linear.app/sinan-kahraman/issue/SIN-254); [Vercel Limits](https://vercel.com/docs/limits) (Hobby: 100 Deployments/Tag); Vorarbeit SIN-223, SIN-251, SIN-225 (`docs/decisions/SIN-225-free-tier-waechter.md`)
- **Entscheidung:** Verbrauch senken. `scripts/vercel-ignore.sh` überspringt den Build jetzt auch, wenn nur Testdateien (`*.test.*`) oder `playwright.config.ts` geändert wurden. Diese haben keine Laufzeit-Wirkung; ein Testlauf braucht keine Preview. Previews für `cursor/*` sind schon aus, Doku/CI-Commits werden schon übersprungen.
- **Annahmen:** Die 93 Deployments stammen vor allem aus vielen Agent-PRs mit Reparatur-Commits. Testdateien werden nicht von `next build` ausgeliefert (Typecheck läuft in CI, nicht im Vercel-Build-Skip). Previews für `claude/*` bleiben an, weil Sinan sie zum Ausprobieren braucht. Nicht live gemessen; der Effekt zeigt sich im nächsten Wächter-Lauf.
- **Warum:** Kleinste Änderung ohne neue Abhängigkeit; das Limit bleibt bei 100, kein Bezahltarif nötig. Reicht es nicht, ist der nächste Schritt, Previews für `claude/*` abzuschalten (Entscheidung für Sinan).
