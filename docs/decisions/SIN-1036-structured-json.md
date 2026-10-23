# SIN-1036: Strukturiertes JSON in der Content-Pipeline

Entscheidung (Sinan 23.10.2026: alle Agenten geben strukturiertes JSON aus).

- **Richter** (`judgeQuestionsFromText`): `JSON.parse` der ganzen Antwort, kein Regex. Parse-Fehler, Schema-Verstoß oder fehlende Id machen die Einheit „nicht bestanden“ mit Grund `richter_antwort_ungueltig: …` in `reasons`. Keine Heuristik, kein `{}`. Der Claude-Richter sendet jetzt ebenfalls `output_config` mit `JUDGE_JSON_SCHEMA`.
- **Generierung**: `structuredParams` setzt `output_config` immer; der Schalter `STRUCTURED_OUTPUTS` (SIN-497) entfällt. Annahme: Das Schema aus SIN-489 (Fehlerbild „10 von 10 abgelehnt“) wurde seither angepasst; scheitert eine Anfrage, steht der API-Fehlertext im Log und der Lauf wird rot (`failedRunReason`), statt still ohne Schema zu laufen.
- **OpenAI-Kandidaten** (`candidates.ts`): `strict: true`, keine Wiederholung ohne Schema bei HTTP 400. Schemas = Claude-Schemas, über `toOpenAIStrict` (optionale Felder nullable, `const` → `enum`); Nullwerte werden aus der Antwort entfernt. Annahme: nicht live gegen OpenAI geprüft (kein Schlüssel im Lauf).
- **Plan-Agent**: `output_config` mit `PLAN_API_SCHEMA` (`{ variants }`).
- **Research-Agent**: `web_fetch` mit `citations` verträgt kein `output_config`; deshalb ein letzter Aufruf ohne Tools formt die Quellen ins `SOURCES_API_SCHEMA`.
- Offen (nicht Teil der Fertig-Haken): `scripts/autonomy/review.mjs`, `marketing.mjs`, `sichtpruefung.mjs`.

Quelle: https://platform.claude.com/docs/en/build-with-claude/structured-outputs, https://platform.openai.com/docs/guides/structured-outputs
