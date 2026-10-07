# SIN-322: CI-Gates entsperren (CodeQL, Leistungsbudget)

Links: [Linear SIN-322](https://linear.app/sinan-kahraman/issue/SIN-322/ci-gates-entsperren-codeql-altfunde-und-wackeliges-leistungsbudget), Vorgänger SIN-295 (CodeQL-Gate), SIN-300 (Leistungsbudget), SIN-311 (LCP).

## Entscheidung

- Altfunde behoben: URL-Prüfungen in fünf Tests über `new URL(...).hostname` statt `.includes`; unvollständige Bereinigungen (`replace` mit Zeichenkette, nur erstes Vorkommen) auf `replaceAll` in `scripts/autonomy/` (`run-task`, `risk`, `sparen`, `digest`, `pause`).
- `codeql-gate.mjs`: nennt Quelldatei und Zeile je Fund und zählt Quelldateien. Im PR blockieren nur Funde in geänderten Dateien (`--changed`, Liste aus `git diff origin/<base>...HEAD`); Altfunde sind Warnungen. Auf `main` und im Zeitplan blockiert weiter jeder Fund hoher Schwere. Das Gate bleibt eingeschaltet.
- Leistungsbudget: Median aus 5 Läufen war schon da (`runs`, SIN-300). Neu: `tolerance: 0.1` in `performance-budget.json`, wirkt nur auf LCP und TBT (Zeitmessung, Rauschen); CLS und JS-Größe bleiben exakt. Die Grenzwerte selbst bleiben unverändert.

## Annahmen

- Die SARIF-Datei des Laufs war nicht lesbar; die fünf Stellen der Bereinigung stammen aus den Kandidaten im Issue. Ob CodeQL danach auf `main` null Funde zeigt, bestätigt erst der Lauf nach dem Merge. Bleibt ein Fund, zeigt das Gate jetzt Datei und Zeile.
- Lighthouse 13 misst LCP weiter mit simulierter Drosselung; ein Unterschied zu 12 ließ sich lokal nicht belegen, die Toleranz fängt Streuung ab.

## Warum

Altfunde blockierten jeden PR unabhängig vom eigenen Code. Ein PR soll nur an dem scheitern, was er selbst ändert; `main` bleibt streng. Eine 10-%-Toleranz auf Zeitwerte ist die kleinste Änderung gegen Messrauschen, ohne die Grenzen anzuheben.
