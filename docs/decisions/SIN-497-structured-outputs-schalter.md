# SIN-497: Structured Outputs abschaltbar, Batch-Fehler sichtbar, Lauf rot bei 0 Einheiten

- Issue: https://linear.app/sinan-kahraman/issue/SIN-497
- Verwandt: `docs/decisions/SIN-489-structured-outputs.md`
- Doku (gelesen am 12.10.2026): https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Entscheidung

- `STRUCTURED_OUTPUTS=1` schaltet `output_config.format` ein. **Standard: aus** (`structuredParams` in `src/lib/generate/api-schema.ts`). `validateQuestion()` und die Reparatur bleiben die Prüfung danach.
- `collectBatchUnits` und `collectRepairQuestions` lesen den Fehler je gescheiterter Zeile (`rowError`: `result.error.type: message`, auch verschachtelt). Die ersten 3 stehen als `::error` im Log, alle im Bericht (`got.errors`; `failedChunkErrors` im A/B-Bericht, `batchFailures` im Fabrik-Bericht).
- `ap22-ab` und `content-grow`: 0 Einheiten oder über 50 % gescheiterte Teilaufträge (`failedRunReason`) = Exit 1, Bericht nennt den Grund.

## Prüfung gegen die Doku

- Alle Schlüsselwörter des Schemas (`type`, `properties`, `items`, `enum`, `const`, `required`, `additionalProperties`, `anyOf`, `minItems` 1) sind laut Doku erlaubt, `enum`/`const` ohne `type` ebenfalls; beide Modelle (Haiku 5.5, Sonnet 5.5) sind gelistet. 13 optionale Felder und ein `anyOf` liegen unter den Grenzen (24 / 16).
- Offen bleibt „Schema is too complex for compilation“ (Grammatikgröße, nicht beziffert) oder dass eine Union je Array-Element anders zählt. Das lässt sich nur mit einer echten Anfrage belegen.

## Annahmen

- In dieser Umgebung gibt es keinen Anthropic-Key; die Ursache ist darum **nicht** mit einer echten Anfrage belegt. Darum Weg 4 aus dem Issue: Schalter, Standard aus, damit die Fabrik am Mittwoch Inhalte liefert.
- Nächster Schritt: Lauf mit `STRUCTURED_OUTPUTS=1` und 1 Teilauftrag; der Fehlertext steht jetzt im Log. Dann Schema anpassen (z. B. `anyOf` durch ein Frageobjekt mit optionalen Feldern ersetzen) und Standard auf an stellen.

## Warum

Ein Lauf, der 0 Einheiten erzeugt, darf nie „bestanden“ melden, und ein abgelehnter Request muss seinen Grund zeigen, sonst bleibt die Ursache unsichtbar.
