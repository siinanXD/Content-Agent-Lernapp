# SIN-450: Content-Fabrik pausiert bei gesperrter Anthropic-API

- Linear: SIN-450, SIN-442 (Ausgabenlimit bis 01.11.), SIN-444 (Tagesdeckel), SIN-289 (Statusprotokoll)
- Docs: Anthropic API Errors (https://docs.anthropic.com/en/api/errors): Limit-Antwort ist HTTP 400 `invalid_request_error` mit "You have reached your specified API usage limits. You will regain access on <Datum>"; 429 `rate_limit_error` ist kurzfristig.
- Code: `src/lib/anthropic/limit-error.ts`, `scripts/content-grow.ts`, `scripts/autonomy/fabrik.mjs`, `scripts/autonomy/content-metrics.mjs`

## Entscheidung

- Limit-Fehler (Ausgabenlimit, "credit balance is too low") werden am Fehlertext erkannt (`isApiLimitError`); 429 und alle anderen Fehler nicht.
- `content-grow` setzt dann `stopReason = "pausiert: API-Limit am <Datum> (frei ab <Datum>)"`, veröffentlicht nichts, schreibt die Zeile in `content_factory_runs` und endet mit Exit 0. Damit startet weder `repair` noch eine Wiederholung.
- `content_fabrik_status` = `pausiert`, wenn der jüngste Lauf so endete. Pausierte Läufe zählen nicht für „hängt“ (weder in `fabrik.mjs` noch in `content-metrics.mjs`). Der Planer legt dafür kein Issue an.
- Kein Merker für „gesperrt“: Der nächste Wochenlauf versucht es normal. Hebt sich das Limit auf, entsteht ein normaler Lauf, der Status wird wieder `läuft`.
- Tagesdeckel (SIN-444) und die Kennzahl bleiben unverändert; eine neue Spalte oder Migration ist nicht nötig, das Statusprotokoll nutzt `stop_reason`.

## Annahmen

- Der Text der Limit-Antwort bleibt wie in der Anthropic-Doku; erkannt wird er über mehrere Muster, nicht über den HTTP-Code allein (400 trifft auch echte Anfragefehler).
- Der Lauf ist wegen Exit 0 grün; die Sichtbarkeit kommt über Status „pausiert“ und die `::notice::`-Anmerkung.
- Das Datum im Grund ist der Lauftag; „frei ab“ steht nur, wenn die API es nennt.
