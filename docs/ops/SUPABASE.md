# Supabase persistence (AP-17)

Durable storage for courses, sources (URL + Abrufdatum), plans, units, questions, evaluations, and anonymous learning progress.

## Secrets (server-only)

| Name | Role |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Publishable/anon (browser-safe; RLS denies by default) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — pipeline API routes; bypasses RLS |

Never set `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_*`. Optional browser aliases: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as URL/anon).

## Migrations

File: `supabase/migrations/20261003030000_ap17_course_persistence.sql`

Additive only (`CREATE TABLE IF NOT EXISTS`, indexes, RLS). No deletions.

### Apply (when keys available)

1. Supabase Dashboard → SQL → paste migration → Run, **or**
2. Local CLI: `npx supabase db push` against the linked project.

Then verify:

```bash
node scripts/verify-supabase-schema.mjs
```

Expected: all seven tables report `ok`.

### This agent run (2026-10-03)

Injected secrets in the Cloud Agent process were only `RAILWAY_API_TOKEN`. Supabase keys were **absent**, so tables were not applied live here. Ship migrations + code path; apply when keys are in the environment.

## App behavior

`package-lock.json` is committed; `npm ci` needs no extra step.

- `getStorage()` → Supabase when URL + service role are set; otherwise `mock-store` (tests / no secrets).
- Override: `COURSE_STORAGE=mock`.
- Course data survives process restart only on the Supabase path.

## RLS

RLS enabled on all AP-17 tables with no anon/authenticated policies (deny). Pipeline writes use the service-role client on the server.
