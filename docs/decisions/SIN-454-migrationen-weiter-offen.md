# SIN-454: Migrationen 13/15 sind weiter dieselbe Blockade wie SIN-441, SIN-443 und SIN-446

- Linear: SIN-454 (Wächter: Migrationen 13/15), SIN-441, SIN-443, SIN-446, SIN-374 (migrate.yml)
- Entscheidungen davor: `docs/decisions/SIN-441-migration-sin415-nicht-additiv.md`, `SIN-443-migration-416-haengt-an-415.md`, `SIN-446-migrationen-weiter-offen.md`
- Code: `isAdditive`, `migrate` in `scripts/autonomy/run-task.mjs`

## Entscheidung

Keine Code- und keine Migrationsänderung. Es fehlen weiter dieselben zwei Dateien:

- `20261013010000_sin415_mehrere_gruppen.sql` enthält `alter table … drop constraint`. `migrate` lässt sie absichtlich liegen. Sinan prüft sie und führt sie aus.
- `20261014010000_sin416_admin_organisationen.sql` ist additiv, braucht aber `public.organisations` aus der SIN-415-Datei.

Reihenfolge für Sinan: SIN-415 im Supabase SQL-Editor ausführen (Sicherung lief in `migrate.yml` vorher), dann Actions → migrate → Run workflow. Danach zeigt der Wächter 15/15.

## Annahmen

- Secrets und Sicherung sind nicht die Ursache: 13 Migrationen wurden angewendet. Actions-Läufe waren in diesem Lauf nicht abrufbar (`gh` nicht freigegeben).
- Bestehende Migrationen werden nicht geändert (risk:high).
- Das `sinan`-Issue ließ sich wieder nicht anlegen (`sinan.mjs create` nicht freigegeben). Weiter offen: die Aufgabe als `sinan`-Issue anlegen, damit der Wächter keine weiteren Bug-Issues öffnet.

## Warum

AGENTS.md: nicht additive Migrationen entscheidet Sinan. Die Lehren dazu stehen schon in `docs/autonomy/LEHREN.md` (SIN-441, SIN-443).
