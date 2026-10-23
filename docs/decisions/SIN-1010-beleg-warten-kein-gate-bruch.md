# SIN-1010: Fehlender Prüfer-Beleg ist kein Gate-Bruch

- Links: SIN-1010, SIN-1001 (Beleg-Gate), SIN-327/SIN-439/SIN-806 (`WAITING_RE`), `scripts/autonomy/warten.mjs`
- Entscheidung: „Kein Prüfer-Beleg für den Head …“ kommt ins `WAITING_RE` wie risk:high und Einspruchsfrist.
- Annahme: Das Gate auf main ist korrekt; es sperrt den Merge absichtlich, bis der Leitstand-Prüfer belegt. Rot ist hier Wartezustand, kein Defekt.
- Warum: Der Detektor sah zwei PRs (#560, #563) mit gleichem roten Schritt und legte ein Bruch-Issue an.
