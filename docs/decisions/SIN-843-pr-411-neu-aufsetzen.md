# SIN-843: PR #411 (SIN-811) neu aufsetzen, Frist-Job für alte einspruch:2h-PRs

- Issue: https://linear.app/sinan-kahraman/issue/SIN-843
- Ersetzt PR #411 (Branch `claude/sin-811`, 30 Commits, davon 25 leer). Inhalt: SIN-811 (`SIN-811-loop-schneller.md`), Sinans Entscheidung vom 17.10.
- Abhängig von SIN-844 (keine Leer-Commits mehr aus der Review-Reparatur).

## Entscheidung

- Neuer Branch `claude/sin-843` mit `cherry-pick` von `a906611` und `c4911ce` (zwei Code-Commits, kein Force-Push, nie auf main). Konflikte mit main (SIN-852: Frist an Gründen) manuell gelöst: Frist-Gründe-Hash bleibt, Dauer 30 Min.
- Fund aus dem Review: `einspruch-ende` in `pr-gate.yml` filterte nur `einspruch:30m`. Offene PRs mit `einspruch:2h` ohne neuen Commit liefen nie ab. Jetzt prüft der Job beide Labels (`FRIST_LABELS`).
- Das Gate entfernt `einspruch:2h` und setzt `einspruch:30m`. Der Zeitstempel `bis` im Fristkommentar bleibt: die Frist wird ab dem alten Zeitstempel gerechnet, nicht neu gestartet.
- `status.mjs` liest `einspruch_bis` für beide Labels.

## Annahmen

- „Ab dem alten Zeitstempel“ heißt: das gespeicherte `bis` gilt weiter (nicht auf Start + 30 Min gekürzt). Alte PRs warten also höchstens die schon laufende Frist ab. Das ist die vorsichtigere Lesart.
- Dies ersetzt die Aussage in SIN-811, die Frist werde bei Umstellung neu gesetzt.
- Der alte PR #411 wird nach Merge-Reife des neuen PR mit Verweis geschlossen (nicht von diesem Lauf).

## Warum

Ohne den Fix bliebe jeder PR mit altem Label dauerhaft hängen, weil kein Job seine abgelaufene Frist neu bewertet.
