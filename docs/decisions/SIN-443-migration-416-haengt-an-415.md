# SIN-443: Migration 20261014010000 wartet auf 20261013010000

- Linear: SIN-443 (Wächter: Migrationen 13/15), SIN-441 (gleiche Ursache), SIN-374 (migrate.yml)
- Code: `isAdditive`, `migrate` in `scripts/autonomy/run-task.mjs`

## Entscheidung

Keine Code- und keine Migrationsänderung. Beide fehlenden Migrationen hängen zusammen:

- `20261013010000_sin415_mehrere_gruppen.sql` enthält `alter table … drop constraint`. `migrate` stuft sie als nicht additiv ein und lässt sie liegen (siehe SIN-441).
- `20261014010000_sin416_admin_organisationen.sql` ist additiv (`add column if not exists contact_email`), setzt aber die Tabelle `public.organisations` voraus. Die legt die SIN-415-Migration an. Ohne sie scheitert die SIN-416-Migration in ihrer Transaktion.

Sinan führt zuerst die SIN-415-Datei aus (Sicherung läuft in `migrate.yml` vorher) und startet danach `migrate` per `workflow_dispatch`. Dann wird SIN-416 angewendet und der Wächter zeigt 15/15.

## Annahmen

- Secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`) und Sicherung sind nicht die Ursache: 13 Migrationen wurden angewendet. Läufe der Actions waren in diesem Lauf nicht abrufbar.
- Die Migration 415 wird nicht umgeschrieben (bestehende Migrationen ändern ist `risk:high`).
- Das Linear-Issue mit Label `sinan` ließ sich in diesem Lauf nicht anlegen (`sinan.mjs` nicht freigegeben); SIN-441 deckt dieselbe Aufgabe ab.

## Warum

AGENTS.md: nicht additive Migrationen entscheidet Sinan. Eine Abhängigkeit der additiven Datei von der blockierten macht sie ebenfalls wartend.
