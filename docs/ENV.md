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
| `LANGFUSE_TRACING_ENVIRONMENT` | optional 