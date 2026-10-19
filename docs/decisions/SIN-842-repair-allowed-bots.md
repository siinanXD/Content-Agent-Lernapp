# SIN-842: repair.yml erlaubt Dependabot als Auslöser

- Issue: https://linear.app/sinan-kahraman/issue/SIN-842
- Entscheidung: `allowed_bots: "dependabot[bot]"` am Claude-Schritt von `repair.yml`, nicht `*`. Endet der Claude-Schritt nicht mit `success`, setzt „Ohne Commit weiter“ sofort `needs-human` und kommentiert mit Lauf-Link, statt `ci` neu zu starten.
- Annahmen: Die Action-Fehlermeldung ist nicht als Step-Output verfügbar; der Kommentar nennt Ergebnis und Lauf-Link. Fork-PRs bleiben durch die `head_repository`-Bedingung ausgeschlossen. Leitstand #275 braucht dieselbe Einstellung (eigenes Repo, hier nicht änderbar).
- Warum: Sonst verpuffen alle 3 Runden auf Dependabot-PRs ohne Versuch.
