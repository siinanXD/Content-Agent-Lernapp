# SIN-303 — Leitstand 1/3: Ereignisse und Tokens aus der Pipeline nach Supabase

**Links:** SIN-242 (Leitstand), SIN-202 (Projekt-Starter), `scripts/autonomy/leitstand.mjs`, `supabase/migrations/20261011010000_sin303_leitstand.sql`, [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgREST: Prefer-Header](https://docs.postgrest.org/en/stable/references/api/preferences.html), [Claude Code: Ausgabeformat mit `total_cost_usd` und `usage`](https://code.claude.com/docs/en/headless)

## Entscheidung

1. **Tabellen** (nur neue, additiv): `loop_events` (Projekt, Schritt, Issue, PR, Status `start|ok|fehler|uebersprungen`, Lauf-ID und -Link, Dauer, Tokens Ein/Aus/Cache, `cost_usd`), `loop_snapshot` (eine Zeile je Projekt: Kontingente, Schlange, offene PRs) und `leitstand_nutzer` (wer lesen darf).
2. **RLS**: an, Lesen nur für angemeldete Nutzer, die in `leitstand_nutzer` stehen; keine Policy für `anon`. Schreiben nur mit der Service-Role (umgeht RLS). Keine Personendaten, keine Prompts: nur Kennungen, PR-Nummern, PR-Titel, Zahlen.
3. **Ein Skript für alle Repos**: `leitstand.mjs ereignis --schritt … --status …`. Projekt = `GITHUB_REPOSITORY` ohne Besitzer (oder `LEITSTAND_PROJEKT`), keine Repo-Namen im Code. Der Projekt-Starter (SIN-202) kopiert Skript, Migration und die Workflow-Schritte.
4. **Verdrahtung**: `dispatch`, `worker`, `pr-gate`, `planner`, `digest`, `status` schreiben je einen Start- und einen Ende-Schritt (`if: always()`, `continue-on-error`). Ende: `ok` bei grünem Job (Worker: wenn ein PR existiert), sonst `fehler`; Dauer aus einer Startzeit in `GITHUB_ENV`. Dry-Runs schreiben nichts. `status.yml` schreibt zusätzlich den Schnappschuss (Kontingente aus `buildQuotaRows`, Schlange und offene PRs aus `analyze`).
5. **Tokens und Kosten** nur beim Worker: aus den Execution-Dateien beider Versuche (`usage`, `total_cost_usd`, `duration_ms` des Ergebnis-Eintrags, wie schon `sparen.mjs`), summiert. `total_cost_usd` ist der API-Gegenwert, keine Abrechnung (Abo-Lauf).
6. **Nie ein Fehlerabbruch**: ohne Secrets oder bei Netzfehler steht nur eine Warnung im Log.

## Annahmen

- Das Format von `usage`/`total_cost_usd` ist das der Execution-Datei von `claude-code-action@v1`; `usageFromExecution` liest es seit SIN-320 und fällt bei fehlenden Feldern auf 0/leer. Die Online-Docs waren in diesem Lauf nicht abrufbar, die Felder sind nicht neu geprüft: **nicht verfügbar**.
- Es gibt keine Leitstand-Oberfläche in diesem Paket (Teil 2 und 3 von SIN-242). Einträge in `leitstand_nutzer` setzt Sinan später von Hand oder per Skript; bis dahin liest niemand außer der Service-Role.
- Ein Beleg „ein Tag Betrieb“ ist nicht in diesem Lauf möglich: **nicht verfügbar**. Er entsteht nach dem Merge und dem automatischen `migrate` (SIN-374). Bis die Migration angewendet ist, schreiben die Schritte nur Warnungen („Tabelle fehlt“) und kippen keinen Lauf.
- `pr-gate` liest das Skript aus der Basis des PRs (nie PR-Code). Im PR, der das Skript einführt, entfällt der Schritt dort einmal; ab dem nächsten PR läuft er. Die Änderung an `pr-gate.yml` macht diesen PR `risk:high` (Gate selbst): Sinan gibt ihn frei.
- Schreibaufrufe nutzen `Prefer: return=representation`, weil `fetchJson` bei leerem Body (`return=minimal`) 3-mal grundlos wiederholt.
- Die vorhandenen Secrets `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` reichen; es gibt keine neuen Secrets, Dienste oder Kosten.

## Warum

Der Leitstand (SIN-242) braucht Rohdaten, die auch nach Wochen noch lesbar sind. Supabase ist schon da (EU), ein eigenes Skript hat weniger Abhängigkeiten als ein weiterer Dienst, und dieselbe Tabelle trägt später alle Projekte.
