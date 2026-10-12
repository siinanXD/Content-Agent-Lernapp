# SIN-491: Übergabe-Verträge, ein JSON-Schema je Agenten-Ausgabe

- Issue: https://linear.app/sinan-kahraman/issue/SIN-491
- Verwandt: SIN-481 (`docs/autonomy/agents.json`), SIN-489 und SIN-490 (Structured Outputs), `src/lib/generate/question-schema.ts` (`validateQuestion`, Vorbild)

## Entscheidung

- Schemas in `docs/autonomy/schemas/`: `research`, `planer`, `content`, `video`, `marketing` (Bericht) und `ereignis` (Zeile für `loop_events`, gilt für alle Agenten). Im Register stehen sie als `ausgabeSchema` (je Agent) und `ereignisSchema` (oben).
- Der Coding-Agent hat kein JSON: im Register steht `vertrag` (PR-Titel-Check, Risiko-Label, Tests). Design, Prüfen und Betrieb haben keine eigene JSON-Ausgabe (Figma, Labels, Deploy); für sie gilt nur das Ereignis-Schema.
- Prüffunktion `validate()` in `scripts/autonomy/vertraege.mjs`, ohne neues Paket (kleine Teilmenge von JSON Schema, Quelle: gleiche Schlüsselwörter wie `QUESTION_JSON_SCHEMA`). `node scripts/autonomy/vertraege.mjs` prüft alle Berichte; CI-Schritt „Übergabe-Verträge“ in `ci.yml` (läuft in jedem PR).
- Ein Bericht trägt das Feld `schema` (Pfad zur Schema-Datei). Geprüft werden `docs/research/*.json` mit diesem Feld, alle `docs/berichte/*.json` (Feld Pflicht) und die Beispiele in `docs/autonomy/schemas/beispiele/`. Bestehende JSON-Dateien ohne `schema` (z. B. `maf-plan-summary.json`) bleiben unberührt.
- Test `src/lib/autonomy/vertraege.test.ts`: gültige Beispiele, kaputte Berichte (Typ, Pflichtfeld, unbekanntes Feld, falscher Status, fehlende Quelle) und `buildEvent()` gegen das Ereignis-Schema.

## Annahmen

- **Structured Output (Punkt 3):** Heute ruft nur der Content-Agent ein Sprachmodell über die API auf, und dort gilt schon `UNITS_API_SCHEMA` (SIN-489) und das Richter-Schema (SIN-490). Research und Planer laufen über `claude-code-action` (kein API-Parameter `output_config`), Video und Marketing haben noch keinen Lauf. Wer eines davon auf die API umstellt, übergibt sein Schema aus `docs/autonomy/schemas/` mit; die API kennt weniger Schlüsselwörter als hier erlaubt sind (siehe `docs/autonomy/LEHREN.md`, Schema für `output_config.format`), daher dann ein abgeleitetes API-Schema wie in `api-schema.ts`.
- **Doku nicht neu gelesen:** In diesem Lauf kein Web-Zugriff genutzt; die API-Regeln wurden nicht geändert und nicht neu belegt.
- **Berichte noch nicht erzeugt:** Die Schemas legen die Form fest. Dass `trend-radar` und `content-grow` ihr JSON schreiben, ist ein Folgeschritt (eigene Issues). Bis dahin prüft CI die Beispiele und jeden neuen Bericht mit `schema`-Feld.
- **Video/Marketing:** Form wie der Lauf-Bericht von Content (erzeugt, ungültig, repariert, verworfen, Kosten, Status), weil das Issue es so fordert; spezifische Felder kommen, wenn es Läufe gibt.
- Kosten im Bericht in Euro (`kostenEur`), im Ereignis in US-Dollar (`cost_usd`), wie die jeweilige Quelle sie liefert.

## Warum

Feste Übergaben senken Fehler und Reparaturen: der nächste Schritt kann sich auf Feldnamen und Typen verlassen, und CI findet Abweichungen im PR statt im Lauf.
