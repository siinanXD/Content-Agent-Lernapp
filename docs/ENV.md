# Umgebungsvariablen — Prüfung 2026-10-03

Keine Werte in diesem Dokument. Nur Namen, Orte und Status.

Quellen: `AGENTS.md`, `.env.example` (AP-01), `docs/ops/railway.env.example` (AP-10), Vercel-Projekt `content-agent`, Cloud-Agent-Secrets (`CLOUD_AGENT_INJECTED_SECRET_NAMES`). Offizielle Docs: [Langfuse Data Regions](https://langfuse.com/security/data-regions.md) (EU = Ireland, AWS `eu-west-1`; US-Host ist ein anderer Hostname); [Anthropic Authentication](https://platform.claude.com/docs/en/manage-claude/authentication) (`anthropic-workspace-id` / `ANTHROPIC_WORKSPACE_ID`); [Claude Code + Pro/Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) (Abo ≠ Console-API).

## Kurzantwort

**Supabase-URL und Anon-Key sind da** — als `SUPABASE_URL` und `SUPABASE_ANON_KEY` (plus Service-Role). Das sind die injizierten Namen.

**Anthropic Console-API ist bereit:** `ANTHROPIC_API_KEY` + `ANTHROPIC_WORKSPACE_ID` sind im Cloud-Agent gesetzt (2026-10-03). Live Messages/Batches nutzen den Key; der Workspace-Header kommt aus `ANTHROPIC_WORKSPACE_ID` (`src/lib/anthropic/headers.ts`).

**Claude Mac / Pro / Max-Abo zählt nicht für die Pipeline** — Generate/Batch sind Console-PAYG (D-33). Desktop-OAuth läuft nicht auf Cloud-VMs.

Noch offen für Ops: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HERMES_APP_BASE_URL`. `NEXT_PUBLIC_SUPABASE_*` sind **keine** fehlenden Secrets, nur optionale Next.js-Client-Aliase derselben Werte.

## Entscheidung D-25

- **Links:** Langfuse-Regionen (oben); Anthropic Workspaces (oben); Vercel Env-API (Projekt `content-agent`).
- **Entscheidung:** Cloud-Agent- und Vercel-Namen bleiben `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (so injiziert). Zusätzlich `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` als Aliase dokumentieren. `LANGFUSE_BASE_URL` bleibt der offizielle EU-Host aus den Data-Regions-Docs (Ireland). Fehlende Ops-Secrets (`TELEGRAM_*`, `HERMES_APP_BASE_URL`) nicht erfinden. `ANTHROPIC_WORKSPACE_ID` ist Pflichtname neben dem API-Key (siehe D-33).
- **Warum:** Weniger Umbenennung an bestehenden Secrets; Next.js braucht `NEXT_PUBLIC_` im Client; Workspace-Header hält Live-Calls im richtigen Console-Workspace.

## Cloud Agent (diese Umgebung)

Injizierte Secret-Namen:

| Name | Status | Live-Check (ohne Wert) |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | gesetzt | Prefix `sk-ant`; `GET /v1/models` → 200; Batches-List → 200 |
| `ANTHROPIC_WORKSPACE_ID` | gesetzt | Prefix `wrkspc_`; Header `anthropic-workspace-id` ([Docs](https://platform.claude.com/docs/en/manage-claude/authentication)) |
| `OPENAI_API_KEY` | gesetzt | Prefix `sk-`; `GET /v1/models` → 200 |
| `LANGFUSE_PUBLIC_KEY` | gesetzt | Prefix `pk-lf`; Projekt `Content AGent` auf EU-Host → 200 |
| `LANGFUSE_SECRET_KEY` | gesetzt | Prefix `sk-lf` |
| `LANGFUSE_BASE_URL` | gesetzt | offizieller EU-Host (Ireland); US-Host lehnt dieselben Keys mit 401 ab |
| `LANGFUSE_TRACING_ENVIRONMENT` | optional | SDK v5 env attribute (nicht im Code setzen) |
| `LANGFUSE_RELEASE` | optional | SDK v5 release attribute (nicht im Code setzen) |
| `SUPABASE_URL` | **gesetzt** | Host `*.supabase.co`; Auth-Health → 200 |
| `SUPABASE_ANON_KEY` | **gesetzt** | JWT-Form; Auth-Health mit Anon → 200 |
| `SUPABASE_SERVICE_ROLE_KEY` | gesetzt | JWT-Form; `/rest/v1/` → 200 |
| `RAILWAY_API_TOKEN` | gesetzt | UUID-Form; allein nicht genug für Hermes |
| `TELEGRAM_BOT_TOKEN` | **fehlt** | blockiert AP-10 Live |
| `TELEGRAM_CHAT_ID` | **fehlt** | blockiert AP-10 Live |
| `HERMES_APP_BASE_URL` | **fehlt** | blockiert Wochenjob gegen die App |
| `NEXT_PUBLIC_SUPABASE_URL` | optionaler Alias | nicht nötig, solange Server `SUPABASE_URL` liest |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optionaler Alias | nicht nötig, solange Server `SUPABASE_ANON_KEY` liest |

Optional für AP-16 Hermes-Alerts (fehlen = Kanal überspringen, Package bleibt grün): `LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_PROJECT_ID`.

Nicht erwartet: `AI_GATEWAY_API_KEY`, `FIGMA_ACCESS_TOKEN`, `HF_TOKEN` (MCP ist separat authentifiziert).

## Vercel (`content-agent`)

Gleiche acht Keys wie die App-Secrets, **ohne** `RAILWAY_API_TOKEN`. Target nur **production + preview**, nicht **development**. Werte nicht entschlüsselt.

Supabase auf Vercel: `SUPABASE_URL` und `SUPABASE_ANON_KEY` sind gesetzt (kein fehlendes Secret). `NEXT_PUBLIC_*` wäre nur ein Client-Alias.

Noch nicht auf Vercel (gegenüber Hermes-Vorlage / Cloud-Agent): `ANTHROPIC_WORKSPACE_ID` (nachziehen, damit Preview/Production denselben Workspace wie der Agent nutzen), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HERMES_APP_BASE_URL`. `RAILWAY_API_TOKEN` gehört zum Worker, nicht zur App.

## Railway / Hermes

Vorlage: `docs/ops/railway.env.example`. Live-Deploy bleibt blockiert, bis Telegram-Bot und Chat-ID gesetzt sind. AP-16 Quellen-Monitor: Live-HTTP auf Railway/GHA; Cloud-Agent nur offline/fixtures (`docs/ops/HERMES.md`).

## Was noch gesetzt werden muss

1. Vercel: `ANTHROPIC_WORKSPACE_ID` (`wrkspc_…`) an Production/Preview angleichen (Cloud-Agent hat es bereits). Console-API-Credits für AP-15 Batch budgetieren — Max-Abo deckt das nicht (D-33).
2. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HERMES_APP_BASE_URL` für AP-10 (Railway EU).
3. Optional AP-16: `LINEAR_API_KEY` + `LINEAR_TEAM_ID` (+ `LINEAR_PROJECT_ID`) für Issues „Quelle geändert: \<Map\>").
4. Nicht nötig: extra Supabase-URL/Anon-Key. `SUPABASE_URL` + `SUPABASE_ANON_KEY` sind vorhanden. `NEXT_PUBLIC_*` nur, wenn der Browser sie direkt lesen soll. Niemals `SUPABASE_SERVICE_ROLE_KEY` als `NEXT_PUBLIC_`.

## Check

```bash
node scripts/check-env.mjs
```

Gibt nur `SET` / `EMPTY` / `MISSING` plus Länge aus, keine Werte.
