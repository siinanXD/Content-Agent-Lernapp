# Autonomie (SIN-223)

Der Agent-Token darf `.github/workflows/` nicht ändern. Diese Dateien muss Sinan von Hand übernehmen:

1. `dispatch.yml` und `planner.yml` nach `.github/workflows/` kopieren, `claude.yml` hier ersetzt die bestehende `.github/workflows/claude.yml` (neu: `git fetch` und `git merge` in `--allowedTools`, damit Claude Konflikte mit `main` selbst löst). Secrets: `LINEAR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `VARIABLES_TOKEN` (PAT mit „Variables: write“, für die Pause), optional `VERCEL_TOKEN` plus Variable `VERCEL_PROJECT_ID` (Free-Tier-Wächter) und für den Planer Supabase, Sentry, PostHog.

Budget (3b), alles im Dispatcher:
- Alle 30 Min. Cursor zuerst: Ein Todo wird erst von Claude übernommen, wenn es 30 Min unberührt ist.
- Claude-Limit: Der Workflow setzt die Repo-Variable `AGENT_PAUSED_UNTIL` (Reset oder jetzt + 5 h), das Issue geht zurück auf Todo. Bis dahin startet nichts. Manuell aufheben: Variable leeren.
- Vercel Hobby (100 Deploys/Tag): `vercel.json` ruft `scripts/autonomy/vercel-ignore.mjs` auf. Preview nur für den letzten Commit eines Branches, kein Deploy, wenn nur `docs/`, `*.md` oder `.github/` geändert sind.
- `scripts/autonomy/limits.mjs` öffnet ein GitHub-Issue, wenn ein Limit aus `free-tier-limits.json` 80 % erreicht. Test: `node scripts/autonomy/limits.mjs --dry-run --usage <datei.json>`.
2. `pr-gate.yml` anpassen, damit es die neuen Regeln nutzt:
   - Einen Schritt `actions/checkout` mit `ref: ${{ github.event.pull_request.base.sha }}` davor setzen (Basis, nie PR-Code) und gitleaks laufen lassen (`gitleaks detect --no-git` auf dem PR-Diff, Ergebnis als `secretLeak`).
   - In `actions/github-script` die Listen `HIGH` und `LOW` und die Größenregel entfernen. Stattdessen `const { classifyRisk, approvalStillValid } = await import(`${process.env.GITHUB_WORKSPACE}/scripts/autonomy/risk.mjs`)` aufrufen, mit den Dateien (`filename`, `previous_filename`, `status`, `patch`) aus `pulls.listFiles`.
   - Label `risk:low` entfällt. Im Kommentar des Gates statt des SHA die High-Gründe als `<!-- pr-gate approved-keys: [...] -->` speichern; `approvalStillValid` entscheidet, ob `freigegeben` bleibt.
3. Testen: `npm test` (Gate-Fälle), `node scripts/autonomy/dispatch.mjs --dry-run --fixture docs/autonomy/fixture-issues.json`, `node scripts/autonomy/planner.mjs --create docs/autonomy/fixture-plan.json --dry-run`.
