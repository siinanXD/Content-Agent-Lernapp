# Supabase

SQL migrations for Content-Agent-Lernapp (AP-17).

## Layout

- `migrations/` — additive SQL only (no `DROP` / `TRUNCATE` / data wipes)
- Project ref (Linear SIN-195): `zxielkiwgcgxyudqemjb` (EU)

## Apply

See [`docs/ops/SUPABASE.md`](../docs/ops/SUPABASE.md).

```bash
# Presence check (no secret values)
node scripts/check-env.mjs

# When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set: verify tables via REST
node scripts/verify-supabase-schema.mjs
```

## Storage selection

| Condition | Backend |
| --- | --- |
| `COURSE_STORAGE=mock` | in-memory `mock-store` |
| Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` | `mock-store` |
| Both secrets set | Supabase (service role, server-only) |
