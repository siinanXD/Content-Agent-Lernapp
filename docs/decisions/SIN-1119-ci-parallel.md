# SIN-1119: CI-Prüfungen laufen parallel

- Issue: https://linear.app/sinan-kahraman/issue/SIN-1119
- Code: `.github/workflows/ci.yml`, `scripts/performance-budget.mjs` (`--shard`), `src/lib/quality/performance-budget.test.ts`

## Entscheidung

- Der eine Job `build` (seriell, 7–8 Min.) ist in `pruefen` (Entscheidungs-Index, `check:fast`, README-Erinnerung), `bauen` (Production build, `.next` als Artefakt), `e2e` (Playwright, axe, Layout) und `perf` (Lighthouse) geteilt. `e2e` und `perf` laden das Build-Artefakt; sie bauen nicht selbst.
- `build` bleibt als Sammeljob mit `needs: [pruefen, bauen, e2e, perf]` und `if: !cancelled()`. Er ist nur grün, wenn alle vier `success` melden; `skipped` und `cancelled` zählen als rot. Damit bleiben die Pflicht-Checks (`build`, `merge-gate`, `pr-title`) unverändert; Branch-Protection wird nicht angefasst.
- Die Schrittnamen des Sammeljobs enthalten weiter `Unit tests` und `accessibility`, weil das Steckbrief in `pr-gate.yml` sie per Namen liest. `pr-gate.yml` bleibt unverändert (wäre sonst `risk:high`).
- Lighthouse braucht allein ca. 195 s und wäre mit Build davor der längste Pfad (ca. 5,5 Min.). Darum läuft `perf` als Matrix in 2 Teilen (`--shard 1/2`, `2/2`, Routen reihum). Gemessen wird weiter mit denselben Grenzen, derselben Läuferzahl und derselben Nachmessung (SIN-455); nur die Routen sind auf zwei Runner verteilt.

## Annahmen

- Fertige Lösung: GitHub Actions `needs` und `matrix` sind eingebaut; kein Fremd-Paket nötig. Neue Actions nur aus `actions/*` (`download-artifact@v8` ist im Repo schon in `sichtpruefung.yml` in Gebrauch).
- Das Artefakt ist ein Tar (`next-build.tgz`), weil `.next` ein versteckter Ordner ist, den `upload-artifact` sonst auslässt. `.next/cache` bleibt draußen. Aufbewahrung 1 Tag.
- Mehr Runner-Minuten: `npm ci` läuft jetzt in 5 statt 1 Job. Das ist der Preis für das Laufzeit-Ziel. Das Repo ist öffentlich (`gh repo view`: `isPrivate=false`), Actions-Minuten kosten dort nichts.
- Das Kriterium „Median über 5 PRs unter 5 Minuten“ lässt sich erst an Folge-PRs messen; die Messung kommt als Kommentar im Issue nach.
