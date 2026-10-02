# Umgebungsvariablen — Prüfung 2026-10-02

Keine Werte in diesem Dokument. Nur Namen, Orte und Status.

Quellen: `AGENTS.md`, `.env.example` (AP-01), `docs/ops/railway.env.example` (AP-10), Vercel-Projekt `content-agent`, Cloud-Agent-Secrets (`CLOUD_AGENT_INJECTED_SECRET_NAMES`). Offizielle Docs: [Langfuse Data Regions](https://langfuse.com/security/data-regions.md) (EU = Ireland, AWS `eu-west-1`; US-Host ist ein anderer Hostname); [Anthropic Authentication](https://platform.claude.com/docs/en/manage-claude/authentication) (`anthropic-workspace-id` / `ANTHROPIC_WORKSPACE_ID`).

## Kurzantwort

**Nein — nicht alle Variablen sind vollständig.** Die Kern-Secrets für App, Daten, Tracing und Modelle sind im Cloud-Agent und auf Vercel gesetzt und live erreichbar. Es fehlen Hermes/Telegram, die Anthropic-Workspace-ID und die `NEXT_PUBLIC_SUPABASE_*`-Aliase. GitHub Actions Secrets sind mit dem Agent-Token nicht lesbar.

## Entscheidung D-25

- **Links:** Langfuse-Regionen (oben); Anthropic Workspaces (oben); Vercel Env-API (Projekt `content-agent`).
- **Entscheidung:** Cloud-Agent- und Vercel-Namen bleiben `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (so injiziert). Zusätzlich `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` als Aliase dokumentieren. `LANGFUSE_BASE_URL` bleibt der offizielle EU-Host aus den Data-Regions-Docs (Ireland). Fehlende Ops-Secrets (`TELEGRAM_*`, `HERMES_APP_BASE_URL`, `ANTHROPIC_WORKSPACE_ID`) nicht erfinden.
- **Warum:** Weniger Umbenennung an bestehenden Secrets; Next.js braucht `NEXT_PUBLIC_` im Client; Anthropic-Key ist gesetzt, aber ohne Workspace-Scope unbezahlbar für Live-Calls.

## Cloud Agent (diese Umgebung)

Injizierte Secret-Namen:

| Name | Status | Live-Check (ohne Wert) |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | gesetzt | Prefix `sk-ant`; `GET /v1/models` → 400, Key nicht workspace-scoped |
| `ANTHROPIC_WORKSPACE_ID` | **fehlt** | Header `anthropic-workspace-id` nötig ([Docs](https://platform.claude.com/docs/en/manage-claude/authentication)) |
| `OPENAI_API_KEY` | gesetzt | Prefix `sk-`; `GET /v1/models` → 200 |
| `LANGFUSE_PUBLIC_KEY` | gesetzt | Prefix `pk-lf`; Projekt `Content AGent` auf EU-Host → 200 |
| `LANGFUSE_SECRET_KEY` | gesetzt | Prefix `sk-lf` |
| `LANGFUSE_BASE_URL` | gesetzt | offizieller EU-Host (Ireland); US-Host lehnt dieselben Keys mit 401 ab |
| `SUPABASE_URL` | gesetzt | Host `*.supabase.co`; Auth-Health → 200 |
| `SUPABASE_ANON_KEY` | gesetzt | JWT-Form; Auth-Health mit Anon → 200 |
| `SUPABASE_SERVICE_ROLE_KEY` | gesetzt | JWT-Form; `/rest/v1/` → 200 |
| `RAILWAY_API_TOKEN` | gesetzt | UUID-Form; allein nicht genug für Hermes |
| `TELEGRAM_BOT_TOKEN` | **fehlt** | blockiert AP-10 Live |
| `TELEGRAM_CHAT_ID` | **fehlt** | blockiert AP-10 Live |
| `HERMES_APP_BASE_URL` | **fehlt** | blockiert Wochenjob gegen die App |
| `NEXT_PUBLIC_SUPABASE_URL` | **fehlt** | Alias zu `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **fehlt** | Alias zu `SUPABASE_ANON_KEY` |

Nicht erwartet / nicht gesetzt: `AI_GATEWAY_API_KEY`, `FIGMA_ACCESS_TOKEN`, `LINEAR_API_KEY`, `HF_TOKEN` (MCP ist separat authentifiziert).

## Vercel (`content-agent`)

Gleiche acht Keys wie die App-Secrets, **ohne** `RAILWAY_API_TOKEN`. Target nur **production + preview**, nicht **development**. Werte nicht entschlüsselt.

Fehlt auf Vercel gegenüber `.env.example` / Railway-Beispiel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_WORKSPACE_ID`
- `RAILWAY_API_TOKEN` (nur Worker)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `HERMES_APP_BASE_URL`

Namens-Mismatch: Vercel hat `SUPABASE_URL` / `SUPABASE_ANON_KEY`; AP-01-`.env.example` nannte `NEXT_PUBLIC_SUPABASE_*`. Der aktuelle Code auf den Feature-Branches liest Supabase-Env noch nicht; Pipeline liest `process.env.ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LANGFUSE_*`.

## Railway / Hermes

Vorlage: `docs/ops/railway.env.example` auf Branch `cursor/ap10-12-scaffold-ff57`. Live-Deploy bleibt blockiert, bis Telegram-Bot und Chat-ID gesetzt sind.

## Was Sinan noch setzen muss

1. `ANTHROPIC_WORKSPACE_ID` (`wrkspc_…`) in Cloud-Agent-Secrets **und** Vercel — oder einen workspace-scoped Key.
2. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HERMES_APP_BASE_URL` für AP-10 (Railway EU).
3. Optional: `NEXT_PUBLIC_SUPABASE_URL` = `SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `SUPABASE_ANON_KEY` auf Vercel (production/preview/development). Niemals `SUPABASE_SERVICE_ROLE_KEY` als `NEXT_PUBLIC_`.
4. Optional: dieselben App-Keys auf Vercel **development**, damit `vercel env pull` lokal vollständig ist.

## Check

```bash
node scripts/check-env.mjs
```

Gibt nur `SET` / `EMPTY` / `MISSING` plus Länge aus, keine Werte.
