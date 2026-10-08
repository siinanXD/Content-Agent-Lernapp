# SIN-350: Klare Fehlermeldungen bei Sentry-, PostHog- und Fabrik-Kennzahlen

- Links: `scripts/autonomy/sentry.mjs`, `posthog.mjs`, `fabrik.mjs`; Planer-Workflow `.github/workflows/planner.yml`
- Entscheidung: Fehlt eine Umgebungsvariable, steht `nicht verfügbar (Secret fehlt im Workflow: NAME, …)`. Schlägt eine Abfrage fehl, steht `nicht messbar (Dienst: HTTP <Status>)`. `sentry_kritisch` wird unabhängig von `sentry` abgefragt und zeigt seinen eigenen Fehler.
- Annahmen: Der Planer-Workflow reicht die Secrets bereits durch; ein leeres oder nicht angelegtes Secret kommt als leerer String an und war die wahrscheinlichste Ursache. Ob Region oder Projekt-ID stimmen, zeigt erst der nächste Lauf mit gesetzten Secrets (dann HTTP-Status in der Meldung).
- Warum: „nicht verfügbar“ ohne Grund ließ sich nicht von fehlender Konfiguration oder API-Fehlern unterscheiden. Die fehlenden Secrets setzt nur Sinan (Issue mit Label `sinan`).
