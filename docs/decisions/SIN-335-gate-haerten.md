# SIN-335: Gate auf main härten

- Links: https://linear.app/sinan-kahraman/issue/SIN-335, `.github/workflows/pr-gate.yml`
- Entscheidung: gitleaks-Download mit Wiederholungen, Label-Anlegen bricht das Gate nicht mehr, `merge-gate` gibt das Ergebnis von `gate` aus.
- Annahmen: Die Lauf-Logs waren im Agenten-Lauf nicht lesbar (`gh run` nicht freigegeben). Ursache vermutet bei einmaligen Fehlern im Job `gate` (Download, Label-API). Zeigt der nächste rote Lauf eine andere Ursache, folgt ein neues Issue.
- Warum: Ein Fehler ohne Aussage in `merge-gate` sperrt alle PRs; die kleinste Änderung macht das Gate robust und die Ursache sichtbar.
