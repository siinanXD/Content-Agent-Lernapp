# SIN-472: Wartende Migrationen erzeugen kein Bug-Issue

- Links: https://linear.app/sinan-kahraman/issue/SIN-472, SIN-441, SIN-443, SIN-451, SIN-458, SIN-468, `supabase/migrations/20261013010000_sin415_mehrere_gruppen.sql`, `supabase/migrations/20261014010000_sin416_admin_organisationen.sql`
- Entscheidung: Keine Änderung an den Migrationen, kein eigenes Anwenden. SIN-415 enthält `drop constraint` (nicht additiv) und bleibt Aufgabe für Sinan. SIN-416 ist additiv, ändert aber `public.organisations` aus SIN-415 und kann erst danach laufen. Der Wächter (`migrationStatus`) führt solche Dateien als `waitingMissing` (additiv, aber nach einer nicht additiven Datei). Fehlen nur nicht additive und wartende Dateien, entsteht die Sinan-Aufgabe statt eines Bug-Issues.
- Annahmen: Secrets und Sicherung sind nicht die Ursache (Muster wie SIN-441/443). „Nach“ heißt höhere Version im Dateinamen. Ein Lauf von `migrate.yml` war hier nicht lesbar.
- Warum: Bisher legte jeder Lauf für dieselbe Lage ein Bug-Issue an (SIN-457, 458, 472, …), obwohl kein Agent etwas tun kann. Die Sinan-Aufgabe (SQL-Editor, dann `migrate` neu starten) löst beide Dateien.
