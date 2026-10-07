# Lehren (SIN-296)

Jeder Lauf liest diese Datei zuerst. Eine Zeile je Lehre: **Was nicht geht → wie es richtig geht** (`Kennung`). Höchstens 150 Zeilen, keine Dopplungen: vor dem Ergänzen suchen, ob es die Lehre schon gibt. Wird es eng, fasst der Aufräum-Agent ältere Zeilen eines Themas zu einer zusammen.

**Pflicht nach jedem behobenen Bug** (auch im Reparatur-Lauf): eine Zeile unter dem passenden Thema ergänzen, im selben PR. Kein Bug, keine Zeile. Wiederholt sich ein Arbeitsablauf, gehört er als Anleitung nach `docs/skills/<name>/SKILL.md` (siehe `docs/skills/README.md`), nicht hierher.

## Workflows und github-script

- `getOctokit` in `actions/github-script@v7` nutzen → ist dort nicht definiert (in #66 behoben, in #72 wieder eingebaut). Richtig: `new github.constructor({ auth: process.env.AGENT_TOKEN })`. (SIN-240)
- Labels, Pushes, PRs oder Merges mit `github.token` auslösen → startet keine Folge-Workflows. Richtig: `AGENT_WORKFLOW_TOKEN`, auch für Checkout und `GH_TOKEN`. (SIN-240)
- Den Gate-Hinweis-Kommentar mit dem Agenten-Token schreiben → das Gate erkennt seinen Marker nur am Autor `github-actions[bot]`. Richtig: Kommentar mit dem Standard-Token, Labels und Merge mit dem Agenten-Token. (SIN-240)
- `permissions`, neue Secrets, `allowedTools`/`allowed_bots` oder fremde Actions nebenbei erweitern → macht den PR `risk:high` und wartet auf Sinan. Richtig: nur ändern, wenn das Issue es verlangt, sonst bestehende Rechte nutzen. (SIN-252)
- `pr-gate.yml`, `scripts/autonomy/risk.mjs` oder Branch-Protection im Zuge eines anderen Issues anfassen → `risk:high`. Richtig: eigenes Issue. (SIN-223)

## Bot-Starts und Rechte

- Einen Worker oder Dispatcher mit `github.token` starten → der Folge-Lauf startet nicht oder ohne Rechte. Richtig: `gh workflow run` mit `AGENT_WORKFLOW_TOKEN`. (SIN-240)
- Auf die Zeitpläne (`schedule`) von GitHub verlassen → sie sind unzuverlässig. Richtig: Selbst-Anstoß am Ende des Workers (`gh workflow run dispatch.yml`). (SIN-234)
- Als Agent selbst Labels `risk:*`, `freigegeben` oder `repair:*` setzen → nicht erlaubt, die Freigabe hängt daran, dass nur Sinan sie setzt. Richtig: den Gate-Workflow setzen lassen. (SIN-240)
- Ein Issue „In Progress“ lassen, obwohl weder PR noch Worker existieren → blockiert einen Slot. Richtig: der Abgleich setzt es nach 60 Min zurück auf Todo; Worker ohne PR setzen es selbst zurück. (SIN-237, SIN-291)

## Merge-Kette und PRs

- Den Index `docs/DECISIONS.md` von Hand bearbeiten → CI schlägt fehl, Konflikte bei parallelen PRs. Richtig: eine Datei `docs/decisions/<ID>-<kurz>.md`, dann `npm run decisions:index`, Index im selben PR committen. (SIN-240, SIN-251)
- `CHANGELOG.md` von Hand ändern → ist erzeugt. Richtig: PR-Titel als Conventional Commit mit Kennung, `npm run changelog` macht den Rest. (SIN-300)
- Einen Folge-PR für Reparaturen öffnen → bricht „ein Issue = ein PR“. Richtig: Fixes in denselben Branch pushen, höchstens 3 Runden. (SIN-207)
- Selbst mergen oder `gh pr merge` aufrufen → Auto-Merge macht das, sobald `build`, `pr-title` und `merge-gate` grün sind. (SIN-207)
- Vor dem Push `origin/main` nicht einmergen → Konflikte in erzeugten Dateien, rote Checks. Richtig: `git fetch origin main && git merge origin/main`, dann `npm ci`, Typecheck, Lint, Tests. (SIN-240)
- `package-lock.json` nicht mitcommitten → `npm ci` in CI scheitert. Richtig: Lock-Datei immer im selben PR. (SIN-236)
- Einen neuen PR-Titel ohne Kennung oder in Prosa schreiben → `pr-title` ist rot. Richtig: `feat(bereich): Klartext (SIN-123)`. (SIN-248)

## Tages-Update und Planer

- Den Tages-Update-Merker pro Kalendertag setzen → ein Testlauf um Mitternacht verbrauchte den ganzen Tag. Richtig: Wiederholungsschutz nur 6 h, Testläufe mit `-f force=true`. (SIN-267)
- Kontingent-Issues ohne Dedup anlegen → jede Planer-Runde legte dasselbe Issue neu an. Richtig: nicht anlegen, wenn ein gleich betiteltes offen ist oder in den letzten 24 h erledigt wurde (`recentlyDoneTitles`). (SIN-266)
- „Nur noch Bugs planen“ bei jedem knappen Kontingent auslösen → bremst unnötig. Richtig: nur bei Claude-Limit-Pause oder fast erreichtem 20-€-Deckel; Vercel, Sentry, PostHog, Langfuse, Supabase lösen nur Gegenmaßnahmen aus. (SIN-266)

## Vercel- und Linear-Limits

- Jeden Merge auf `main` deployen lassen → Vercel Hobby erlaubt 100 Deployments pro Tag, der Loop stand still. Richtig: Production gebündelt über den Deploy Hook (höchstens 1× pro Stunde), Previews nur bei UI-Änderungen oder Label `preview`. (SIN-254, SIN-266)
- Production per Deploy Hook auslösen, solange `git.deploymentEnabled: false` gilt → es entstand 30 Merges lang kein Deploy, und der Smoke-Test an `deployment_status` blieb stumm. Richtig: `vercel deploy --prod` per CLI (`production-deploy.yml`), Smoke-Test im selben Lauf, „nicht lesbar“ und „> 3 h hinter main“ als roter Alarm. (SIN-332)
- Den letzten READY-Deploy unter den letzten 20 Production-Deploys suchen → sind alle abgebrochen, steht „nicht lesbar“. Richtig: Vercel mit `state=READY&limit=1` fragen. (SIN-332)
- Reine Doku-, CI- oder Test-Commits bauen lassen → verbraucht Deployments. Richtig: `scripts/vercel-ignore.sh` überspringt sie; keine Reparatur-Pushes ohne Not. (SIN-264)
- Linear-API ohne Wiederholung aufrufen → 429 oder eine HTML-Fehlerseite statt JSON bricht den Lauf. Richtig: `fetchJson` aus `scripts/autonomy/http.mjs` (3 Versuche bei 429, 5xx, Netzfehler, Fehlerseite). (SIN-263)
- Beliebig viele Linear-Issues anlegen → das Free-Kontingent (250 aktive Issues) läuft voll. Richtig: ab 95 % legt der Planer nichts mehr an; Duplikate vorher prüfen. (SIN-291)

## Läufe, Verbrauch und Prüfungen

- Ein zu großes Issue in einem Lauf bearbeiten → Runden-Deckel (`error_max_turns`), kein PR. Richtig: Größe beachten (`docs/autonomy/groessen.md`), Auftrag in Teil-Issues zerlegen. (SIN-291, SIN-320)
- Das Repo für die Orientierung durchsuchen → kostet Runden. Richtig: erst `docs/LANDKARTE.md`, dann gezielt öffnen. (SIN-320)
- Grenzen in `performance-budget.json` anheben oder Barrierefreiheits-Tests abschalten, um zu mergen → verboten. Richtig: die Ursache beheben. (AGENTS.md)
- Hex-Farben im Code → Stil E erlaubt nur Tokens. Richtig: `var(--color-*)` aus `src/app/globals.css`. (SIN-271)
- Rote PRs in „In Progress“ halten ihren Platz ewig und blockieren den Fix → wartende PRs (Konflikt, repair:3, risk:high ohne Freigabe) zählen nicht als Platz, Urgent kommt vor der Spuren-Rotation. (SIN-327)
- Inline-Textlinks (`text-sm`, ca. 40 px hoch) reißen das 44-px-Ziel im Tastatur-Test → `inline-flex min-h-11 items-center` setzen. (SIN-317)
- Leistungsbudget (Lighthouse) bricht zufällig: LCP streut bei kaltem Erstabruf und wenigen Läufen → Aufwärmlauf je Route und Median aus 7 Läufen; Grenzen nie anheben. (SIN-329)
- Wächter meldet „Ursache nicht erkennbar“, wenn kein Lauf rot war (Logs leer) → `collectLogs` liefert auch dann eine Zeile „Kein roter Lauf: …“, Ursache `ohne-start`. (SIN-328)
- Hostprüfung per `includes`/Regex ohne URL-Parsing → CodeQL `js/incomplete-url-substring-sanitization` (7.8) bricht `analyze`. Richtig: `new URL(u).hostname` gegen eine Liste vergleichen. (SIN-330)
- Einmalige Fehler im Job `gate` (gitleaks-Download, Label-API) färben `merge-gate` auf allen PRs rot → Download mit `curl --retry`, Label-Anlegen nur warnen, `merge-gate` nennt das Ergebnis von `gate`. (SIN-335)
- Dashboard-Kacheln filtern auf Scores ohne Score-Config (`capEur`, `Bestehensquote`) → jeden im Dashboard genutzten Score in `scoreConfigSpecs()` anlegen. (SIN-299)
- `/start` springt erst nach Hydration per `router.replace` nach `/willkommen` → Lighthouse misst den Umweg mit (LCP 2756 ms). Richtig: Weiterleitung als Inline-Skript im HTML vor CSS und JS, Schlagzeile als Server-Komponente; mit `--details` prüfen, welche Seite das LCP-Element ist. (SIN-345)
