# SIN-329: Leistungsbudget (Lighthouse) stabilisieren

Links: [Linear SIN-329](https://linear.app/sinan-kahraman/issue/SIN-329/bug-gate-bruch-auf-main-build-leistungsbudget-lighthouse), Vorgänger SIN-322 (Toleranz), SIN-311 (LCP), SIN-300 (Budget).

## Entscheidung

- `scripts/performance-budget.mjs`: je Route ein Aufwärmlauf vor den Messläufen (zählt nicht in den Median).
- `performance-budget.json`: `runs` von 5 auf 7 (Median stabiler). Grenzen und Toleranz bleiben unverändert.

## Annahmen

- Die CI-Logs der Läufe waren nicht lesbar. Lokal besteht `main` das Budget, aber LCP streut stark zwischen Läufen (z. B. `/lernpfad` 2012 bis 2593 ms bei Grenze 2500, mit Toleranz 2750; `/` bis 2611 ms). Ursache des Gate-Bruchs ist daher Messrauschen, kein Code auf `main`.
- `experimental.inlineCss` getestet: keine Verbesserung (LCP-Streuung blieb), daher nicht übernommen.
- Bricht das Gate trotz Änderung weiter, zeigt die Ausgabe LCP-Element und Phasen (SIN-311); dann ist die Seite selbst zu ändern.

## Warum

Der erste Abruf trifft kalten Server und Cache und verzerrt den Median bei wenigen Läufen. Mehr Läufe plus Aufwärmen ist die kleinste Änderung, ohne Grenzen anzuheben (verboten).
