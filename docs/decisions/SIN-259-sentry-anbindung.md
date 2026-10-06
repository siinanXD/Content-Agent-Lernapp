# SIN-259 — Sentry-Anbindung: Fehlerzahl für den Planer messbar machen

- **Links:** Linear [SIN-259](https://linear.app/sinan-kahraman/issue/SIN-259/sentry-anbindung-fehlerzahl-fur-den-planer-messbar-machen); [Sentry: Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/); [Sentry: Data Storage Location](https://docs.sentry.io/organization/data-storage-location/); [Sentry API: List a Project's Issues](https://docs.sentry.io/api/events/list-a-projects-issues/). Fertige Lösung: das offizielle `@sentry/nextjs` (MIT), seit SIN-203 im Repo.
- **Entscheidung:**
  1. Sentry-Init (Client, Server, Edge) bleibt, bekommt aber `sendDefaultPii: false` und einen `beforeSend`-Filter (`src/lib/sentry-privacy.ts`): Nutzer, Server-Name, Cookies, Header, Bodies und Query-Strings fliegen raus.
  2. Browser-Fehler gehen nur nach Einwilligung (Onboarding 00b) raus, geprüft bei jedem Fehler, damit Widerruf sofort wirkt. Server- und API-Fehler brauchen keine Einwilligung, weil sie keine Personendaten enthalten.
  3. Die Abfrage für `sentry` und `sentry_kritisch` liegt in `scripts/autonomy/sentry.mjs`, zählt über alle Seiten (vorher gedeckelt bei 25) und liefert ohne Token/Org/Projekt „nicht verfügbar“. Planer und damit `readiness.mjs` (`betrieb-sentry`) nutzen sie.
- **Annahmen:**
  1. Die Sentry-Doku war in der Agent-Umgebung nicht abrufbar. Endpunkt, `statsPeriod`, `level:[error,fatal]` und Paginierung per Link-Header sind aus dem bestehenden Code (D-42) und dem Gedächtnis übernommen, nicht live geprüft. Der Test nutzt eine gemockte API.
  2. Kritisch = ungelöst mit Level `error` oder `fatal`, Ereignis in den letzten 7 Tagen.
  3. Höchstens 10 Seiten à 100 Issues; mehr Fehler sind ohnehin ein Befund.
  4. Region EU: Basis-URL `https://de.sentry.io`, per `SENTRY_BASE_URL` änderbar. Secrets in `planner.yml` bleiben unverändert (Workflow-Rechte gehören zum Gate).
  5. Der API-Token braucht nur Leserechte (`project:read`, `event:read`).
- **Warum:** Ohne Zahl bleibt die Betriebsprüfung „keine kritischen Fehler seit 7 Tagen“ ungemessen. Die Lösung nutzt das vorhandene SDK, keine neue Abhängigkeit.
