# SIN-473: Festes Frageschema vor dem Speichern

- Issue: https://linear.app/sinan-kahraman/issue/SIN-473
- Verwandt: SIN-384 (`normalizeQuestion()` beim Lesen), `docs/decisions/SIN-432-*`
- Doku Structured Outputs: https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs

## Entscheidung

- Ein Schema je Fragetyp (`auswahl`, `zuordnen`, `lueckentext`, `reihenfolge`, `rechnen`) in `src/lib/generate/question-schema.ts`: `validateQuestion()` und dasselbe als JSON Schema (`QUESTION_JSON_SCHEMA`). Die Form entspricht dem Seed. Eigene Prüffunktion statt zod: kein neues Paket (weniger Abhängigkeiten).
- `content-grow` prüft jede erzeugte Einheit (`schema-gate.ts`): ungültige Fragen gehen einmal in die bestehende Reparatur (AP-21) mit den Schema-Fehlern als Grund, was danach noch ungültig ist, wird verworfen. Vor dem Veröffentlichen sperrt `gateUnit()` ein letztes Mal.
- Der Lauf-Bericht (`RunReport.schema`, Linear-Kommentar) nennt: Fragen erzeugt, ungültig, repariert, verworfen.
- Der Prompt nennt die feste Form je Typ (`FRAGE_FORMAT`).
- Bestehende Daten bleiben unverändert (SIN-384 vereinheitlicht beim Lesen).

## Annahmen

- Structured Outputs (Punkt 2 des Issues) sind **nicht** eingebaut: Im Lauf war kein Zugriff auf die aktuelle Anthropic-Doku möglich (Web-Zugriff nicht freigegeben), und AGENTS.md verbietet Parameter aus dem Gedächtnis. `QUESTION_JSON_SCHEMA` liegt bereit; der Parameter wird in einem Folge-Issue eingetragen, sobald die Doku gelesen ist (auch Prüfung, ob die Schema-Grenzen wie `minItems`/`anyOf` unterstützt werden). Bis dahin erzwingen Prompt, Prüfung und Reparatur das Schema.
- `zuordnen.correct` = rechte Seiten in Paar-Reihenfolge, `reihenfolge.correct` = Schritte mit " → " verbunden, `lueckentext.correct` = ein Wort aus `blanks` (wie im Seed). Mehrere Lücken je Frage gibt es im festen Schema nicht.
- Ein Trockenlauf (`--dry-run`) ruft die API nicht auf und speichert nichts; die Sperre vor dem Speichern gilt für Live-Läufe.

## Warum

Das Modell hielt sich nicht an die Prosa-Beschreibung (Paare als Objekt, `correct` in vier Formen, erfundene Typnamen). Prüfen vor dem Speichern macht aus „bitte so“ ein „nur so“.
