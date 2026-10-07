# Autonomie (SIN-223)

**Stand:** Schritte 1 und 2 sind erledigt (Workflows aktiv, `pr-gate` nutzt `risk.mjs`). `dispatch.yml` und `planner.yml` hier bleiben als Vorlage; maßgeblich sind die Dateien in `.github/workflows/`. Entscheidung: D-39.

**Einmalig von Sinan:** Secrets `LINEAR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` setzen. Optional `AGENT_VARIABLES_TOKEN` (PAT, nur „Variables: write“), damit der Dispatcher `AGENT_PAUSED_UNTIL` bei Claude-Limit selbst setzt. Pause von Hand: Repo-Variable `AGENT_PAUSED_UNTIL` auf eine ISO-Zeit setzen, leeren hebt sie auf. Einfacher: Notbremse per Workflow `loop-pause` (siehe SIN-294 unten).

## SIN-320: Sparsam bauen

Größe je Issue (`groesse:klein|mittel|gross`) bestimmt Modell und `--max-turns` des Workers (klein: Haiku, 30; mittel: Sonnet, 80; groß: Sonnet, 150; Haiku ohne PR → zweiter Versuch mit Sonnet). Kleinkram desselben Bereichs läuft als ein Lauf mit einem PR. Nach jedem Worker- und Repair-Lauf steht der Verbrauch (Tokens, Runden, Dauer, API-Gegenwert) im PR-Steckbrief und in Linear, die Wochensumme samt „Teuersten 3“ im Tages-Update. Kriterien und Einzelheiten: `docs/autonomy/groessen.md`; Entscheidung: `docs/decisions/SIN-320-sparsam-bauen.md`. Prüfen: `npm run autonomy:dispatch:dry` (Größe und Bündel stehen in der Ausgabe), `npm run autonomy:digest:dry`.

## SIN-294: Notbremse, Erreichbarkeit der App, Token-Ablauf

**Notbremse.** Workflow `loop-pause.yml` (nur `workflow_dispatch`): `aktion` = `pausieren` (optional `stunden`, leer = 24, höchstens 720) oder `fortsetzen`. Er setzt die Repo-Variable `AGENT_PAUSED_UNTIL` auf die Endzeit (UTC) oder löscht sie; Dispatcher und Planer lesen sie wie bisher und starten dann nichts. Laufende Worker enden normal. Braucht das Secret `AGENT_VARIABLES_TOKEN` (PAT, nur „Variables: write“); fehlt es, schlägt der Lauf rot fehl und nennt die Variable zum Von-Hand-Setzen. Am Handy: GitHub Mobile → Actions → `loop-pause` → Run workflow → Aktion wählen. Die Status-Seite zeigt „Pausiert bis …“. Prüfen: `node scripts/autonomy/pause.mjs pausieren 2` (berechnet nur den Wert, setzt nichts).

