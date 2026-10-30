# Autonomie (SIN-223)

**Stand (SIN-1122):** Der alte Loop (Dispatcher, Planer, Worker, Repair, Prüfer-Workflows, Wächter, Tages-Update, Notbremse `loop-pause`) ist entfernt. Arbeit startet im T3-Chat nach `AGENTS.md`; Planer, Starter und Wächter laufen in Leitstand 2.0. Maßgeblich sind die Dateien in `.github/workflows/`. Hier bleibt, was noch gilt: Erreichbarkeit der App, Token-Ablauf, Aufgaben für Sinan.

## SIN-294: Erreichbarkeit der App, Token-Ablauf

**Erreichbarkeit der App.** `GET https://content-agent-ashen-nu.vercel.app/api/health` antwortet `200` mit `"ok": true, "db": "ok"`, wenn die Datenbank (Supabase, eine Lesezeile aus `courses`, Zeitlimit 4 s) antwortet, sonst `503` mit `"db": "unreachable"`. Einmalig von Sinan bei [cron-job.org](https://cron-job.org):

1. Neuer Cronjob: URL `https://content-agent-ashen-nu.vercel.app/api/health`, Methode GET, Takt alle 5 Minuten, Zeitlimit 30 s.
2. Als Erfolg gilt HTTP 2xx (Standard).
3. Benachrichtigungen einschalten: „bei Fehlschlag“ (und „bei Wiederherstellung“) per E-Mail an Sinans Adresse, Schwelle 1 Fehler.

Die Route liefert nur Dienstname, Speicher-Art und DB-Zustand, keine Geheimnisse und keine Personendaten.

**Token-Ablauf.** `docs/autonomy/tokens.md` listet alle Tokens mit Ablaufdatum (Name, Ort, Ablauf, Rechte, nie Werte). Bekannt: `cron-takt` und Figma `agents-read` laufen am 03.01.2027 ab. Bei `unbekannt` trägt Sinan das Datum nach; ein erneuerter Token bekommt sein neues Datum in der Tabelle. Entscheidung: `docs/decisions/SIN-294-notbremse-erreichbarkeit-token.md`.

---

## SIN-310: Aufgaben für Sinan als Linear-Issues

Alles, was nur Sinan tun kann, steht als Linear-Issue mit Label `sinan` (kein `claude`), nicht im PR-Text. Beschreibung im festen Block `wo`, `link`, `minuten`, `schritte`, `pruefung`. Neu anlegen: `node scripts/autonomy/sinan.mjs create --titel … --wo … --link … --minuten 10 --schritt "…" --pruefung … [--faellig 2026-12-20]` (braucht `LINEAR_API_KEY`). `sync` trägt die Standard-Aufgaben nach (Erreichbarkeits-Job, Wiederherstellungs-Test, Sicherheits-Stichprobe, AV-Verträge, Impressum, Datenschutztext, Pro-Tarife, Token-Erneuerung) und schließt erledigte;. Der Loop erkennt „erledigt“ nur dort, wo er es lesen kann: abgehakte Punkte in `docs/legal/checkliste-demo-zugang.md`, neue Ablaufdaten in `docs/autonomy/tokens.md`, entfernter Hinweis in `docs/ops/BACKUP.md`. Alles andere (cron-job.org, Abrechnung, Stichprobe) schließt Sinan selbst. Entscheidung: `docs/decisions/SIN-310-sinan-issues.md`.
