# SIN-456: Richter prüft Fakten gegen den Quelltext

- **Links:** Linear [SIN-456](https://linear.app/sinan-kahraman/issue/SIN-456); Befund aus der Goldset-Prüfung (SIN-449, PR #260); Goldset [SIN-447](SIN-447-goldset-indkfl.md); Richter D-07 (`gpt-5.4-mini`).
- **Befund:** Der Richter erkannte nur 1 von 3 Gegenproben. „Teil 1 zählt 40 %“ (§ 14 IndKflAusbV: 25 %) bekam Quellentreue 1, „Nenne ein Einsatzgebiet“ (sieben richtige Antworten) Eindeutigkeit 1. Er sah nur die URL der Quelle, nicht ihren Text. Der System-Prompt nannte fest „Maschinen- und Anlagenführer“, auch bei Industriekaufleuten.
- **Entscheidung:**
  1. `src/lib/quality/source-excerpt.ts`: Vor dem Bewerten lädt der Lauf den Text jeder zitierten HTML-Quelle einmal (Cache je URL, 10 s Zeitlimit), wählt die Absätze mit den meisten gemeinsamen Wörtern und Zahlen aus Frage, Antwort und Erklärung (höchstens 2.500 Zeichen) und gibt sie als `sourceExcerpt` an beide Richter (OpenAI und Claude). Nichts wird gespeichert oder ins Repo geschrieben.
  2. System-Prompt v2 (`JUDGE_PROMPT_VERSION = 2026-10-v2`): berufsneutral; jede Zahl, Frist, Dauer, jedes Datum und jeder Paragraf wird gegen den Auszug geprüft, Widerspruch ergibt Quellentreue 0; mehrere gleich richtige Antworten ergeben Eindeutigkeit 0. Skalen, Schwelle und Sicherheitsregel bleiben gleich.
  3. Goldset: `ik-g01` bis `ik-g10` (reine Faktenfragen) erwarten Niveau 3 (Feld `zuLeicht`), so wie der Richter sie wertet. Mit Sinan abgestimmt (09.10.).
  4. `goldset-indkfl` ohne Tagesdeckel (`paid: false`): ein Lauf kostet unter 0,05 € (09.10.: 0,015 $) und soll nach jeder Richter-Änderung laufen.
- **Warum so:** Fertige Lösungen für „Grounding“ (RAG-Frameworks) bringen Abhängigkeiten und Vektor-Datenbank mit; die Quellen sind wenige, bekannte Seiten. Wortüberlappung je Absatz reicht, um den richtigen Paragrafen zu finden, und braucht keine neue Abhängigkeit.

## Annahmen

- PDF-Quellen (KMK-Rahmenlehrpläne) bekommen vorerst keinen Auszug: Text aus PDF bräuchte eine neue Abhängigkeit, und die Rahmenlehrpläne enthalten Kompetenzen, kaum prüfbare Zahlen. Fachfragen dazu bestanden schon vorher wie erwartet.
- Der Text wird nur im Lauf geholt, nicht gespeichert: Gesetzestexte sind gemeinfrei, bei anderen Quellen bleibt das Repo frei von fremden Texten.
- Mehrkosten: etwa 2.500 Zeichen (rund 700 Token) je Frage für den Richter, bei 2.000 Fragen etwa 1 $ je Fabrik-Lauf. Liegt im 20-€-Deckel.
- Ist gesetze-im-internet.de im Lauf nicht erreichbar, bewertet der Richter wie bisher (ohne Auszug). Der Bericht der Goldset-Prüfung zeigt, wie viele Fragen einen Auszug hatten.
- Abschalten im Notfall: `JUDGE_QUELLENAUSZUG=0`.
