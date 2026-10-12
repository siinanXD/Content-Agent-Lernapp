# SIN-490: Richter mit festem Antwortschema (json_schema, strict)

- Issue: https://linear.app/sinan-kahraman/issue/SIN-490
- Verwandt: `docs/decisions/SIN-489-structured-outputs.md` (Claude-Batch, gleiches Prinzip), `docs/decisions/SIN-399-openai-generator.md` (Richter bleibt `gpt-5.4-mini`)
- OpenAI-Doku Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs (**in diesem Lauf nicht abgerufen**: Web-Zugriff nicht freigegeben, siehe Annahmen)

## Entscheidung

- `liveJudgeChunkWithUsage()` in `src/lib/quality/evaluate-agent.ts` sendet `response_format: { type: "json_schema", json_schema: { name: "richter_ergebnis", strict: true, schema: JUDGE_JSON_SCHEMA } }` statt `json_object`.
- `JUDGE_JSON_SCHEMA` ist exportiert. Felder je Frage: `id`, `sourceFidelity` (0/1), `uniqueness` (0/1), `niveau` (1–5), `language` (1–5), `safetyFlag`, `reasons`. Alle sind `required`, jedes Objekt hat `additionalProperties: false`.
- Lehnt die API das Schema mit HTTP 400 ab, wird einmal mit JSON-Modus wiederholt (gleiches Muster wie `openaiGenerate` in `src/lib/openai/candidates.ts`).
- `candidates.ts` bleibt bei `strict: false` (Begründung unten).
- Die Qualitätsschwelle (`QUALITY_THRESHOLDS`, `scoresPass`) und der Systemprompt bleiben unverändert, daher keine neue `JUDGE_PROMPT_VERSION`.

## Abweichung vom Issue

- **Feldnamen:** Das Issue nennt `question_id`, `quellentreue`, `eindeutigkeit` (ja/nein), `sprache`, `sicherheit_flag`, `passed`. Ich habe die bestehenden Namen aus `QuestionEval` und `question_evaluations` übernommen (`id`, `sourceFidelity`, `uniqueness`, `language`, `safetyFlag`). Grund: Der Parser, die Langfuse-Prüfpunkte und die Tabelle nutzen sie. Ein Umbenennen würde Goldset-Vergleiche und Historie brechen. `passed` und `question_id` werden aus Antwort und Eingabe abgeleitet, nicht vom Modell verlangt.
- **Ja/nein:** `uniqueness` und `sourceFidelity` bleiben 0/1, wie im Code. Das ist dieselbe Bedeutung wie ja/nein.

## Annahmen

- **Doku nicht gelesen:** Die Regeln für `strict: true` (erlaubte Schlüsselwörter, `enum` bei Ganzzahlen, Modelle mit Unterstützung) sind hier nicht aus den Docs belegt. Die Annahmen sind: `enum` mit Ganzzahlen, `required` für alle Felder, `additionalProperties: false`, keine `minimum`/`maximum`. Der Fallback bei 400 fängt eine Ablehnung ab. Vor dem Live-Lauf nachlesen und den Fallback-Treffer im Lauf-Protokoll prüfen (Nachholen: Lauf mit Web-Zugriff).
- **Kandidaten nicht auf strict umgestellt:** `UNITS_JSON_SCHEMA` in `candidates.ts` nutzt `sections: { type: "object" }` ohne Felder und `correct: {}` (beliebig). Strict verlangt geschlossene Objekte, und `correct` hat je Fragetyp eine andere Form. Das Schema müsste dafür umgebaut werden; das ist ein eigener Schritt. Die Kandidaten sind nur für den Vergleich `ap22:alle` da, nicht für die Veröffentlichung.
- **Kein Live-Lauf:** Es gibt keinen OpenAI-Schlüssel im Lauf. Die Akzeptanzkriterien werden über Tests und einen Trockenlauf der Anfrage geprüft, nicht über einen echten Aufruf.

## Warum

Ein festes Schema verhindert, dass der Richter Felder umbenennt oder weglässt. `json_object` garantiert nur gültiges JSON, und die Auswertung rät dann bei fehlenden Feldern über `heuristicScores`. Das wirkt sich direkt auf die Bewertung aus. Mit `strict` fällt diese Lücke weg, ohne die Schwelle zu ändern.
