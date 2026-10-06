# SIN-268 — Kostenmessung pro Kurslauf reparieren

- **Links:** Linear [SIN-268](https://linear.app/sinan-kahraman/issue/SIN-268/kostenmessung-pro-kurslauf-reparieren-tabelle-fehlt-in-supabase); [Supabase: Migrationen](https://supabase.com/docs/guides/deployment/database-migrations); [PostgREST: Schema-Cache](https://postgrest.org/en/stable/references/schema_cache.html). Eigenbau, eine Reparatur-Migration, keine neue Abhängigkeit.
- **Entscheidung:** Neue Migration `20261006020000_sin268_repair_run_costs.sql` legt `pipeline_run_costs` und den Inhalt von `sin260_judge_backfill` (Spalte `content_hash`, View, `judge_runs`) idempotent an und löst den Schema-Cache aus. Die beiden Dateien mit Zeitstempel `20261006010000` bleiben unverändert. `verify-supabase-schema.mjs` prüft jetzt `pipeline_run_costs` und `judge_runs` und endet mit Fehler, wenn eine fehlt. Der Planer meldet bei 404 „Tabelle pipeline_run_costs fehlt in Supabase“ statt „HTTP 404“.
- **Annahmen:**
  1. Ursache: Zwei Migrationen mit gleicher Version `20261006010000`. Die Supabase-Migrationstabelle führt die Version als Primärschlüssel, daher wird nur eine der beiden angewendet; die Tabelle `pipeline_run_costs` blieb aus. Der Tabellenname in `planner.mjs`, `run-ledger.ts` und der Migration stimmt überein (kein Namensfehler). Ohne Zugriff auf die Live-Datenbank ist das aus dem Repo geschlossen, nicht dort geprüft.
  2. Die Reparatur ist gefahrlos, wenn eine der beiden Migrationen doch lief (`if not exists`, `create or replace`).
  3. Die Migration muss noch auf Supabase angewendet werden (`supabase db push`); danach `node scripts/verify-supabase-schema.mjs` ausführen. Das Anwenden gehört nicht zu diesem PR (Datenbankzugang).
  4. Künftig bekommt jede Migration eine eindeutige Version.
- **Warum:** Eine neue, idempotente Migration behebt die Lücke ohne Änderung bestehender Migrationen; Prüfung und klare Meldung verhindern, dass der Fehler wieder still bleibt.
