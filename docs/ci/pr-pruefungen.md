# PR-Prüfungen: Auslöser, Dauer, Entscheidung (SIN-1140)

Teil 1 von SIN-1120. Nur Messung und Doku, kein Workflow wurde geändert. Teil 2 entscheidet auf dieser Grundlage.

## Messung

- Datum: 2026-10-27 (UTC).
- Befehl je Workflow (10 jüngste Läufe, alle Ereignisse):
  `gh run list --workflow <name>.yml --limit 10 --json databaseId,conclusion,createdAt,updatedAt,event`
- Dauer = `updatedAt` minus `createdAt` des Laufs, Median über die 10 Läufe. Sie enthält Wartezeit in der Warteschlange.
- Pflicht-Checks auf `main` (Branch-Protection, `strict: false`): `build`, `merge-gate`, `pr-title`. Nur diese bremsen den Auto-Merge.
- Stand der `ci` ist nach SIN-1119 (PR #655, Playwright und Lighthouse parallel). Der Wert „`build` ca. 8 Min.“ aus
  PR #652 gilt für die Zeit davor.

## Tabelle

| Workflow | Auslöser (Pfadfilter) | Median-Dauer (10 Läufe) | Entscheidung |
|---|---|---|---|
| `ci` auf PR | `pull_request`, kein Pfadfilter | 309 s (5 PR-Läufe; alle 10: 333 s) | behalten: enthält den Pflicht-Check `build`, bestimmt die Wartezeit |
| `pr-gate` | `pull_request`, `workflow_run` (nach `ci`), alle 10 Min. (`schedule`), kein Pfadfilter | 10,5 s (alle 10 Läufe); PR-Läufe 160 s | behalten: setzt Risiko-Label und Auto-Merge, Pflicht-Checks `merge-gate`, `pr-title`; Rechenzeit der Jobs nur ca. 22 s |
| `codeql` | `pull_request`, `push` auf `main`, montags 04:17, kein Pfadfilter | 183 s (PR-Läufe 94 s, `main` 270 s) | nur bei Bedarf prüfen: kein Pflicht-Check, läuft parallel zu `ci` und ist mit 94 s schneller, spart nur Rechenminuten |
| `sichtpruefung` | `pull_request`, Pfadfilter ja (`src/app/**`, `src/components/**`) | 121,5 s (alle 10 Läufe vom 16. bis 21.10.; 2 davon ca. 1500 s) | behalten: Pfadfilter greift schon |
| `pr-crawler` | `pull_request`, Pfadfilter ja (`src/app/**`, `src/components/**`, `public/**`, `**/*.css`), außerdem `deployment_status`, `workflow_dispatch` | nicht messbar: 0 Läufe (`total_count` 0) | behalten: Pfadfilter greift schon |
| `visual` | `pull_request`, kein Pfadfilter im Workflow, aber `scripts/autonomy/visual-scope.mjs` beendet den Job früh | 11,5 s | behalten: bei Content-PRs sofort grün, kein Gewinn durch Umbau |
| `goldset` | `pull_request`, kein Pfadfilter, Schritt „Betroffen?“ beendet den Job früh | 10 s | behalten: bei Content-PRs sofort grün, Pflicht-Check werden möglich |
| `ci` auf `main` nach Merge | `push` auf `main` | 675 s (5 `main`-Läufe, Spanne 293 bis 816 s) | siehe nächster Abschnitt |

Zur Einordnung der Zeiten:

- `pr-gate`: Die PR-Läufe zeigen 28 bis 325 s, weil `regate` den Lauf nach Ende von `ci` neu startet und `updatedAt` mitwandert.
  Die Jobs selbst brauchen zusammen ca. 22 s (Lauf 40581637512: `pr-title` 3 s, `gate` 13 s, `merge-gate` 6 s).
- Kritischer Pfad eines Content-PRs ist `ci`: Lauf 40581605540 hatte `pruefen` 66 s, `bauen` 50 s, `perf` 143/151 s, `e2e` 196 s, Gesamt 260 s.
  `codeql` (91 s im selben PR) läuft daneben und verlängert die Wartezeit nicht. Die Annahme aus dem Auftrag „Zeit kommt aus `build` und `codeql`“
  stimmt damit nur für `build`.
- `sichtpruefung`: Die 10 Läufe sind alt, weil seit dem 21.10. kein PR mehr `src/app/**` oder `src/components/**` geändert hat.
  Der Median beschreibt UI-PRs, nicht Content-PRs.

## `ci` auf `main` nach Merge

- Median 675 s (5 Läufe, 293 bis 816 s). Der Ausreißer-Lauf 40564230698 hatte `perf (2/2)` mit 720 s statt ca. 150 s.
- Hat der Lauf einen Zweck? Ja. Die Branch-Protection hat `strict: false`: Ein PR muss nicht auf dem neuesten `main` stehen. Der Squash-Commit kann daher
  etwas enthalten, das im PR so nie grün war (zwei PRs kurz hintereinander). Der Lauf ist die einzige Erkennung für ein rotes `main`:
  `revert-guard` (SIN-252) ist abgeschaltet (`disabled_manually`, laut `AGENTS.md`), ein rotes `main` wird im Chat und im Issue gemeldet.
- Bei einem reinen Content-Squash (nur `docs/ops/content-runs/`) ist der Squash-Inhalt im PR schon grün und kann `main` nicht rot machen.
- Empfehlung für Teil 2: `ci` auf `main` behalten. Prüfen, ob Content-Squashes übersprungen werden können. Achtung: `post-merge.yml` startet
  nach einem Auto-Merge durch `github-actions[bot]` die Workflows per `workflow_dispatch` (laut Kommentar in `ci.yml` und `post-merge.yml`).
  Ein `paths-ignore` auf `push` allein würde dann nichts sparen; der Pfadfilter müsste in `post-merge` oder als Schritt in `ci` sitzen.

## Beleg: `chore(content)`-PRs lösen `sichtpruefung` und `pr-crawler` nicht aus

PR [siinanXD/Content-Agent-Lernapp#652](https://github.com/siinanXD/Content-Agent-Lernapp/pull/652)
(`chore(content): Content-Lauf 20261027-1250 (SIN-220)`) ändert genau eine Datei: `docs/ops/content-runs/2026-10-27T12-50-16-681Z.json`.
Abgerufen mit `gh pr checks 652` und `gh pr view 652 --json statusCheckRollup`. Beteiligte Workflows:
`ci`, `codeql`, `goldset`, `pr-gate`, `visual`. Check-Liste:

| Check | Ergebnis | Dauer |
|---|---|---|
| `build` | pass | 8 min 6 s (vor SIN-1119) |
| `analyze` (codeql) | pass | 1 min 36 s |
| `bildvergleich` (visual) | pass | 7 s |
| `goldset` | pass | 6 s |
| `gate` (pr-gate) | pass | 8 s |
| `merge-gate` | pass | 7 s |
| `pr-title` | pass | 2 s |
| `einspruch-ende`, `regate`, `Supabase Preview` | skipping | 0 s |

`sichtpruefung` und `pr-crawler` fehlen, wie es die Pfadfilter vorsehen.

## Ausgangswert für Teil 2: PR geöffnet bis merge-fähig

- Median **8,3 Minuten** über die 10 jüngsten gemergten PRs (#651, #652, #653, #655, #656, #658 bis #662).
- Einzelwerte in Minuten: 4,6 / 5,4 / 5,3 / 6,2 / 12,7 / 9,0 / 14,3 / 8,3 / 8,4 / 8,6 (in der Reihenfolge #662 bis #651).
- Befehl: `gh pr list --state merged --limit 10 --json number,createdAt,mergedAt`, Dauer = `mergedAt` minus `createdAt`.
- Näherung: „merge-fähig“ ist hier der Merge-Zeitpunkt. Der Auto-Merge feuert direkt nach dem letzten grünen Pflicht-Check, der Fehler liegt unter einer Minute.
- Der Wert mischt 8 Content-PRs, einen `ci`-PR (#655, 14,3 min) und einen `feat`-PR (#660). Von den 10 liefen #651 bis #653 noch mit der alten `ci`.

## Nicht erfasst

- Weitere Workflows, die bei einem PR laufen, standen nicht im Auftrag und sind nicht gemessen (z. B. `review`).
- Die Messung beruht auf den 10 letzten Läufen. Sie schwankt mit Last und Warteschlange (siehe Ausreißer oben).

## Umsetzung (SIN-1141, Teil 2 von SIN-1120)

| Workflow | Änderung | Begründung |
|---|---|---|
| `codeql` auf PR | `paths-ignore: docs/ops/content-runs/**` | Ein PR, der nur Lauf-Berichte ändert, hat keinen Code zu prüfen. Kein Pflicht-Check, der Montagslauf bleibt. |
| `codeql` auf `main` (`push`) | gleicher `paths-ignore` | Gleicher Grund. |
| `ci` auf `main` (`push`) | gleicher `paths-ignore` | Ein reiner Content-Squash war im PR schon grün und kann `main` nicht rot machen. Gemischte Squashes laufen weiter. |
| `ci` auf PR | unverändert | Enthält die Pflicht-Checks `build`; nicht anfassen. |

- Alle Content-Squashes kamen bisher als `push` (nicht `workflow_dispatch`), daher greift der Pfadfilter direkt; `post-merge.yml` bleibt unverändert.
- Grenze: Merged `github-actions[bot]` einen Content-PR, startet `post-merge` `ci` und `codeql` per `workflow_dispatch`, und die ignoriert der Pfadfilter nicht. Das ist in den letzten 12 `main`-Läufen nie vorgekommen. Tritt es auf, ist `post-merge` anzupassen.
- Median „PR geöffnet bis merge-fähig“: vorher 8,3 min (Teil 1, 10 PRs, davor ohne SIN-1119). Vor dieser Änderung, nach SIN-1119, über die 10 jüngsten Content-PRs (#666 bis #675): 5,1 min. Diese Änderung ändert den PR-Pfad von Content-PRs nicht (`codeql` lief schon parallel zu `ci`); sie spart Rechenminuten (ca. 12 `ci`-Läufe à 11 min und 12 `codeql`-Läufe à 4,5 min auf `main` pro Tag).

## Secrets in PR-Läufen (SIN-1180, 28.10.2026)

Nur `goldset` führt PR-Code mit Schlüsseln aus (Richter OpenAI, Langfuse, Supabase Service-Role). Seit SIN-1180 prüft der Job `betroffen` ohne Secrets, ob der PR Prompts, Richter oder Goldset ändert; nur dann läuft `goldset` – und erst nach Freigabe in der GitHub-Umgebung `goldset` (Required reviewer: Sinan). `pr-gate`, `pr-crawler` und `sichtpruefung` haben Secrets, führen aber nur Code aus `main` aus (Checkout der Basis); der PR-Stand wird dort nur gelesen.

## Beleg und Nachher-Wert (SIN-1120, 30.10.2026)

Abgerufen mit `gh pr checks 683`, `gh run list --workflow ci.yml|codeql.yml --branch main` und `gh pr list --state merged`.

- Echter Content-PR nach SIN-1141: [#683](https://github.com/siinanXD/Content-Agent-Lernapp/pull/683) (`chore(content)`, nur `docs/ops/content-runs/`).
  Seine Check-Liste hat weder `analyze` (codeql) noch `sichtpruefung` noch `pr-crawler`; `bildvergleich` (visual) und `goldset` brauchen 6 s und 5 s.
- Der Squash-Commit `088cff1` auf `main` hat keinen `ci`- und keinen `codeql`-Lauf (beide Workflows: 0 Läufe für diese SHA). `paths-ignore` greift also auf `push`, nicht nur im Test.
- Seit SIN-1179 (PR #681) legt die Content-Fabrik keine Leerlauf-PRs mehr an; nach #679 gab es deshalb nur diesen einen Content-PR.
  Die „nachher“-Stichprobe für Content-PRs ist damit klein (n = 1).

| Median „PR geöffnet bis merge-fähig“ | Wert | Stichprobe |
|---|---|---|
| Vorher (Teil 1, vor SIN-1119) | 8,3 min | 10 PRs #651 bis #662 |
| Nach SIN-1119, vor SIN-1141 | 5,1 min | 10 Content-PRs #666 bis #675 |
| Nachher (nach SIN-1141) | 5,1 min | Content-PR #683 |
| Nachher, alle PR-Arten | 6,1 min | 9 PRs #680 bis #688; Ausreißer #682 16,9 min (Gate-Umbau), #687 wartete auf Review |

`ci` auf `main`: Median 288 s über die 8 jüngsten `push`-Läufe (Spanne 256 bis 314 s), vorher 675 s mit einem Ausreißer von 816 s. Der Lauf bleibt, weil er das einzige Signal für ein rotes `main` ist (`strict: false`).
