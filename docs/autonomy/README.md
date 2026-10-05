# Autonomie (SIN-223)

Der Agent-Token darf `.github/workflows/` nicht ändern. Diese Dateien muss Sinan von Hand übernehmen:

1. `dispatch.yml` und `planner.yml` nach `.github/workflows/` kopieren. Secrets: `LINEAR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` (optional für den Planer: Supabase, Sentry, PostHog).
2. `pr-gate.yml` anpassen, damit es die neuen Regeln nutzt:
   - Einen Schritt `actions/checkout` mit `ref: ${{ github.event.pull_request.base.sha }}` davor setzen (Basis, nie PR-Code) und gitleaks laufen lassen (`gitleaks detect --no-git` auf dem PR-Diff, Ergebnis als `secretLeak`).
   - In `actions/github-script` die Listen `HIGH` und `LOW` und die Größenregel entfernen. Stattdessen `const { classifyRisk, approvalStillValid } = await import(`${process.env.GITHUB_WORKSPACE}/scripts/autonomy/risk.mjs`)` aufrufen, mit den Dateien (`filename`, `previous_filename`, `status`, `patch`) aus `pulls.listFiles`.
   - Label `risk:low` entfällt. Im Kommentar des Gates statt des SHA die High-Gründe als `<!-- pr-gate approved-keys: [...] -->` speichern; `approvalStillValid` entscheidet, ob `freigegeben` bleibt.
3. Testen: `npm test` (Gate-Fälle), `node scripts/autonomy/dispatch.mjs --dry-run --fixture docs/autonomy/fixture-issues.json`, `node scripts/autonomy/planner.mjs --create docs/autonomy/fixture-plan.json --dry-run`.
