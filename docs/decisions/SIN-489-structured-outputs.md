# SIN-489: Structured Outputs der Claude-API

- Issue: https://linear.app/sinan-kahraman/issue/SIN-489
- Verwandt: `docs/decisions/SIN-473-frageschema.md` (Prüfung nach dem Erzeugen)
- Doku (gelesen am 12.10.2026): https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Entscheidung

- Alle Batch-Anfragen (Erzeugen, Neuerzeugung, Reparatur in `src/lib/generate/batch-generate.ts`) setzen `output_config: { format: { type: "json_schema", schema } }`. Kein Beta-Header, kein `output_format`.
- Schema je Anfrage: `UNITS_API_SCHEMA` (`{ units: [...] }`, ganze Einheit mit sections und Fragen) und `REPAIR_API_SCHEMA` (`{ questions: [...] }`) in `src/lib/generate/api-schema.ts`. Die Fragen kommen aus `QUESTION_JSON_SCHEMA`; `stripUnsupported()` entfernt `maxItems`, `minLength`, `maxLength` und senkt `minItems` auf 1.
- `validateQuestion()` und die Reparatur aus SIN-473 bleiben als Netz für die vollen Regeln (Längen, Anzahl, Lösung in `choices`).
- Test (`api-schema.test.ts`) prüft: keine nicht unterstützten Schlüsselwörter, `additionalProperties: false`, Grenzen unten.
- Der Lauf-Bericht nennt Anteil ungültiger Fragen und Anteil der Reparatur an den Laufkosten (Vergleichswert 08.10.: 67 %).

## Schema-Größe

Die Doku nennt harte Grenzen je Anfrage: höchstens 24 optionale Felder, 16 Union-Felder (`anyOf`), dazu eine nicht bezifferte Grenze für die Grammatikgröße. Ein optionales `image` je Frage in allen fünf Typen ergäbe etwa 34 optionale Felder. Darum:

- **Kein `image` an Fragen im API-Schema.** Fragen mit Bild erzeugt die Fabrik damit nicht mehr; Phase A nutzt nur generierte SVG je Einheit (bleibt im Schema). Bildfragen brauchen später ein eigenes Issue.
- Das Schema hat jetzt weniger als 24 optionale Felder und ein `anyOf` für die Fragetypen (Test).
- Die Einheit wird nicht in kleinere Anfragen geteilt: Eine Anfrage hat schon nur 2 Einheiten (`UNITS_PER_CHUNK`).

## Annahmen

- Ob die Grammatik-Größe oder die 180-s-Kompilierzeit trifft, zeigt erst der erste echte Lauf (HTTP 400 „Schema is too complex“). Dann: `anyOf` je Fragetyp durch ein gemeinsames Frageobjekt mit optionalen Feldern ersetzen. Das ist im Trockenlauf nicht prüfbar.
- Nicht kombinierbar mit Citations und Prefill; beides nutzt die Fabrik nicht.
- Der direkte Einzelaufruf in `generate-agent.ts` (`/v1/messages`, Notfall-Pfad) bleibt unverändert, weil er Seed-Fallback hat.
- Die Zahlen „ungültige Fragen nahe 0, Reparaturkosten gesunken“ sind erst nach dem nächsten echten Lauf messbar (Akzeptanzkriterium 3, offen).

## Warum

Das Schema schon beim Erzeugen zu erzwingen ist billiger als es nach dem Erzeugen zu prüfen und zu reparieren (Reparatur war am 08.10. 67 % der Laufkosten). Die Batch-API behält den 50-%-Rabatt.
