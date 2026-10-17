# SIN-807: Dispatcher stößt die Content-Fabrik an, der GitHub-Cron allein reicht nicht

- Linear: SIN-807 (Sinan, 17.10.2026), Vorgänger SIN-797
- Code: `scripts/autonomy/fabrik-anstoss.mjs` (`entscheideAnstoss`), Schritt „Content-Fabrik anstoßen“ in `.github/workflows/dispatch.yml`, Test `src/lib/autonomy/fabrik-anstoss.test.ts`

## Entscheidung

- Der Dispatcher (alle 30 Min) startet `content-grow.yml` per `workflow_dispatch`, wenn `docs/FERTIG.md` offene Content-Punkte hat, kein Lauf läuft oder wartet, der jüngste Lauf (jede Art, auch Cron) länger als 2 h her ist und der jüngste Eintrag in `content_factory_runs` keine Guthaben-Pause ist.
- Jeder Anstoß schreibt das Leitstand-Ereignis `fabrik-anstoss` (Agent „content“) mit Grund.
- Der Cron bleibt als zweiter Weg; `concurrency` in `content-grow.yml` und der 2-h-Abstand verhindern Doppelläufe.
- Fehler (Netz, Secret fehlt) sind Warnungen, nie ein roter Dispatcher.

## Annahmen

- „Letzter Lauf“ = `created_at` des jüngsten Laufs von `content-grow.yml` in GitHub Actions, unabhängig vom Ergebnis.
- Ein manueller Start nach Guthaben-Pause ist der einzige Weg aus der Pause (wie SIN-797); der Anstoß umgeht sie nie.
- Die Run-Links als Beleg entstehen erst nach dem Merge im Betrieb.

## Warum

Der GitHub-Cron feuerte seit dem Merge von SIN-797 gar nicht oder Stunden zu spät; der Dispatcher läuft zuverlässiger und kennt Pause und Fertig-Liste schon.
