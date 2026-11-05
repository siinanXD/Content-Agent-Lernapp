# SIN-1551 — Schema 3/3: Inhalts-Agent liefert Gebiet, Stufe und Bildwunsch als Daten

- Links: [SIN-1551](https://linear.app/sinan-kahraman/issue/SIN-1551), [SIN-1549](https://linear.app/sinan-kahraman/issue/SIN-1549), [SIN-1550](https://linear.app/sinan-kahraman/issue/SIN-1550), [SIN-479](https://linear.app/sinan-kahraman/issue/SIN-479)
- Entscheidung: Das Einheiten-Ergebnis trägt `bildwunsch: null | { art, motiv, werte: [{ name, wert }] }` (Pflichtfeld im API-Schema, Regeln im Prompt, `bildwunschOderNull` beim Annotieren). `art` nutzt die vorhandenen Bild-Arten (`flow|schema|sign|sketch|chart`). Fremde Felder wie `src` fallen weg; ein fertiges Bild wird nie übernommen. Gebiet (`examAreas`) und Stufe (`level`) je Frage schreibt der Store seit SIN-1550 in `exam_areas` und `level`.
- Richter und Bildbezug: Der Richter sieht nur Text (`EvalItem` hat kein Bild und keinen Alt-Text). Er kann „in der Skizze“ nicht prüfen. Hinweis steht im Kennzahlen-Bericht (`renderContentSection`).
- Annahmen: Der Bildwunsch hat noch keine Spalte (Schema 1/3 nennt keine); er steht im Ergebnis und im jsonb `courses.lernfeld`, bis ein Bild-Issue ihn braucht. Er hängt an der Einheit, nicht an der Frage, weil die API höchstens 24 optionale Felder zulässt (SIN-489). Bilder bleiben Handarbeit oder aus Daten gebaut (DIDAKTIK § 7).
- Kosten: kein Inhaltslauf, Test mit Mock-Modell, 0 € API-Kosten.
