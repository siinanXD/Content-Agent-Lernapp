# SIN-378 — Fabrik-Lauf im Statusprotokoll nachweisen, Ausbleiben melden

- **Links:** Linear [SIN-378](https://linear.app/sinan-kahraman/issue/SIN-378), [SIN-289](SIN-289-sentry-fabrik-status.md), [SIN-357](https://linear.app/sinan-kahraman/issue/SIN-357) (erster Live-Lauf, nicht Teil hier); GitHub Actions [schedule](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)
- **Entscheidung:**
  1. **Zeitplan:** `content-grow.yml` hat `cron: "47 5 * * 1"` und bleibt unverändert. Ob GitHub ihn feuert, ist von hier aus nicht prüfbar (kein Zugriff auf die Läufe); die Ausbleib-Erkennung (Punkt 3) zeigt es künftig.
  2. **Protokoll:** `scripts/content-grow.ts` schrieb bisher nur am Ende eines regulären Laufs (`finish`). Fehlende Secrets, fehlender Kurs und jeder Absturz (`main().catch`) endeten ohne Zeile. Jetzt schreibt `abortRun` in diesen Fällen eine Zeile mit `stopped = true` und `stop_reason = "Abbruch: …"` (höchstens 300 Zeichen). Neue Spalten `started_at` und `finished_at` (additive Migration `20261010010000`). Dry-Runs schreiben weiter nichts.
  3. **Ausbleiben:** `deriveFabrikStatus` meldet nach mehr als 8 Tagen „überfällig seit N Tagen“ (N = Tage über der 8-Tage-Grenze) mit Datum des letzten Laufs; sonst „letzter Lauf am <Datum>“. Kennzahl `content_fabrik_ueberfaellig_tage` löst im Kennzahlen-Bericht die bestehende Regel `fabrik-haengt` aus (kein neuer Meldeweg).
- **Annahmen:**
  - Ohne SUPABASE-Secrets (z. B. der Abbruch „Secrets fehlen“ trifft genau diese) kann die Abbruchzeile nicht geschrieben werden; der Lauf endet dann mit Warnung. Für diesen Fall bleibt die Ausbleib-Erkennung das Netz.
  - Läuft die Migration noch nicht, schlägt der Insert mit den neuen Spalten fehl (Warnung, kein Absturz). `migrate.yml` wendet sie nach dem Merge an (SIN-374).
  - „Noch kein Lauf im Statusprotokoll“ bleibt ohne Datum und löst die Regel nicht aus, bis SIN-357 den ersten Lauf liefert.
- **Warum:** Die Kennzahl blieb ohne Zeile leer, und ein Lauf, der vor dem Ergebnis abbrach, war nicht von einem ausgebliebenen zu unterscheiden.
