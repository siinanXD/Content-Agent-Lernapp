# SIN-273 — Sentry und PostHog prüfen, Planer-Auslese vervollständigen

- **Links:** Linear [SIN-273](https://linear.app/sinan-kahraman/issue/SIN-273/sentry-und-posthog-anbinden-und-in-planer-kennzahlen-auslesen); [Sentry: Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/); [Sentry: Releases](https://docs.sentry.io/product/releases/); [Sentry API: Issues](https://docs.sentry.io/api/events/list-a-projects-issues/); [PostHog: Query API](https://posthog.com/docs/api/query); [PostHog: Next.js](https://posthog.com/docs/libraries/next-js). Fertige Lösungen: `@sentry/nextjs` und `posthog-js`, beide MIT und bereits im Repo.
- **Entscheidung:**
  1. Bestand geprüft: Init für Client, Server und Edge, Quellkarten-Upload, Einwilligung vor PostHog und EU-Host waren aus SIN-203/SIN-230/SIN-259 vorhanden. Es fehlten `sendDefaultPii: false` im Client-Init sowie Release-Tag und Umgebung.
  2. Client-Init setzt jetzt `sendDefaultPii: false` und `environment`; `release.name` in `next.config.ts` (`SENTRY_RELEASE` oder `VERCEL_GIT_COMMIT_SHA`) gilt für Fehler und Quellkarten.
  3. `sentry.mjs` fragt zusätzlich `lastSeen:-7d` ab, weil `statsPeriod` nur die Statistik steuert. `sentry_kritisch` = ungelöste Issues mit Level `error`/`fatal` und Ereignis in den letzten 7 Tagen; das speist `betrieb-sentry` in `readiness.mjs`.
  4. Die PostHog-Abfrage wandert aus `planner.mjs` nach `scripts/autonomy/posthog.mjs` (testbar mit Mock, Host per `POSTHOG_API_BASE_URL`).
  5. `.env.example` und `docs/ENV.md` führen `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_BASE_URL` und `SENTRY_RELEASE` ohne Werte.
- **Annahmen:**
  1. Die Sentry- und PostHog-Doku war in der Agent-Umgebung nicht live geprüft; Syntax (`lastSeen:-7d`, `level:[error,fatal]`) stammt aus dem bestehenden Code und Gedächtnis. Tests nutzen Mocks.
  2. Ohne DSN meldet Sentry 0 Fehler; die Prüfung „keine kritischen Fehler“ ist erst mit gesetztem `NEXT_PUBLIC_SENTRY_DSN` aussagekräftig. Secrets fehlen (DSN, Token, PostHog-Keys); Sinan setzt sie in Vercel und GitHub.
  3. `planner.yml` reicht die Secrets schon durch; keine Workflow-Änderung (Gate).
- **Warum:** Ohne Release-Tag und Datenschutz-Flag im Browser ist die Fehlererfassung unvollständig, und ohne `lastSeen` könnte die 7-Tage-Prüfung alte Fehler mitzählen.
