# SIN-532: A/B-Bericht zeigt Quoten statt 0/1

- Links: https://linear.app/sinan-kahraman/issue/SIN-532
- Entscheidung: Neue Funktion `aggregateRates` in `src/lib/quality/schemas.ts`, nur von `scripts/ap22-ab.ts` genutzt. `aggregateScores` bleibt unverändert (Gate).
- Annahme: Der Richter (`2026-10-v2`) liefert korrekt 0/1 je Frage; die 0 entstand allein durch `every` in der Aggregation.
- Warum: Eine einzige durchgefallene Frage setzte den Bericht auf 0. Das Gate braucht die strenge Regel, der Bericht eine Quote.
