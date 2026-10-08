# SIN-381: Review-Fehlalarme verbrauchen keine Reparatur-Runden

## Links
- [SIN-381 Linear Issue](https://linear.app/sinan-kahraman/issue/SIN-381/review-agent-fehlalarme-verbrauchen-reparatur-runden)
- [GitHub REST: Check Runs eines Commits](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference)
- Vorgänger: [SIN-297](SIN-297-review-agent.md)

## Entscheidung

- `review.mjs`: Ein schwerer Fund, der „Test schlägt fehl“ oder „Build bricht“ behauptet, wird `widerlegt`, wenn der Check `build` (enthält die Tests) für denselben Commit grün ist. Läuft `build` noch, wartet das Review bis zu 8 Minuten; ohne Ergebnis bleibt der Fund schwer.
- Die Reparatur schließt einen falschen Fund mit einem leeren Commit ab: erste Zeile `Fund geprüft, keine Änderung nötig`, danach je Fund `- <datei>: <Aussage> (<Begründung>)`. `review.yml` nimmt das Label `repair:N` dann zurück, die Runde zählt nicht.
- Das Review liest diese Commit-Texte, gibt sie dem Modell als Kontext mit und setzt denselben Fund (gleiche Datei, mindestens 50 % gleiche Wörter der kürzeren Aussage) auf `widerlegt`. `widerlegt` löst keine Reparatur aus.
- `needs-human` setzt weiter nur der Job `repair`, also nur bei einem noch schweren Fund nach 3 Runden. Höchstens 3 Runden bleibt.
- Kennzahl: Das Ledger im Review-Kommentar führt `gesamt` und `widerlegt`; das Tages-Update zeigt die Summe der letzten 7 Tage.

## Annahmen
- Schwere Fehlalarme ohne CI-Bezug (z. B. „Nullzugriff“) kann nur die Reparatur mit Begründung verwerfen, nicht der grüne Build.
- Begründungen im Commit-Text statt in einem PR-Kommentar, weil die Reparatur keine neuen `allowedTools` bekommt (sonst `risk:high`).

## Warum
In PR #193 meldete das Review dreimal Fehlalarme; alle Runden waren verbraucht und der PR stand auf `needs-human`, obwohl CI grün war.
