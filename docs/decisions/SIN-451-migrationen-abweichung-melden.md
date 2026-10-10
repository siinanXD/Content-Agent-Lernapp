# SIN-451: Migrationen: Abweichung nach Merge erkennen, additive anwenden, nicht additive an Sinan

- Links: SIN-451, SIN-374 (`migrate.yml`, Wächter), SIN-446 (`docs/decisions/SIN-446-migrationen-weiter-offen.md`), `scripts/autonomy/migrationen.mjs`, `scripts/autonomy/run-task.mjs`, `scripts/autonomy/sinan.mjs`
- Entscheidung: Auf SIN-374 aufbauen, nichts doppelt bauen. `migrate.yml` läuft schon nach jedem Merge auf `supabase/migrations/**`, wendet nur additive Migrationen an, und der Wächter vergleicht Dateien und Datenbank. Neu:
  - `migrate` meldet „Migrationen: n/n angewandt“ oder „n/m abweichend“ (`migrationStand`).
  - Fehlen nur nicht additive Dateien, legt der Wächter (`status.mjs`) eine Sinan-Aufgabe an (`sinanTaskForMigrations`) und kein Bug-Issue mehr. Fehlen additive, bleibt das Bug-Issue.
  - Der Planer zeigt den Migrationsstand als Kennzahl `migrationen`. Gelesen wird per Management-API (SQL), nicht über PostgREST, daher kein Schema-Cache-Fehler.
- Der Unit-Test für additiv versus nicht additiv (`isAdditive`) bestand schon; neu getestet sind die Aufteilung in `blockedMissing`/`additiveMissing` und die Sinan-Aufgabe.

## Annahmen

- Die Sinan-Aufgabe legt der Wächter an, nicht `migrate.yml`: Dort fehlt `LINEAR_API_KEY`, ein neues Secret im Workflow wäre `risk:high`. Das Issue entsteht deshalb beim nächsten Wächter-Lauf, nicht im selben Schritt.
- Ein Titel mit denselben Dateinamen wird nicht doppelt angelegt (`createSinanIssues` überspringt auch erledigte).
- Nicht additive Migrationen werden nie automatisch angewandt; keine Datenbank-Löschungen.

## Warum

Ein Bug-Issue pro Wartezyklus löst nichts, wenn nur Sinan entscheiden darf (AGENTS.md). Eine Sinan-Aufgabe mit Schritten und Prüfung ist die richtige Stelle.
