# SIN-433: Generator-Regeln für rechnen, zuordnen und lückentext

- **Links:** [SIN-433](https://linear.app/sinan-kahraman/issue/SIN-433/generator-regeln-fur-rechnen-zuordnen-und-luckentext-verwerfungen), Muster [SIN-432](SIN-432-auswahl-prompt.md), Ursachen [SIN-395](SIN-395-verworfene-fragen.md). Eine fertige Lösung gibt es nicht (Prompt-Text des eigenen Generators).
- **Entscheidung:**
  1. `RECHNEN_ZUORDNEN_LUECKE_REGELN` in `src/lib/generate/didaktik-prompts.ts` hängt direkt hinter `AUSWAHL_REGELN` an `didaktikSchemaHint()` (System-, Block- und Stichwort-Prompt). Je Gruppe eine Regel: rechnen/PA (Niveau): Betriebssituation, Werte mit Einheit, mindestens zwei Schritte, Level anwenden. zuordnen/LF1 (Eindeutigkeit): genau ein Gegenstück, gleichartige Begriffe, überschneidungsfreie Beschreibungen. zuordnen/LF2 (Niveau): Funktion/Anwendung statt Definition. lückentext/LF2 (Niveau): genau ein richtiges Wort, Lücke verlangt Verständnis.
  2. `PROMPT_AUSWAHL_REGELN=aus` schaltet jetzt beide Blöcke ab (Vorher-Lauf). `npm run quality:prompt-vergleich` meldet zusätzlich die Quote für rechnen, zuordnen und lueckentext.
  3. Richter, Schwellen und Quellenpflicht unverändert.
- **Annahmen:**
  1. Die Live-Messung ist in diesem Lauf nicht möglich (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY` fehlen). Es gibt **keinen Messwert**; das Kriterium „weniger Verwerfungen, Zahlen im PR“ ist offen. Nachholen: `npm run quality:prompt-vergleich` mit beiden Schlüsseln, Ergebnis hier eintragen.
  2. Die Verwerfungsgründe stammen aus den Gruppen im Issue (Niveau, Eindeutigkeit), nicht aus neu gelesenen Freitexten der Richter-Bewertung (kein DB-Zugriff).
  3. Der Prompt wächst um rund 450 Token im gecachten Präfix; Mehrkosten im Batch-Tarif vernachlässigbar.
  4. Bereits veröffentlichte Fragen bleiben; die Regeln wirken ab dem nächsten Lauf.
- **Warum:** Der Generator kannte die Richterkriterien für diese Typen nicht. Sie zu nennen ist die günstigste Maßnahme, ohne die Schwelle zu senken.
