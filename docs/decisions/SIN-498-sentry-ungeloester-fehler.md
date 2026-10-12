# SIN-498: Sentry – ungelöster Fehler (7 Tage)

- Issue: https://linear.app/sinan-kahraman/issue/SIN-498
- Code: `scripts/autonomy/sentry.mjs` (Kennzahl), `src/lib/sentry-pipeline.ts`, `src/instrumentation.ts`

## Entscheidung

- Kein Code-Fix. Die Ursache ist aus dem Repo allein nicht belegbar: Der Stacktrace liegt nur in Sentry (EU, `de.sentry.io`), dieser Lauf hatte keinen lesenden Zugriff darauf.
- Die Kennzahl `sentry` zählt `is:unresolved lastSeen:-7d` (1), `sentry_kritisch` zählt `level:[error,fatal]` (0). Der eine Fehler hat also Level `warning` oder `info`, kein Absturz.
- Den Fehler blind als bekannt zu markieren wäre unbegründet. Deshalb wird nichts aufgelöst.

## Annahmen

- Der Fehler ist niedrig priorisiert (Level unter `error`), daher kein Notfall.
- Der Loop erkennt Erledigung selbst über die Kennzahl `sentry` (0 ungelöste Fehler).

## Nächster Schritt

- Lauf mit Sentry-Lesezugriff: Issue in Sentry öffnen, Route und Stacktrace prüfen, beheben (mit Test) oder mit Begründung auflösen. Keine Personendaten in Berichten.

## Warum

- Ehrlich dokumentierter Blocker statt geratener Änderung (AGENTS.md: Annahmen notieren, weiterarbeiten).
