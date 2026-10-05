# Autonomie (SIN-223)

**Stand:** Schritte 1 und 2 sind erledigt (Workflows aktiv, `pr-gate` nutzt `risk.mjs`). `dispatch.yml` und `planner.yml` hier bleiben als Vorlage; maßgeblich sind die Dateien in `.github/workflows/`. Entscheidung: D-39.

**Einmalig von Sinan:** Secrets `LINEAR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` setzen. Optional `AGENT_VARIABLES_TOKEN` (PAT, nur „Variables: write“), damit der Dispatcher `AGENT_PAUSED_UNTIL` bei Claude-Limit selbst setzt. Pause von Hand: Repo-Variable `AGENT_PAUSED_UNTIL` auf eine ISO-Zeit setzen, leeren hebt sie auf.

---

## SIN-234: Agenten-Token mit Workflow-Recht (letzte manuelle Kopie)

**Einmalig von Sinan** (ca. 5 Min):

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate. Name `agent-workflows`, Ablauf 1 Jahr, nur Repo `Content-Agent-Lernapp`. Rechte: Contents RW, Pull requests RW, Issues RW, **Workflows RW**, Metadata R.
2. In Infisical `/content-agent-lernapp` → Development als `AGENT_WORKFLOW_TOKEN` speichern, dann GitHub-Sync „Trigger Sync“.
3. **Letzte Kopie:** `dispatch.yml`, `claude.yml`, `repair.yml`, `worker.yml` aus diesem Ordner nach `.github/workflows/` kopieren (überschreiben). Den ersten Kommentarblock „Vorlage (SIN-234) …“ kannst du löschen.
4. Prüfen: Test-PR, der eine Workflow-Datei ändert. Er muss Label `risk:high` bekommen und auf `freigegeben` warten.

Ohne das Secret laufen die Workflows wie bisher (Rückfall auf Claude-GitHub-App bzw. `github.token`). Ab Schritt 3 ist `risk.mjs` schon aktiv: jede Änderung unter `.github/workflows/` ist `risk:high` (Grund „workflow“). Danach entfällt die Kopier-Pflicht; diese Vorlagen und die Abschnitte „Einmalig von Sinan“ unten sind dann nur noch Historie und werden entfernt, sobald die Workflows live sind.

---

## SIN-227: drei Spuren, Figma zuerst, Produktreife, Worker

**Einmalig von Sinan** (bis SIN-234 aktiv ist, darf der Agent-Token `.github/workflows/` nicht ändern; Entscheidung D-42):

1. `dispatch.yml` und `planner.yml` aus diesem Ordner nach `.github/workflows/` kopieren (überschreiben), **neu:** `worker.yml` dorthin kopieren. Der Dispatcher wählt nur noch und startet je Issue einen Worker-Lauf; `dry_run` ist jetzt standardmäßig `false`.
2. Optional Secret `FIGMA_ACCESS_TOKEN` (nur lesen) für den Abgleich Code ↔ Figma im Planer.
3. Linear-Labels `frontend`, `content`, `backend`, `design`, `abnahme` (der Planer legt fehlende selbst an).
4. Einmalige Freigabe der neuen Checkliste in `docs/PRODUCT.md` (Abschnitt „Produktreife“, `risk:high`).

Prüfen: `npm run autonomy:dispatch:dry`, `npm run autonomy:planner:dry` (zeigt Produktreife-Tabelle und die Spuren), `npm run autonomy:planner:context` (der Prompt für Claude).

Produktreife: Messwerte (Bestehensquote, offene `design`-Issues, Figma-Frames, Sentry) kommen vom Planer; alles andere zählt erst, wenn es in `docs/product-readiness.json` unter `bestaetigt` mit Datum und Beleg steht. Sinans Antwort auf die Abnahme kommt unter `abnahme.antwort` hinein und beendet den Pflege-Modus.

---

Der Agent-Token darf `.github/workflows/` nicht ändern. Diese Dateien muss Sinan von Hand übernehmen:

1. `dispatch.yml` und `planner.yml` nach `.github/workflows/` kopieren. Secrets: `LINEAR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` (optional für den Planer: Supabase, Sentry, PostHog).
2. `pr-gate.yml` anpassen, damit es die neuen Regeln nutzt:
   - Einen Schritt `actions/checkout` mit `ref: ${{ github.event.pull_request.base.sha }}` davor setzen (Basis, nie PR-Code) und gitleaks laufen lassen (`gitleaks detect --no-git` auf dem PR-Diff, Ergebnis als `secretLeak`).
   - In `actions/github-script` die Listen `HIGH` und `LOW` und die Größenregel entfernen. Stattdessen `const { classifyRisk, approvalStillValid } = await import(`${process.env.GITHUB_WORKSPACE}/scripts/autonomy/risk.mjs`)` aufrufen, mit den Dateien (`filename`, `previous_filename`, `status`, `patch`) aus `pulls.listFiles`.
   - Label `risk:low` entfällt. Im Kommentar des Gates statt des SHA die High-Gründe als `<!-- pr-gate approved-keys: [...] -->` speichern; `approvalStillValid` entscheidet, ob `freigegeben` bleibt.
3. Testen: `npm test` (Gate-Fälle), `node scripts/autonomy/dispatch.mjs --dry-run --fixture docs/autonomy/fixture-issues.json`, `node scripts/autonomy/planner.mjs --create docs/autonomy/fixture-plan.json --dry-run`.
