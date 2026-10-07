# SIN-352 und SIN-355: Sentry- und PostHog-Kennzahlen im Planer

**Entscheidung:** Die Planner-Kennzahlen sentry, sentry_kritisch und posthog benötigen Secrets im GitHub-Repository. Der Workflow ist bereits konfiguriert, die Secrets müssen aber als Repository Secrets hinterlegt werden.

**Status:** 
- `scripts/autonomy/sentry.mjs` und `scripts/autonomy/posthog.mjs` sind implementiert und prüfen auf fehlende Secrets
- `.github/workflows/planner.yml` (lines 46–50) leitet die Secrets bereits durch
- GitHub Repository Secrets fehlen noch (müssen von Sinan angelegt werden)

**Annahmen:**
- SENTRY_AUTH_TOKEN, SENTRY_ORG und SENTRY_PROJECT existieren noch nicht als GitHub-Secrets
- POSTHOG_PERSONAL_API_KEY und POSTHOG_PROJECT_ID existieren noch nicht als GitHub-Secrets
- Sinan wird die Secrets hinzufügen, wenn die entsprechenden Linear-Issues gelöst sind

**Warum:** 
- KI darf keine Secrets ins Repo schreiben (AGENTS.md). GitHub-Secrets sind die richtige Stelle.
- Die Metrik-Skripte zeigen bereits klare Fehlermeldungen, wenn Secrets fehlen (SIN-350).
- Ohne die Secrets zeigt der Planer "nicht verfügbar" statt der Messungen.

## Was passiert

### Sentry (SIN-352)
- **Kennzahl `sentry`:** Zählt ungelöste Fehler in den letzten 7 Tagen
- **Kennzahl `sentry_kritisch`:** Zählt Fehler mit Level error oder fatal in den letzten 7 Tagen
- **Quelle:** Sentry-API (`sentry.mjs`, Sentry EU unter https://de.sentry.io)
- **Fehlermeldung, wenn Secret fehlt:** "nicht verfügbar (Secret fehlt im Workflow: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)"

### PostHog (SIN-355)
- **Kennzahl `posthog`:** Abbrüche je Screen in den letzten 7 Tagen
- **Quelle:** PostHog-API (`posthog.mjs`, PostHog EU unter https://eu.posthog.com)
- **Abfrage:** Events unit_started, unit_completed, question_answered
- **Fehlermeldung, wenn Secret fehlt:** "nicht verfügbar (Secret fehlt im Workflow: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID)"

## Nächste Schritte (Sinan)

### Sentry (SIN-352)

1. Sentry-Projekt unter https://de.sentry.io anlegen oder existierenden Schlüssel bekommen
2. GitHub Repository Secrets anlegen:
   - `SENTRY_AUTH_TOKEN`: Bearer token für Sentry-API (aus Sentry-Account-Settings → Auth Tokens)
   - `SENTRY_ORG`: Slug der Sentry-Organisation (z. B. 'sinan' aus https://de.sentry.io/sinan/...)
   - `SENTRY_PROJECT`: Slug des Sentry-Projekts (z. B. 'lernapp' aus https://de.sentry.io/sinan/lernapp/issues)
3. Planner-Workflow manuell starten (Actions → planner → Run workflow → Run workflow)
4. Prüfung: Kennzahl `sentry_kritisch` muss eine Zahl oder eine Fehlermeldung ohne "nicht verfügbar" zeigen
5. Ergebnis in `docs/product-readiness.json` unter `gelaufen.betrieb-sentry` eintragen: `{ "datum": "YYYY-MM-DD", "beleg": "Planner-Lauf SIN-352 mit Sentry-Secrets, Kennzahl sentry_kritisch: <Zahl>" }`

### PostHog (SIN-355)

1. PostHog-Projekt unter https://eu.posthog.com anlegen oder existierenden Schlüssel bekommen
2. GitHub Repository Secrets anlegen:
   - `POSTHOG_PERSONAL_API_KEY`: API key für PostHog (aus PostHog-Account-Settings → API keys)
   - `POSTHOG_PROJECT_ID`: ID des PostHog-Projekts (sichtbar in Account settings oder URL)
3. Planner-Workflow manuell starten (Actions → planner → Run workflow → Run workflow)
4. Prüfung: Kennzahl `posthog` muss Abbrüche pro Event zeigen (JSON-Array oder Fehlermeldung ohne "nicht verfügbar")
5. Ergebnis in `docs/product-readiness.json` unter `gelaufen.betrieb-posthog` eintragen: `{ "datum": "YYYY-MM-DD", "beleg": "Planner-Lauf SIN-355 mit PostHog-Secrets, Kennzahl posthog: <Messungen>" }`

## Dateien angepasst

- `.github/workflows/planner.yml`: Secrets werden bereits durchgereicht (lines 46–50)
- `scripts/autonomy/sentry.mjs` und `posthog.mjs`: Zeigen klare Fehlermeldungen (keine Änderung nötig)
- `docs/product-readiness.json`: Wird aktualisiert, wenn die Messungen erfolgt sind
