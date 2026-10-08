# SIN-386 — Bewertungslauf fortsetzen: 376 von 1852 Fragen bewertet

**Links:** SIN-371 (Fehler behoben), SIN-260 (`scripts/sin260-judge-backfill.ts`), `src/lib/quality/judge-backfill.ts`, `.github/workflows/run-task.yml`

## Entscheidung

Ursache der Lücke (aus dem Code, ohne Live-Zugang): Der Lauf bewertet je Kurs in Chunks zu 10 Fragen. Ein einziger Fehler in einem Chunk (OpenAI 429/5xx, ungültiges JSON) brach den ganzen Kurs ab; alle späteren Fragen des Kurses blieben unbewertet, und der Lauf endete mit Fehler.

Geändert:
1. Je Chunk bis zu 3 Versuche mit Wartezeit (2 s, 4 s).
2. Scheitert ein Chunk trotzdem, läuft der Kurs mit dem nächsten Chunk weiter. Nach 3 Chunks in Folge ohne Ergebnis (Ausfall) stoppt der Kurs. Die Fragen bleiben offen; der nächste Lauf nimmt sie wieder auf (Idempotenz über den Inhalts-Hash).
3. Das Skript gibt am Ende `fragen_bewertet: X von Y, offen Z` aus und endet bei Chunk-Fehlern mit Exit-Code 1. Wiederholt starten, bis offen 0 ist.
4. Kostendeckel unverändert: Stopp bei 19 € je Lauf (hart 20 €), über alle Kurse summiert.

Das Richter-Modell bleibt `gpt-5.4-mini` (nicht neu geprüft, siehe SIN-260/270).

## Annahmen

- Die Restlücke kommt von Chunk-Fehlern, nicht vom Kostendeckel: 1852 Fragen kosten bei ca. 1000 Token je Frage weit unter 19 €. Ohne Log nicht belegt; die neue Ausgabe `FEHLER Kurs …, Fragen a–b: …` nennt die Ursache beim nächsten Lauf.
- Das Zeitlimit des Workflows (120 min) reicht für 1852 Fragen; falls nicht, setzt der nächste Lauf fort.
- Kennzahl `fragen_bewertet` nach dem Merge: nicht verfügbar (kein Live-Lauf im Worker). Langfuse-Traces schreibt das Skript wie bisher je Frage (`judge-backfill-question`).

## Warum

Wiederholbarkeit statt größerer Einzelläufe: Jeder Lauf macht Fortschritt, bricht bei 20 € ab und zeigt, was offen ist.
