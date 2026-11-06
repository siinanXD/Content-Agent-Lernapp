# Umgebungen: dev, staging, production (SIN-1593)

Entscheidung und Optionen: `docs/decisions/SIN-1593-umgebungen.md`. Diese Datei beschreibt den Zielzustand. **Stand 06.11.2026:** Nur das Supabase-Projekt für Staging existiert (leer). Der Branch `staging`, die Workflows und die Secrets entstehen in SIN-1599 bis SIN-1607; bis dahin gilt für Code weiter nur der Weg nach `main` (AGENTS.md). Mit jedem Folge-Issue wird diese Datei angeglichen (SIN-1607 gleicht ab und probt das Rücksetzen).

## Die drei Umgebungen

| | dev | staging | production |
| --- | --- | --- | --- |
| Zweck | schnell bauen, ohne PR-Regeln | alles zusammengeführt testen | echte Nutzer |
| Git-Branch | Feature-Branch `claude/<kurzname>` (lokal) | `staging` (langlebig) | `main` |
| Datenbank | lokale Supabase in Docker (`supabase start`) | Supabase `Content-Agent-Lernapp-Staging`, Ref `pxoqubnwjegshkxirphm`, `eu-central-1` (Frankfurt) | bestehendes Supabase-Projekt `zxielkiwgcgxyudqemjb`, `eu-west-1` |
| Vercel | `npm run dev` (Port 43123) | Preview-Umgebung, zeigt auf die Staging-Datenbank | Production, Deploy per `production-deploy.yml` nach grünem `ci` auf `main` |
| Daten | Testdaten oder von Staging gezogen | veröffentlichter Kursinhalt nach Allowlist, nie Personendaten | echte Daten inkl. Lernfortschritt |
| Kosten | 0 € | 0 € (Free-Plan) | wie bisher |

Grenzen von Staging (Free-Plan): 500 MB Datenbank, Pausierung nach 7 Tagen mit zu wenig Aktivität (wiederherstellbar bis 90 Tage), keine herunterladbaren Backups. Darum ist Staging nie die einzige Kopie von etwas.

## Secrets (nur Namen)

Production behält `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (`docs/ENV.md`) und `SUPABASE_PROJECT_REF` (`migrate.yml`). Für Staging kommen vier Namen dazu, Infisical-Pfad `/lernapp-staging`, eingetragen von Sinan (SIN-1602):

| Name | Verwendung |
| --- | --- |
| `SUPABASE_URL_STAGING` | Projekt-URL von Staging |
| `SUPABASE_ANON_KEY_STAGING` | Browser-sicherer Schlüssel (RLS bleibt aktiv) |
| `SUPABASE_SERVICE_ROLE_KEY_STAGING` | nur Server und Workflows, nie `NEXT_PUBLIC_*` |
| `SUPABASE_PROJECT_REF_STAGING` | Migrationen und CLI |

Die Werte stehen nie im Repo, nie im PR, nie im Chat. Die Vorschau bekommt die Staging-Werte unter den Namen der App (`SUPABASE_URL` usw.) nur in der Vercel-Preview-Umgebung.

## Wer darf was

| Wer | dev | staging | production |
| --- | --- | --- | --- |
| Agent (Worker) | alles lokal | Feature-PR nach `staging` öffnen; Auto-Merge nach grüner leichter Prüfung | nichts direkt; kein Push auf `main` |
| Release-Schritt | | Release-PR `staging` → `main` öffnen | wird gemergt, wenn die Pflicht-Checks grün sind |
| Sinan | alles | Branch-Schutz, Secrets, Freigabe `freigegeben` bei `risk:high` | Branch-Schutz, Freigabe bei `risk:high`, Zugangsdaten, Abrechnung |
| Nie (für Agenten) | Zugangsdaten, Abrechnung, Datenbank-Löschungen anfassen | Personendaten einspielen | Datenbank-Löschungen; Migrationen vor Staging |

## Branch-Fluss

1. **Feature-Branch:** Aus `staging` abzweigen, `claude/<kurzname>`. Ein Linear-Issue, ein Branch, ein PR.
2. **Vor dem Push:** `git fetch origin staging && git merge origin/staging`, dann `npm ci` und `npm run check:fast`.
3. **PR nach `staging`:** Titel wie heute, Conventional Commit mit Kennung. Leichte Prüfung: Lint, Typecheck, Unit-Tests, `pr-title`. Bei Erfolg Auto-Merge (Squash) nach `staging`.
4. **Staging-Deploy und Migration:** Nach dem Merge deployt Vercel `staging` in die Preview-Umgebung. Neue Migrationen unter `supabase/migrations/` laufen zuerst auf Staging (`pxoqubnwjegshkxirphm`). Scheitert die Migration, geht es nicht weiter (siehe „Rücksetzen“).
5. **Gesamtlauf auf `staging`:** Pflicht-Checks `build`, `pr-title`, `merge-gate` und die Belegprüfung laufen am Stand von `staging`.
6. **Release-PR `staging` → `main`:** Wird nur bei grünem Gesamtlauf geöffnet und mit Merge-Commit (nicht Squash) gemergt, damit beide Branches gleich bleiben. Risiko-Label und Freigabe gelten wie in AGENTS.md.
7. **Production:** Nach dem Merge wendet `migrate.yml` die Migrationen auf Production an (vorher Sicherung, SIN-293), dann deployt `production-deploy.yml` mit Smoke-Test.

## Rücksetzen

### Migration auf Staging fehlgeschlagen

1. Die Migration läuft je Datei in einer Transaktion (`migrate`-Aufgabe). Eine fehlgeschlagene Datei hinterlässt keinen halben Stand; der Lauf wird rot und nichts geht nach `main`.
2. Ursache im Lauf-Log lesen und die Migration im selben PR korrigieren. Bereits auf Staging angewendete Migrationsdateien werden nie geändert; die Korrektur ist eine neue, additive Datei.
3. Nicht reparierbar: Staging neu füllen (nächster Abschnitt). Production ist nicht betroffen, weil Migrationen dort erst nach Staging laufen.

### Release zurücknehmen

1. Fehler nach dem Release auf `main`: `revert-guard` öffnet automatisch einen Revert-PR gegen `main` (SIN-252), `production-deploy.yml` tut dasselbe bei rotem Smoke-Test.
2. Danach denselben Revert als PR gegen `staging` öffnen, damit beide Branches gleich bleiben.
3. Migrationen werden nie zurückgedreht. Wirkt eine Migration schädlich, kommt eine neue additive Migration; destruktive Schritte sind `risk:high` und brauchen Sinans Freigabe.
4. Datenverlust auf Production: Wiederherstellen nach `docs/ops/BACKUP.md` (erst Probe-Ziel, dann Production mit `--allow-production`).

### Staging neu füllen

1. Staging ist wegwerfbar. Bei kaputtem Schema oder Pausierung: Projekt im Dashboard wiederherstellen (bis 90 Tage) oder Tabellen leeren und alle Migrationen aus `supabase/migrations/` neu anwenden.
2. Danach veröffentlichten Kursinhalt nach fester Allowlist einspielen (SIN-1604): nie Personendaten, Abbruch bei mehr als 400 MB.
3. Prüfen mit `node scripts/verify-supabase-schema.mjs` gegen die Staging-Schlüssel.
4. Staging-Zugriff nie mit Production-Schlüsseln mischen: Zeigt ein Befüll- oder Restore-Lauf auf Production, bricht er ab.
