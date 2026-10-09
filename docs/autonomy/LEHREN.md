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
- Frei gewordenen Platz erst beim 30-Min-Zeitplan füllen → bis 45 Min Leerlauf. Richtig: nach Merge (`post-merge`) und nach Worker ohne PR `dispatch.yml` anstoßen; die Gruppe `dispatch` verhindert Doppelstarts. (SIN-334)
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
- Kennzahl „bewertet“ exakt gegen `questions.id` abgleichen, obwohl der Lauf `question_id` als `<unit_id>-<id>` schreibt → blieb 0 von 1852. Richtig: IDs beim Lesen normalisieren (`ratedQuestions`) und Schreib-/Lese-Schlüssel per Test koppeln. (SIN-409)

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
- Ein Fehler in einem Richter-Chunk (429/5xx/JSON) ließ den Rest des Kurses unbewertet → Chunk bis zu 3-mal wiederholen, bei Misserfolg weiterlaufen, Rest bleibt für den nächsten Lauf offen. (SIN-386)
- Einmalige Fehler im Job `gate` (gitleaks-Download, Label-API) färben `merge-gate` auf allen PRs rot → Download mit `curl --retry`, Label-Anlegen nur warnen, `merge-gate` nennt das Ergebnis von `gate`. (SIN-335)
- Ein Skript in `scripts/autonomy/*.mjs` mit Top-Level-`await` einbinden, das ein Test importiert → tsx (cjs) bricht den ganzen Testlauf ab. Richtig: `main().catch(…)` in der Haupt-Prüfung statt `await`. (SIN-298)
- Gate-Bruch-Fehlalarm aus alten Läufen oder Dependabot-PRs → nur Läufe nach dem letzten Merge auf main, Dependabot ignorieren, Check auf main gegenprüfen (grün: PRs neu anstoßen). (SIN-333)
- Dashboard-Kacheln filtern auf Scores ohne Score-Config (`capEur`, `Bestehensquote`) → jeden im Dashboard genutzten Score in `scoreConfigSpecs()` anlegen. (SIN-299)
- `/start` springt erst nach Hydration per `router.replace` nach `/willkommen` → Lighthouse misst den Umweg mit (LCP 2756 ms). Richtig: Weiterleitung als Inline-Skript im HTML vor CSS und JS, Schlagzeile als Server-Komponente; mit `--details` prüfen, welche Seite das LCP-Element ist. (SIN-345)
- Ergebnisseite mit Standardwerten füllen, wenn kein Ergebnis gespeichert ist (5 von 6, 120 Punkte) → erfundene Zahlen sind verboten. Richtig: „Noch kein Ergebnis“ mit Weg zur Einheit zeigen. (SIN-326)
- Kennzahl-Skript meldet bei fehlendem Secret nur „nicht verfügbar“, und ein Fehler der ersten Abfrage verdeckt die zweite → fehlende Variablen beim Namen nennen und jede Abfrage einzeln fangen. (SIN-350)
- Migration legt Tabelle an, Kennzahl meldet trotzdem „Tabelle fehlt“ (REST 404) → PostgREST kennt sie erst nach `notify pgrst, 'reload schema'`; in jede Migration mit `create table` aufnehmen, `migrate` lädt den Cache jetzt immer neu. (SIN-351)
- Konfigurierte Grenze ist real weg (Linear Basic, `limit: null`), der Planer bremst trotzdem → `null` ausdrücklich als „unbegrenzt“ behandeln und das Limit aus `free-tier-limits.json` lesen, nicht als Konstante im Skript. (SIN-360)
- Rechtsseite ohne Platzhalter ausgefüllt, Test erwartet noch „Entwurf“ und „[Region prüfen]“ → `draft` folgt nur den Platzhaltern (nicht `entwurf:`); Test im selben PR an den Inhalt anpassen. (SIN-341)
- Test erwartet das Impressum als Entwurf, nachdem die Platzhalter ersetzt wurden → beim Eintragen echter Rechtsdaten die Entwurf-Erwartung in `src/lib/legal/legal.test.ts` im selben PR anpassen. (SIN-340)
- Migration legt neue Tabelle an, Kennzahl meldet trotzdem „Tabelle fehlt" per REST 404 → PostgREST kennt die Tabelle erst nach `notify pgrst, 'reload schema'`; in jede Migration mit `create table` am Ende aufnehmen (auch bei bereits bestehenden Migrationen). (SIN-358)
- Bericht meldet jedes REST-404 pauschal als „Tabelle fehlt“ → PostgREST-Code aus `ServiceError.body` lesen und über `scripts/autonomy/table-error.mjs` als fehlt / Zugriff / Schema-Cache / unbekannt melden. (SIN-359)
- Statisch gerenderte Seite zeigt Inhalt mit `new Date()` → um Mitternacht (Build vor, Hydration nach dem Tageswechsel) React-Fehler #418 im Smoke-Test. Datumsabhängiges erst per `useAfterMount` berechnen. (SIN-359)
- Wächter nennt „kein Worker gestartet“ und zeigt als letzten dispatch-Lauf einen übersprungenen Lauf → das war ein PR-Ereignis (Merge/Label), das den Dispatcher-Job überspringt. `collectLogs` ignoriert `skipped`- und `pull_request`-Läufe, damit der echte Zeitplan-Lauf zählt. (SIN-361)
- Statusmeldung (`role=status`) erst zusammen mit dem Text einfügen → Reader sagt sie oft nicht an. Region dauerhaft im DOM lassen und nur den Text füllen; nach Wegfall des fokussierten Buttons den Fokus gezielt setzen. (SIN-370)
- Kennzahl-Abfrage meldet „nicht im Schema-Cache“, obwohl der Cache Sekunden später geladen ist → bei PGRST205 genau einmal nach kurzer Pause wiederholen, erst danach Tabelle und Migration nennen. (SIN-367)
- Bewertungslauf zeigt „0 bewertet”, das Log nur „OpenAI 400” oder nichts → Fehlertext der API und Fehler je Kurs ausgeben, Exit 1 bei Fehlern; `migrate` prüft auch `question_evaluations` und `judge_runs`. (SIN-371)
- Sentry-Kennzahlen-Abfrage meldet HTTP 400 „Invalid stats_period” → nur `''`, `'24h'`, `'14d'` sind erlaubt; `7d` nicht. Das 7-Tage-Fenster über `lastSeen:-7d` im Query bilden, nicht über `statsPeriod`. (SIN-377)
- axe meldet Kontrast 3,3:1 an einem Knopf, der gerade von `disabled` (opacity 50) auf aktiv wechselt → `transition` blendet 150 ms ein. Im E2E vor axe auf `toHaveCSS("opacity", "1")` warten, nie die Farbe ändern. (SIN-356)
- Migration gemergt, Tabelle fehlt trotzdem in Supabase (`migrate` lief nur per Handstart) → `migrate.yml` läuft nach jedem Merge auf `supabase/migrations/**`, Wächter zeigt „Migrationen: n/n“; PGRST205 allein heißt „Tabelle oder Schema-Cache“, nicht nur Cache. (SIN-374)
- Workflow läuft bei jedem Push „rot“ mit 0 Jobs (revert-guard) → mehrzeilige Texte im `run: |`-Block nie als uneingerückte freie Zeilen schreiben, sondern per `printf` bauen; vor dem Merge `actionlint` über die Datei laufen lassen. (SIN-382)
- Langfuse zeigt im Kurslauf nichts, `langfuse_trace_id` leer, Kosten fehlen → Traces je Schritt direkt schreiben (`grow-traces.ts`: Batch start/fertig, je `judge()`, Flush), Trace-ID in `EvaluateResult.langfuseTraceId`, Kosten auch bei Abbruch schreiben. (SIN-380)
- Langfuse zeigt nur Kennungen und Zahlen, keine einzelne Frage anklickbar → ein Trace je Einheit mit Fragetext, Antwort, Begründung und Scores je Frage (`unit-traces.ts`); die Batch-Sammel-Traces aus SIN-380 entfallen. (SIN-383)
- Review-Agent meldet „Test schlägt fehl“, obwohl `build` grün ist, und verbraucht alle 3 Reparatur-Runden → Fund gilt als widerlegt, wenn `build` für denselben Commit grün ist; begründet verworfene Funde stehen im Commit („Fund geprüft, keine Änderung nötig“), zählen nicht als Runde und kommen nicht erneut als schwer. (SIN-381)
- Kennzahl-Zähler größer als Nenner (2121 von 1852 Fragen bewertet) → append-only Evaluierungen können auf gelöschte Fragen verweisen; Zähler auf aktuell existierende Fragen filtern (Join in JS, nicht SQL). (SIN-394)
- Verworfene Fragen (letzte Bewertung nicht bestanden) erschienen im Lernpfad, weil die Auslieferung die Bewertungen nie las → vor jeder neuen Lieferstelle `dropDiscardedQuestions` (`src/lib/learner/discarded.ts`) auf die Einheiten anwenden. (SIN-395)
- Schreibaufruf an Supabase mit `fetchJson` und `Prefer: return=minimal` → PostgREST antwortet mit leerem Body (201), `fetchJson` wertet das als Fehlerseite und wiederholt 3-mal ohne Grund. Richtig: `return=representation` (liefert JSON) oder eigenes `fetch`. (SIN-303)
- Test-Kennung im Live-Check `livecheck-<Zeit>` ist keine gültige UUID, Production lehnt sie ab → Test-Kennungen müssen zum Spaltentyp passen (hier: gültige UUID `LIVECHECK_ANON_ID`), Route validiert und lehnt ungültige UUIDs mit 400 ab. (SIN-396)
- Live-Check „76/77 ROT“ ohne Angabe, welche Prüfung rot ist (Kennung nur im Artefakt) → `buildReport` hängt die roten Kennungen (höchstens 5, „+N weitere“) an die Zusammenfassung; `NOTE_RE` liest sie für den Loop-Status. (SIN-391)
- Kennzahl „Fabrik: noch kein Lauf im Statusprotokoll“, obwohl der Job rot lief → Frühabbrüche (`process.exit`) und der `main().catch` schreiben ebenfalls eine Zeile in `content_factory_runs` (`abortRun`, Grund in `stop_reason`); nach 8 Tagen ohne Lauf meldet der Bericht „überfällig“ über die Regel `fabrik-haengt`. (SIN-378)
- `git add a b c` mit fehlendem Pfad plus `2>/dev/null || true` → bricht komplett ab, Lauf-PR bleibt still aus (run-task, SIN-397). Richtig: nur vorhandene Pfade stagen (`run-task.mjs --stage`), bei „keine Änderungen“ den Grund in den Lauf-Bericht schreiben.
- Cache-Treffer pauschal mit 0,1× des Eingabepreises gerechnet → bei Sonnet 5.5 (und Opus 5.5) gilt 0,05×; Preise und Faktoren je Modell aus der Preisseite lesen (`CLAUDE_BATCH_PRICES.cacheReadFactor`). (SIN-398)
- Content-Abschnitt und Kennzahlen-Bericht melden unterschiedliche Zahlen bewerteter Fragen (0 vs. 2121) → beide Stellen nutzen unterschiedliche Datenquellen. Richtig: gemeinsame gefilterte Datenquelle; `collectMetrics` und `collectContentMetrics` nutzen beide `ratedQuestions` zum Filtern auf existierende Fragen. (SIN-402)
- Kennzahl-Bericht nennt bei leeren PostHog-Daten pauschal drei mögliche Ursachen → Zusatzabfrage „irgendein Ereignis in 7 Tagen“: vorhanden = keine Lernweg-Nutzung, nicht vorhanden = Key fehlt oder keine Einwilligung; Zusatzabfragen einzeln fangen. (SIN-407)
- Markdown-Tabellenzelle escapt nur `|` → CodeQL `js/incomplete-sanitization` blockt den PR. Richtig: zuerst Backslash verdoppeln, dann `|` escapen (`cell` in `safety-sample.ts`). (SIN-404)
- Dispatcher wartete 1 h auf Cursor, obwohl es kein Cursor-Kontingent mehr gibt → Wartezeit nur mit `CURSOR_GRACE_MIN`, Standard 0. (SIN-420)
- Reparatur-Lauf endet ohne Commit → `ci` startet nicht neu, `repair` auch nicht, PR bleibt still liegen. Richtig: `repair.yml` startet `ci` per `gh run rerun` neu, wenn der Head-SHA gleich blieb; der Wächter stößt rote PRs ohne Commit seit 30 Min selbst an (`stalledRepairs`). (SIN-418)
- Kosten je Einheit der Fabrik enthielten die Reparaturkosten, die die Planung zusätzlich als `spent` abzieht → zu wenige Einheiten je Lauf geplant (125 statt ca. 340). Richtig: `unitCostHistory` zieht `repair.costEur` ab, bevor `eurPerUnit` rechnet. (SIN-434)
- Neuer Schritt im Onboarding (/beruf) nur in `e2e/` nachgezogen → Live-Check UI-04 nach dem Deploy rot. Richtig: Ändert sich ein Nutzerweg, im selben PR auch `live/live.spec.ts` und `docs/ops/live-checkliste.md` anpassen. (SIN-414)
- Tabellen-Escape nur in einem Skript gefixt → derselbe CodeQL-Fund blieb im Renderer; `<!--` mit einem Durchlauf entfernt → verschachtelte Reste bleiben. Richtig: gemeinsame Helfer `scripts/autonomy/sanitize.mjs` (`escTableCell`, `stripComments` bis stabil) in allen Generatoren nutzen. (SIN-435)
- Preise aus dem Gedächtnis oder aus Drittseiten → nie. Fehlt der Zugriff auf die offizielle Preisseite, „ungeprüft“ schreiben und die Seite im nächsten Lauf mit Web-Zugriff lesen; Spalten-Zuordnung (z. B. Batch-Reiter) als Annahme kennzeichnen. (SIN-399)
- Gate-Bruch-Erkennung hielt `merge-gate` rot wegen „risk:high wartet auf freigegeben“ für einen Bruch (las nur „exit code 1“) → zwei PRs bekamen `gate-bruch`, Reparatur gesperrt. Richtig: spezifische Fehlerzeile lesen (`pickFailureLine`) und Warten auf Freigabe nie als Bruch zählen (`WAITING_RE`). (SIN-439)
- Fehlgeschlagener Lauf zeigt nur „Process completed with exit code 1“, Logs und Artefakt nicht lesbar → Ursache unbekannt. Richtig: Skripte schreiben die letzte Fehlerzeile (Schlüssel geschwärzt) als `::error`-Anmerkung, die über die Check-API lesbar ist (`lastErrorLine` in `run-task.mjs`). (SIN-440)
- Wächter meldet „Migrationen n−1/n“, Secrets und Sicherung sind in Ordnung → die Datei enthält `drop constraint`/`drop`/`rename`, `isAdditive` lässt sie absichtlich liegen. Richtig: nie umschreiben oder selbst anwenden, Sinan-Aufgabe anlegen; neue Migrationen, wo möglich, ohne `drop` formulieren. (SIN-441)
- Additive Migration, die eine Tabelle aus einer liegengebliebenen nicht additiven Migration voraussetzt → `migrate` scheitert an ihr, der Wächter zeigt weiter n−2. Richtig: Abhängigkeit im Entscheidungstext nennen; erst Sinan die blockierte Migration ausführen lassen, dann `migrate` neu starten. (SIN-443)
- Tagesdeckel zählte Läufe, die nach Sekunden an einer API-Ablehnung scheiterten (0 € verbraucht) → Tag gesperrt, kein Neustart nach Behebung. Richtig: Fehlschläge unter 3 Minuten zählen nicht, ab dem dritten am Tag doch (`dailyLimitReached`). (SIN-444)
- Ein Fehler bei einem Modell (mehrzeiliges OpenAI-JSON) brach den ganzen Vergleich nach 8 Min. ab, bezahlte Ergebnisse weg, Anmerkung zeigte nur `"error": {`. Richtig: API-Fehler mit `compactApiError` einzeilig machen; Fehler je Kandidat abfangen und im Bericht unter `failed` führen. (SIN-445)
- Anthropic-Ausgabenlimit (HTTP 400 „API usage limits“) ließ die Content-Fabrik rot enden und löste Reparatur und „hängt“ aus → Limit ist kein Qualitätsfehler. Richtig: `isApiLimitError` erkennt es, der Lauf endet mit Exit 0 und Status „pausiert: API-Limit am <Datum>“; kein Merker, der nächste Lauf startet normal. (SIN-450)

## Datenbank-Rechte

- Neue Tabelle mit Personenbezug bekommt von Supabase TRUNCATE, TRIGGER, REFERENCES für `authenticated` (RLS gilt dafür nicht) → in der Migration `revoke truncate, trigger, references … from anon, authenticated` setzen, Lese-Rechte nur für RLS-Policies lassen, `scripts/verify-table-grants.sql` ergänzen. (SIN-438)
