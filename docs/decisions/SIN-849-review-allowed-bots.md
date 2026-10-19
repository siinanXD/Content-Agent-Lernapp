# SIN-849: review.yml erlaubt Bot-Auslöser

- Links: Linear SIN-849, SIN-842 (gleiche Ursache in `repair.yml`), `.github/workflows/review.yml`
- Entscheidung: Der Schritt „Claude behebt die schweren Funde“ bekommt `allowed_bots: "claude[bot],github-actions[bot],dependabot[bot]"`.
- Annahmen: Die Lauf-Logs waren im Agenten-Lauf nicht lesbar. Ursache angenommen aus Fehlerbild (`result is_error:true`, PRs #426 und #431 von Bots) und SIN-842. Hilft das nicht, Logs der Läufe prüfen.
- Warum: Ohne `allowed_bots` lehnt `claude-code-action` Bot-Auslöser ab. Eine konkrete Liste statt `*`.
