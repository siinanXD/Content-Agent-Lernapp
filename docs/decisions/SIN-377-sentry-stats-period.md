# SIN-377: Sentry stats_period auf erlaubten Wert korrigieren

## Links
- [Sentry API Dokumentation: List a Project's Issues](https://docs.sentry.io/api/events/list-a-projects-issues/)
- [SIN-377 Linear Issue](https://linear.app/sinan-kahraman/issue/SIN-377/sentry-kennzahl-ungultigen-stats-period-korrigieren)

## Entscheidung

Das Sentry-Kennzahlen-Skript (`scripts/autonomy/sentry.mjs`) sendete `statsPeriod: "7d"`, das von der Sentry-API nicht akzeptiert wird. 

Erlaubte Werte für `stats_period` sind nur: `''` (Standard), `'24h'`, `'14d'`.

**Lösung:** `statsPeriod` auf `"24h"` geändert. Das 7-Tage-Fenster bleibt über `lastSeen:-7d` im Query bestehen, da dieser Parameter verbindlich für die Filterung ist. Der `stats_period`-Parameter steuert nur die Statistik-Spalten in der Antwort und ist nicht für die Filterung zuständig.

## Annahmen

- Die 7-Tage-Filterung durch `lastSeen:-7d` ist ausreichend und transparent für den Nutzer
- `statsPeriod: "24h"` beeinflusst nicht die Genauigkeit der 7-Tage-Zählung (Filterung), sondern nur die Statistik-Zusätze

## Warum

Der HTTP 400-Fehler „Invalid stats_period" blockiert die Kennzahl dauerhaft. Der Fix stellt sicher, dass nur erlaubte Werte gesendet werden, während das 7-Tage-Fenster durch `lastSeen:-7d` erhalten bleibt.
