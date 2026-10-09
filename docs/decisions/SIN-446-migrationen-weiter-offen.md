# SIN-446: Migrationen 13/15 sind dieselbe Blockade wie SIN-441 und SIN-443

- Linear: SIN-446 (Wächter: Migrationen 13/15), SIN-441, SIN-443, SIN-374 (migrate.yml)
- Entscheidungen davor: `docs/decisions/SIN-441-migration-sin415-nicht-additiv.md`, `docs/decisions/SIN-443-migration-416-haengt-an-415.md`
- Code: `isAdditive`, `migrate` in `scripts/autonomy/run-task.mjs`

## Entscheidung

Keine Code- und keine Migrationsänderung. Der Wächter meldet erneut dieselben zwei Dateien:

- `20261013010000_sin415_mehrere_gruppen.sql` enthält `alter table … drop constraint`. `migrate` stuft sie als nicht additiv ein und lässt sie absichtlich liegen. Sinan führt sie aus.
- `20261014010000_sin416_admin_organisationen.sql` ist additiv, braucht aber `public.organisations` aus der SIN-415-Datei und wartet deshalb.

Nach der Ausführung von SIN-415 startet Sinan `migrate` per `workflow_dispatch` (Actions → migrate → Run workflow). Danach zeigt der Wächter 15/15.

## Annahmen

- Secrets und Sicherung sind nicht die Ursache: 13 Migrationen wurden angewendet. Actions-Läufe waren in diesem Lauf nicht abrufbar.
- Bestehende Migrationen werden nicht geändert (risk:high).
- Das Linear-Issue mit Label `sinan` ließ sich wieder nicht anlegen (`sinan.mjs create` nicht freigegeben). Offen für den Planer: die Aufgabe als `sinan`-Issue anlegen und SIN-441/443/446 darin bündeln, damit der Wächter nicht jedes Mal ein neues Bug-Issue öffnet.

## Warum

AGENTS.md: nicht additive Migrationen entscheidet Sinan. Weitere Bug-Issues für denselben Zustand ändern nichts.
