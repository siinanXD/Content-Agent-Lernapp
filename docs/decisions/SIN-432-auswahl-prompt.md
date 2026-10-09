# SIN-432: Generator-Prompt für auswahl und reihenfolge, weniger Verwerfungen

- **Links:** [SIN-432](https://linear.app/sinan-kahraman/issue/SIN-432/generator-prompt-verwerfungen-bei-auswahlfragen-senken-niveau), Ursachen aus [SIN-395](SIN-395-verworfene-fragen.md), Modell [SIN-398](SIN-398-generator-haiku-5-5.md). Eine fertige Lösung dafür gibt es nicht (Prompt-Text des eigenen Generators).
- **Entscheidung:**
  1. `AUSWAHL_REGELN` in `src/lib/generate/didaktik-prompts.ts` hängt an `didaktikSchemaHint()` und wirkt damit im System-Prompt des Kurslaufs, im Block-Prompt und im Stichwort-Prompt. Inhalt: genau eine richtige Antwort nach der Quelle, gleichartige Distraktoren aus typischen Fehlvorstellungen, keine „alle/keine der genannten“, Niveau des Moduljahres mit Praxissituation statt reinem Faktenabruf, bei reihenfolge nur zwingende Schrittfolgen.
  2. `PROMPT_AUSWAHL_REGELN=aus` erzeugt den alten Prompt, nur für den Vorher-Lauf im Vergleich.
  3. `npm run quality:prompt-vergleich` (`scripts/sin432-prompt-vergleich.ts`) erzeugt je Lauf 24 Einheiten aus LF1, LF2, M0 und PA (maf-metall) mit `GENERATOR_MODEL`, bewertet sie mit demselben Richter und schreibt die Verwerfungsquote je Fragetyp nach `docs/ops/sin432-runs/`. Obergrenze 3,2 USD, weit unter dem Deckel von 20 € je Kurslauf.
- **Annahmen:**
  1. Die Live-Messung ist in diesem Lauf nicht möglich (`ANTHROPIC_API_KEY` und `OPENAI_API_KEY` fehlen). Es gibt daher noch **keinen Messwert**; das Kriterium „Goldset-Vergleich als Beleg“ ist offen. Nachholen: `npm run quality:prompt-vergleich` mit beiden Schlüsseln, Ergebnis hier eintragen (das Anlegen eines `sinan`-Issues war in diesem Lauf nicht erlaubt). Bestehensquote (≥ 90 %) ist ebenfalls noch nicht gemessen.
  2. Der Richter und seine Schwellen bleiben unverändert, damit der Vergleich fair ist.
  3. Die Regeln verlängern den gecachten System-Präfix um rund 400 Token; Mehrkosten sind im Batch-Tarif vernachlässigbar.
  4. Bereits veröffentlichte Fragen werden nicht neu erzeugt; die Regeln wirken ab dem nächsten Lauf (verworfene Fragen filtert `discarded.ts`).
- **Warum:** Die häufigsten Verwerfungsgründe sind Niveau und Eindeutigkeit bei auswahl und reihenfolge. Der Generator kannte die Richterkriterien bisher nicht; sie ihm zu nennen ist die günstigste Maßnahme, ohne Richter oder Schwelle zu ändern.
