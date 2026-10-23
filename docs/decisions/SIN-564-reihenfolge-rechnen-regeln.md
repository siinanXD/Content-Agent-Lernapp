# SIN-564: Generator-Regeln für reihenfolge und rechnen, weniger Verwerfungen in M0 und PA

- **Links:** Linear [SIN-564](https://linear.app/sinan-kahraman/issue/SIN-564), Vorarbeit [SIN-432](SIN-432-auswahl-prompt.md), [SIN-433](SIN-433-rechnen-zuordnen-lueckentext.md), [SIN-475](SIN-475-niveau-auswahl.md). Eine fertige Lösung gibt es nicht (Prompt-Text des eigenen Generators).
- **Entscheidung:**
  1. Neuer Block `REIHENFOLGE_RECHNEN_REGELN` in `src/lib/generate/didaktik-prompts.ts`, angehängt in `auswahlRegelnBlock()` und damit in System-, Block- und Stichwort-Prompt. reihenfolge: nur Abläufe, deren Folge die Quelle ausdrücklich nennt; jeder Schritt hängt vom vorigen ab; Anlass und Ziel im Prompt; keine Aufzählungen als „Reihenfolge“. rechnen: Formel und Größen aus der Quelle, alle Werte in der Aufgabe, mindestens zwei Rechenschritte, genau ein Ergebnis mit Einheit, Selbstkontrolle der Rechnung.
  2. `PROMPT_REIHENFOLGE_REGELN=aus` erzeugt den Prompt davor (nur für den Vorher-Lauf).
  3. `npm run quality:prompt-vergleich -- --reihenfolge` erzeugt je Lauf 24 Einheiten aus M0 und PA, bewertet sie mit demselben Richter und schreibt die Quote je Fragetyp nach `docs/ops/sin564-runs/`.
- **Messung:** Noch **kein Messwert**. In diesem Lauf fehlen `ANTHROPIC_API_KEY` und `OPENAI_API_KEY` (Trockenlauf: beide `MISSING`). Die Kriterien „Goldset-Lauf vorher/nachher“ und „Verwerfungsquote sinkt“ sind damit offen. Nachholen: `npm run quality:prompt-vergleich -- --reihenfolge` mit beiden Schlüsseln (Obergrenze 3,2 USD) und die Zahlen hier eintragen:

  | Fragetyp | vorher (verworfen/Fragen) | nachher (verworfen/Fragen) |
  | --- | --- | --- |
  | reihenfolge | offen | offen |
  | rechnen | offen | offen |
- **Annahmen:** Richter, Schwellen und Modell bleiben unverändert. Die Regeln verlängern den gecachten Präfix um rund 300 Token. Bereits veröffentlichte Fragen werden nicht neu erzeugt. Sinkt die Quote nicht, wird der Block zurückgenommen (Schalter oder Revert).
- **Warum:** Die Verwerfungen kommen aus vertauschbaren oder frei ergänzten Schritten und aus Rechenaufgaben ohne vollständige Werte; der Generator kannte diese Richterkriterien bisher nur allgemein.
