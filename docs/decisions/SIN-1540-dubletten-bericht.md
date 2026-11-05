# SIN-1540 — Bericht: gleiche und ähnliche Einheiten je Block

- Links: [SIN-1540](https://linear.app/sinan-kahraman/issue/SIN-1540), [SIN-1247](https://linear.app/sinan-kahraman/issue/SIN-1247)
- Entscheidung: `scripts/autonomy/dubletten.mjs` liest `courses` und `units` (nur GET) und schreibt `docs/ops/dubletten-<Datum>.md`. Gleicher Titel: Kleinschreibung, Leerraum zusammengezogen. Ähnlich: Verhältnis ≥ 0,8 im selben Block, gerechnet wie Python `difflib.SequenceMatcher` (Ratcliff/Obershelp, 400 Zufallspaare gegen Python geprüft, 0 Abweichungen), damit die Zahlen des Berichts vom 03.11. nachvollziehbar bleiben.
- Annahmen: Nichts wird gelöscht oder zusammengelegt (Fortschritt und Bewertungen hängen an den Einheiten); Sinan entscheidet nach Sicht der Paare. Es zählen nur veröffentlichte Kurse mit Einheiten. Der Bericht vergleicht Titel, nicht Erklärungen; die ersten 200 Zeichen beider Erklärungen stehen nebeneinander zum Sichten.
