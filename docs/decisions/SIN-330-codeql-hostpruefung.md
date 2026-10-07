# SIN-330: Hostprüfung per URL-Parsing statt Teilstring/Regex

- Links: https://linear.app/sinan-kahraman/issue/SIN-330, https://codeql.github.com/codeql-query-help/javascript/js-incomplete-url-substring-sanitization/
- Entscheidung: Quell-Hosts werden mit `new URL(u).hostname` gegen eine feste Liste geprüft (zwei Curriculum-Tests, `scripts/content-check-sources.mjs`).
- Annahmen: Die Fundstelle (`kmk.org`) liegt in den Host-Regexen der Curriculum-Tests; CodeQL ließ sich lokal nicht ausführen, die Bestätigung kommt vom `analyze`-Lauf. Bleibt ein Fund, steht die Stelle im Log.
- Warum: Beseitigt das gemeldete Muster, ohne die Prüfung abzuschwächen (https und Host bleiben erzwungen).
