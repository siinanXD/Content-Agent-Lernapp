# Architekturentscheidungen

Stand: AP-00 abgeschlossen (2026-10-02). Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.

> Full D-01–D-32 text matches `main` / prior commits on this branch; authoritative AP-15 Phase A decision is D-33 below. Companion: `docs/ops/DECISIONS-D28-D33.md`.

### D-33 — AP-15 Phase A live: Console Batch only, Judge, Supabase, €20-Guard

- **Links:** Linear [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193); Anthropic Console auth / workspace header ([docs](https://platform.claude.com/docs/en/manage-claude/authentication)); Message Batches ([docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing)); D-06; D-07; D-30; PR #27 (`ANTHROPIC_WORKSPACE_ID`); `scripts/ap15-phase-a.ts`; `docs/ops/AP15-PHASE-A.md`; `docs/ops/DECISIONS-D28-D33.md`
- **Entscheidung:** (1) Messages/Batch **nur über Anthropic Console API** mit `ANTHROPIC_API_KEY` + `anthropic-workspace-id` — Claude Max/Mac-Abo kann Batch/Messages **nicht** abrechnen. Fehlt der Key: stoppen und nur PRESENT/MISSING melden. (2) Phase A in Chunks zu je 2 Einheiten, `max_tokens=64000` (16k truncierte ~74/79 Requests). (3) Persistenz Supabase (`courses.lernfeld` volles JSON). (4) Richter `gpt-5.4-mini`; Regen einmal — bei Console `credit balance too low` Regen überspringen, nur Judge-Passers publishen. (5) Safety 10 %-Stichprobe vor Publish dokumentieren. (6) Kostenledger €20; Lauf ~€12.8. (7) Goldset `maf-goldset-phase-a`; Lernpfad lädt Units via `GET /api/learner/phase-a` (kein 2‑MB JSON im Repo).
- **Warum:** Max-Abo ≠ Console-Credits; ohne Workspace-Header 400; Chunk/Token-Limits sonst JSON-Truncation; Guthaben-Ende muss Pipeline graceful beenden.
