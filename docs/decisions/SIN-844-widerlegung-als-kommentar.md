# SIN-844: Widerlegte Review-Funde als Marker-Kommentar statt Leer-Commit

## Links
- [SIN-844 Linear Issue](https://linear.app/sinan-kahraman/issue/SIN-844/reviewyml-leer-commit-fund-gepruft-lost-das-nachste-review-aus)
- [GitHub Docs: `pull_request` `synchronize`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#pull_request)
- Löst ab: [SIN-381](SIN-381-review-fehlalarme.md) (Leer-Commit als Widerlegung)

## Entscheidung
- Hält die Reparatur alle schweren Funde für falsch, schreibt sie einen PR-Kommentar mit erster Zeile `<!-- fund-widerlegt sha=<head> -->` und je Fund `- <datei>: <Aussage> (<Begründung>)`. Kein Commit, also kein `synchronize` und kein neues Review.
- `review.mjs` liest diese Kommentare (und weiter alte Leer-Commits als Altbestand), gibt sie dem Modell als „schon geprüft“ und setzt gleiche Funde auf `widerlegt` (zählt im Ledger).
- Nur die ersten 2 Marker-Kommentare je PR nehmen das Label `repair:N` zurück (`MAX_WIDERLEGUNGEN`). Ab der dritten Widerlegung zählt die Runde normal, nach 3 Runden folgt `needs-human`.
- Die Reparatur bekommt dafür `Bash(gh pr comment:*)` (neue `allowedTools`: `risk:medium` mit Einspruchsfrist, keine Freigabe nötig).
- Der Fund „bereits widerlegt“ bleibt `widerlegt` statt `leicht`, damit er in der Kennzahl `widerlegt` erscheint.

## Annahmen
- Die Wortüberlappung in `sameFinding` bleibt unverändert; formuliert das Modell einen Fund ganz anders, greift die Grenze von 2 Widerlegungen.

## Warum
PR #411: 25 Leer-Commits in 57 Minuten, weil jeder Leer-Commit ein neues Review auslöste und jede Runde zurückgenommen wurde. Zustand gehört in Kommentare, nicht in Commits.
