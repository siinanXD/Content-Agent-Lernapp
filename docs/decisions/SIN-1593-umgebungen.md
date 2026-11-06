# SIN-1593: Drei Umgebungen (dev, staging, production) mit langlebigem Branch `staging`

- Links: Linear SIN-1593 (Entscheidung Sinan 06.11.), SIN-1598 (dieses Dokument), `docs/ops/umgebungen.md`, Supabase Free-Plan https://supabase.com/docs/guides/platform/billing-faq
- Entscheidung: Es gibt drei Umgebungen. **dev** läuft lokal, **staging** ist ein eigenes Supabase-Projekt (`pxoqubnwjegshkxirphm`, Frankfurt) mit langlebigem Git-Branch `staging`, **production** ist `main` mit dem bestehenden Supabase-Projekt. Feature-Branches gehen per PR nach `staging`. `staging` geht nach grünem Gesamtlauf per Release-PR nach `main`.
- Optionen:
  1. Langlebiger Branch `staging` mit eigener Staging-Datenbank. **Gewählt.** Bildet Sinans Arbeitsweg ab, `main` bleibt sauber, Migrationen laufen zuerst auf Staging.
  2. Kein `staging`-Branch, jeder PR bekommt eine Vorschau gegen die Staging-Datenbank, `main` bleibt wie heute. Verworfen: weniger Umbau, aber „alles zusammengeführt testen“ gibt es nicht.
  3. Wie 1, aber `staging` mergt täglich automatisch nach `main`. Verworfen: ein Release ohne bewussten Schritt widerspricht „erst mergen, wenn auf staging alles erfolgreich war“.
- Annahme (nicht ausdrücklich bestätigt, im PR zu korrigieren): Die Pflicht-Checks `build`, `pr-title`, `merge-gate` und die Belegprüfung gelten am Übergang `staging` → `main`. An Feature-PRs nach `staging` läuft eine leichte Prüfung (Lint, Typecheck, Unit-Tests, `pr-title`). Kein Check wird entfernt.
- Weitere Annahmen aus der Planung: Der Release-PR wird mit Merge-Commit gemergt, nicht Squash, damit beide Branches gleich bleiben. `revert-guard` heilt zuerst `main`, danach folgt ein Revert-PR gegen `staging`. Staging bekommt nur veröffentlichte Inhaltstabellen nach fester Allowlist, nie Personendaten. dev ist die lokale Supabase in Docker, keine eigene Cloud-Datenbank. Der PR mit einer Migration sieht diese in der Vorschau erst nach dem Merge nach `staging` (kein Supabase Branching).
- Kosten: 0 €. Die Organisation ist auf dem Free-Plan, der zwei aktive Projekte erlaubt. Grenzen für Staging: 500 MB Datenbank (Abbruch der Befüllung bei mehr als 400 MB), Pausierung nach 7 Tagen mit zu wenig Aktivität (wiederherstellbar bis 90 Tage), keine herunterladbaren Backups.
- Warum: Fehlerhafte Migrationen und Inhalte sollen auf Staging scheitern, nicht auf Production. Pflicht-Checks und Gate werden verschoben, nicht abgeschwächt.
- Umsetzung: Kette SIN-1598 bis SIN-1607. Dieses Issue schreibt nur Dokumente; Branch, Workflows, Secrets und Befüllung folgen in den Folge-Issues.
