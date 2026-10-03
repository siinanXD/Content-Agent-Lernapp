# Sentry + PostHog (EU) — Vercel-Setup für Sinan

Keine Werte in diesem Dokument. Nur Namen und Schritte.

## Warum

- **Sentry:** Produktionsfehler sehen, bevor Lernende melden.
- **PostHog:** wissen, welche Einheiten gestartet/abgeschlossen werden (`unit_started`, `unit_completed`, `question_answered`).

Code ist **optional**: fehlen die Keys, ist die Integration ein No-Op (Build/Tests grün).

## Sentry (EU)

1. [Sentry](https://sentry.io) → Organization mit **Data Storage Location = European Union** anlegen (DSN-Host enthält `ingest.de.sentry.io`). Docs: [Data Storage Location](https://docs.sentry.io/organization/data-storage-location/), [Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/).
2. Projekt **Next.js** anlegen → Client-Key / DSN kopieren.
3. Vercel-Projekt `content-agent` → Settings → Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SENTRY_DSN` = DSN
   - Optional Source-Maps-Upload im Build: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
4. Deploy / Redeploy Preview.
5. Verifizieren: absichtlichen Fehler auf Preview auslösen → Issue in Sentry EU.

## PostHog (EU)

1. [PostHog Cloud EU](https://eu.posthog.com) → Projekt anlegen.
2. Project API Key + Host notieren. Host muss **`https://eu.i.posthog.com`** sein (nicht US).
3. Vercel (Production + Preview):
   - `NEXT_PUBLIC_POSTHOG_KEY` = Project API Key
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://eu.i.posthog.com`
4. Deploy / Redeploy.
5. Verifizieren: Lernpfad öffnen → Einheit starten → Events in PostHog Activity.

## Lokal ohne Keys

```bash
npm run typecheck
npm run build
```

Ohne `NEXT_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_POSTHOG_KEY` senden Client und Server nichts.

## Repo-Dateien

- `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/sentry.*.config.ts`, `next.config.ts`
- `src/components/analytics/posthog-provider.tsx`, `src/lib/analytics.ts`
- Env-Namen: `.env.example`, `docs/ENV.md`
- Entscheidung: `docs/DECISIONS.md` D-35
