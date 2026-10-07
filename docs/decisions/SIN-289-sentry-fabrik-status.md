# SIN-289 — Sentry in der Pipeline und Statusdatensatz der Content-Fabrik

- **Links:** Linear [SIN-289](https://linear.app/sinan-kahraman/issue/SIN-289), [SIN-259](SIN-259-sentry-anbindung.md); Sentry [Node-SDK](https://docs.sentry.io/platforms/javascript/guides/node/), [Data Storage Location (EU)](https://docs.sentry.io/organization/data-storage-location/), [Issues-API](https://docs.sentry.io/api/events/list-a-projects-issues/)
- **Entscheidung:**
  1. **Sentry in der Pipeline:** `scripts/content-grow.ts` initialisiert Sentry über `src/lib/sentry-pipeline.ts` mit `@sentry/node` und denselben Datenschutz-Optionen wie die App (`SENTRY_PRIVACY_OPTIONS`: kein Nutzer, keine IP, kein Rechnername, Request-Daten entfernt). Ein Fehler im Lauf wird gemeldet und abgewartet (`flush`), dann endet der Prozess rot. Die App-Routen waren seit SIN-259 angebunden und bleiben unverändert. Test: `src/lib/sentry.test.ts`, `src/lib/autonomy/fabrik.test.ts`.
  2. **Planer-Kennzahlen:** `sentry` und `sentry_kritisch` kamen schon aus `scripts/autonomy/sentry.mjs`; ohne Token bleibt „nicht verfügbar“. Neu: `content_fabrik` und `content_fabrik_status` (`scripts/autonomy/fabrik.mjs`).
  3. **Statusdatensatz:** Jeder Live-Lauf der Fabrik schreibt eine Zeile in `content_factory_runs` (neue Migration, nur Kennungen und Zahlen). „Läuft“ = jüngster Lauf höchstens 8 Tage alt. „Hängt“ = die letzten 2 Läufe ohne neues Modul bei nicht leerer Queue. Die Produktreife-Zeile `betrieb-fabrik` wird daraus gemessen.
  4. **Produktreife:** `docs/product-readiness.json` führt für `betrieb-sentry` und `betrieb-fabrik` Stufe „gebaut“ mit Beleg. Grün wird erst die Messung.
- **Annahmen:**
  - „Neues Modul“ heißt: Der Lauf hat mindestens eine Einheit des nächsten Moduls veröffentlicht (`passed > 0`). Ein Lauf, der den Deckel in der Reparatur erreicht und kein Modul beginnt, zählt als „ohne neues Modul“.
  - Die Migration muss in Supabase angewendet werden; bis dahin meldet der Planer „nicht messbar (Tabelle fehlt)“.
  - `content-grow.yml` reicht `NEXT_PUBLIC_SENTRY_DSN` noch nicht durch: Ein neues Secret in einem Workflow macht den PR `risk:high`. Sinan ergänzt die Zeile `NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}` oder gibt ein Folge-Issue frei. Bis dahin ist die Pipeline-Anbindung ein No-op.
  - `@sentry/node` ist MIT-lizenziert, hat über 500 Sterne und kam schon als Abhängigkeit von `@sentry/nextjs` (gleiche Version 11.4.0); neu ist nur der direkte Eintrag.
- **Warum:** Die beiden Betriebs-Zeilen waren „nicht verfügbar“, weil die Fabrik keinen Status hinterließ und die Pipeline Fehler nicht meldete. Eine eigene Tabelle ist der einfachste Weg ohne zusätzlichen Dienst.
