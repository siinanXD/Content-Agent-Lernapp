# SIN-507: Bestehensquote Metall, Messfehler durch zwei Frage-ID-Schreibweisen

**Links:** [SIN-507](https://linear.app/sinan-kahraman/issue/SIN-507), Vorgänger [SIN-394](https://linear.app/sinan-kahraman/issue/SIN-394), [SIN-409](https://linear.app/sinan-kahraman/issue/SIN-409), [SIN-490](https://linear.app/sinan-kahraman/issue/SIN-490); Bericht `docs/quality/SIN-507-bestehensquote.md`

## Entscheidung

Die Quote wird aus allen Zeilen von `question_evaluations` berechnet: Frage-ID vereinheitlichen (Präfix `<unit_id>-` abschneiden), je vorhandener Frage die neueste Bewertung nehmen. Das macht `npm run quality:quote` (lesend). `ratedQuestions` wählt dieselbe Zeile. Schreibweg und View bleiben unverändert.

## Annahmen

- Kein Live-Lauf möglich (keine Supabase-Schlüssel im Worker): Die Ursache folgt aus Code und den Zahlen im Issue, die Aufschlüsselung ist **nicht gemessen**. Ob zusätzlich echte Qualität gefallen ist, zeigt erst der Lauf von `quality:quote`.
- Der Kurslauf schreibt `question_id` ohne Präfix, der Bewertungslauf mit Präfix (aus dem Code gelesen, nicht an Zeilen belegt).
- Keine Doku von Anthropic/OpenAI nötig (keine Modell- oder API-Änderung).
- Keine Suche nach fertiger Lösung: Auswertung der eigenen Tabelle, kein allgemeines Problem.

## Warum

Die View gruppiert nach `question_id` als Text; die kleinste Änderung ohne Migration und ohne Neubewertung (Kosten) ist, im Leser zu normalisieren.