**Erreichbarkeit der App.** `GET https://content-agent-ashen-nu.vercel.app/api/health` antwortet `200` mit `"ok": true, "db": "ok"`, wenn die Datenbank (Supabase, eine Lesezeile aus `courses`, Zeitlimit 4 s) antwortet, sonst `503` mit `"db": "unreachable"`. Einmalig von Sinan bei [cron-job.org](https://cron-job.org):

1. Neuer Cronjob: URL `https://content-agent-ashen-nu.vercel.app/api/health`, Methode GET, Takt alle 5 Minuten, Zeitlimit 30 s.
2. Als Erfolg gilt HTTP 2xx (Standard).
3. Benachrichtigungen einschalten: „bei Fehlschlag“ (und „bei Wiederherstellung“) per E-Mail an Sinans Adresse, Schwelle 1 Fehler.

Die Route liefert nur Dienstname, Speicher-Art und DB-Zustand, keine Geheimnisse und keine Personendaten.

**Token-Ablauf.** `docs/autonomy/tokens.md` listet alle Tokens mit Ablaufdatum (Name, Ort, Ablauf, Rechte, nie Werte). Die Status-Seite zeigt „läuft in X Tagen ab“; ab 14 Tagen vorher (und danach) steht der Token im Tages-Update unter „Braucht dich“. Bekannt: `cron-takt` und Figma `agents-read` laufen am 03.01.2027 ab. Bei `unbekannt` trägt Sinan das Datum nach; ein erneuerter Token bekommt sein neues Datum in der Tabelle. Entscheidung: `docs/decisions/SIN-294-notbremse-erreichbarkeit-token.md`.

---

## SIN-246: Tages-Update um 10:00 und 20:00

`digest.yml` schreibt zweimal täglich einen kurzen Kommentar mit @siinanXD ins Issue „Loop-Status“ (Push über GitHub Mobile): gebaut seit dem letzten Update (nach Spur), neue Entscheidungen, Plan, „Braucht dich“, Kennzahlen, Phase und Produktreife. Ein Lauf pro Tag + Slot; der Merker steht als HTML-Kommentar im Kommentar, nicht löschen. Entscheidung: `docs/decisions/SIN-246-tages-update.md`.

**Einmalig von Sinan:** bei [cron-job.org](https://cron-job.org) zwei Jobs mit Zeitzone Europe/Berlin und dem Token aus SIN-238 (Actions: Read and write) anlegen: `POST https://api.github.com/repos/siinanXD/Content-Agent-Lernapp/actions/workflows/digest.yml/dispatches`, gleiche Header wie beim Status-Job, Body `{"ref":"main","inputs":{"slot":"morgen"}}` um 10:00 und `{"ref":"main","inputs":{"slot":"abend"}}` um 20:00. Optional Telegram: Secrets `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID`.

**Prüfen:** `npm run autonomy:digest:dry` (beide Varianten mit Fixture). Live: `gh workflow run digest.yml -f slot=morgen` (mit `-f dry_run=true` nur ausgeben).

---

## SIN-238: Loop-Status, Wächter, externer Takt

`status.yml` schreibt den Text des angepinnten Issues „Loop-Status“ (Label `loop-status`, wird beim ersten Lauf angelegt) neu: Jetzt, Schlange, letzte 24 h, Kontingente in %. Bei Stillstand oder Abbruch kommt ein Kommentar mit @siinanXD (Push über GitHub Mobile), je Vorfall einmal. Der Merker steht als HTML-Kommentar am Ende des Issue-Texts, nicht löschen. Entscheidung: D-47.

**Wächter-Fälle:** Worker fehlgeschlagen · kein Worker seit > 45 Min trotz startbarer Todos · „In Progress“ ohne Worker und PR seit > 15 Min (Geister-Issue, SIN-291) · **Selbst-Diagnose (SIN-291):** kein Worker seit > 30 Min trotz Arbeit oder leere Schlange → Ursache aus den letzten planner/dispatch/worker-Logs (Absturz, Linear-Limit, Regel blockiert, Kontingent) und ein Bug-Issue (`claude`, `Bug`, dringend) mit Log-Auszug, kein Duplikat · Worker ohne PR → Issue sofort auf Todo mit Grund (letzte Ausgabe, num_turns, permission denials), zu große Aufträge in 2–4 Teil-Issues · „## Entscheidung nötig“ in gemergten PRs steht unter „Braucht dich“ (Status-Seite, Tages-Update), bis Sinan im PR antwortet oder `entschieden` setzt · Linear-Issues gegen 250: Hinweis ab 85 %, ab 95 % legt der Planer nichts an · PR wartet > 2 h auf Freigabe · Pause aktiv · Kontingent > 80 % (Meldung; „nur Bugs“ planen gilt nur bei Claude-Kontingent/API-Deckel, SIN-266). **Production-Deploy (SIN-266, SIN-332):** Git-Deploys sind aus (`vercel.json`, SIN-309); `status.yml` startet `production-deploy.yml` (`vercel deploy --prod` per CLI, danach Smoke-Test im selben Lauf, bei Rot Revert-PR) höchstens 1× pro Stunde, nur bei neuem App-Code (ab Vercel 90 % alle 3 h) und höchstens einmal je Commit (neuer Versuch bei neuem Commit oder nach 6 h). Endet er CANCELED/ERROR: Meldung „Production hängt seit hh:mm“ plus Bug-Issue, kein zweiter Versuch. **Roter Alarm (SIN-332):** Vercel nicht lesbar, oder Production liegt > 3 h hinter `main` (gemergter App-Code nicht live) → roter Punkt „Braucht dich (rot)“ in der Status-Seite und im Tages-Update, Erwähnung und Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`), einmal je Vorfall. Die Status-Seite zeigt Live-Stand (Commit, Zeit, Merges voraus) und „Vercel heute: x/100 (Production y, Vorschau z)“, Warnung ab 70. **Selbstheilung:** Merge-Konflikt in Agenten-PR → `@claude` im PR (2 Versuche, dann Meldung an Sinan) · `merge-gate` rot trotz `freigegeben` → Hinweis „Label entfernen und neu setzen“ · „In Progress“ mit gemergtem PR → Done · Stillstand → `status.yml` stößt `dispatch.yml` an (höchstens alle 10 Min).

**Einmalig von Sinan:**

1. Externer Takt (GitHubs `schedule` feuert unzuverlässig): fein-granularen Token anlegen (GitHub → Settings → Developer settings → Fine-grained tokens): nur Repo `Content-Agent-Lernapp`, nur **Actions: Read and write**. Bei [cron-job.org](https://cron-job.org) einen Job alle 15 Min anlegen: `POST https://api.github.com/repos/siinanXD/Content-Agent-Lernapp/actions/workflows/status.yml/dispatches` (Repo-Namen prüfen), Header `Authorization: Bearer <Token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, Body `{"ref":"main"}`. Antwort bei Erfolg: 204. Der Token gehört nur in cron-job.org, nie ins Repo.
2. Optional für Kontingente (sonst „nicht messbar“): Secrets `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SENTRY_AUTH_TOKEN`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`; Variablen `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `SUPABASE_PROJECT_REF`, `SENTRY_ORG`. Alles nur lesend.
3. Limits stehen in `docs/autonomy/free-tier-limits.json` (`geprueft: null` = noch nicht gegen die Docs geprüft, SIN-225).

**Prüfen:** `npm run autonomy:status:dry` (Fixture, zeigt Text und Erwähnung). Wächter live testen: `gh workflow run worker.yml -f identifier=SIN-0 -f fail_test=true`; der Lauf scheitert sofort ohne Claude, danach muss im Issue „Loop-Status“ ein Kommentar mit @siinanXD und „Absichtlicher Test-Fehler“ stehen. Trockenlauf des Status: `gh workflow run status.yml -f dry_run=true`.

---

## SIN-234: Agenten-Token mit Workflow-Recht (letzte manuelle Kopie)

**Einmalig von Sinan** (ca. 5 Min):

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate. Name `agent-workflows`, Ablauf 1 Jahr, nur Repo `Content-Agent-Lernapp`. Rechte: Contents RW, Pull requests RW, Issues RW, **Workflows RW**, Metadata R.
2. In Infisical `/content-agent-lernapp` → Development als `AGENT_WORKFLOW_TOKEN` speichern, dann GitHub-Sync „Trigger Sync“.
3. **Letzte Kopie:** `dispatch.yml`, `claude.yml`, `repair.yml`, `worker.yml` aus diesem Ordner nach `.github/workflows/` kopieren (überschreiben). Den ersten Kommentarblock „Vorlage (SIN-234) …“ kannst du löschen.
4. Prüfen: Test-PR, der in einer Workflow-Datei `contents: write` ergänzt. Er muss Label `risk:high` bekommen und auf `freigegeben` warten (eine normale Schritt-Änderung bleibt `risk:medium`).

Ohne das Secret laufen die Workflows wie bisher (Rückfall auf Claude-GitHub-App bzw. `github.token`). Ab SIN-252 ist eine Workflow-Änderung nur noch `risk:high`, wenn sie Rechte erweitert (`permissions`, neue Secrets, `allowedTools`/`allowed_bots`, neue Drittanbieter-Action) oder das Gate selbst ändert. Danach entfällt die Kopier-Pflicht; diese Vorlagen und die Abschnitte „Einmalig von Sinan“ unten sind dann nur noch Historie und werden entfernt, sobald die Workflows live sind.

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
