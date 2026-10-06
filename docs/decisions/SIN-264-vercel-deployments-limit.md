# SIN-264 — Vercel Hobby: Deployments-Limit bewusst akzeptiert

- **Links:** Linear [SIN-264](https://linear.app/sinan-kahraman/issue/SIN-264); [Vercel Limits](https://vercel.com/docs/limits) (Hobby: 100 Deployments/Tag); Vorgänger [SIN-225](SIN-225-free-tier-waechter.md); `vercel.json`, `scripts/vercel-ignore.sh`
- **Entscheidung:** Das Limit wird bewusst akzeptiert, es ändert sich nichts an der Konfiguration. Die Sparmaßnahmen laufen schon: reine Doku-/CI-/Test-Commits bauen nicht (`vercel-ignore.sh`, SIN-223/SIN-251), `cursor/*` bekommt keine Preview, überholte Commits bricht `autoJobCancelation` ab.
- **Verworfen:** Previews für `claude/*` abschalten. Der Steckbrief in `pr-gate` verlinkt die Vorschau je PR; ohne sie fehlt Sinan der Klickpfad „Ausprobieren“.
- **Annahmen:** Die 100 % stammen aus einem Tag mit vielen parallelen Agent-PRs samt Reparatur-Pushes, kein Dauerzustand. Das Limit setzt sich nach 24 h zurück; bis dahin verzögern sich nur Previews, nicht Merge oder CI (`build` läuft in GitHub Actions). Kein Zugriff auf die Vercel-API im Agent-Lauf, die Zahl wurde nicht nachgeprüft.
- **Wiedervorlage:** Tritt die Warnung an mehreren Tagen pro Woche auf, Preview-Deployments auf Frontend-Änderungen beschränken oder auf Vercel Pro wechseln (Geld: Entscheidung von Sinan).
- **Warum:** Die billigste Wirkung ist schon umgesetzt; weitere Kürzung kostet Sichtbarkeit für Sinan, der Überlauf kostet nur einen Tag Wartezeit auf Previews.
